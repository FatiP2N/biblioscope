/**
 * Biblioscope — proxy gratuit (Cloudflare Workers, offre Free).
 *
 * Rôle : garder les clés secrètes hors de la page publique et agréger les données brevets.
 *
 * Secrets / variables à définir dans Cloudflare (Settings > Variables and Secrets) :
 *   EPO_KEY, EPO_SECRET   Clés OEB Open Patent Services (gratuit : developers.epo.org)
 *   LENS_TOKEN            (facultatif) Jeton API Lens.org, usage non commercial sur demande
 *   OPENALEX_KEY          (facultatif) Clé OpenAlex gratuite, pour la route /openalex/*
 *   ALLOWED_ORIGIN        ex. https://votre-pseudo.github.io  (par défaut : *)
 *
 * Routes :
 *   GET /health
 *   GET /test-epo      vérifie les clés OEB et la syntaxe des requêtes (3 recherches de contrôle)
 *   GET /patents?q=texte&from=2010&to=2026[&cls=H10K,Y02E10/549&clsType=cpc|ipc][&juris=MA,FR][&applicant=nom]
 *                [&countries=CA,FR][&detail=1][&source=epo|lens][&part=years|offices&offices=CN,US,...&max=10]
 *       juris     : offices de publication (OEB et Lens)
 *       applicant : nom du déposant (OEB et Lens)
 *       part      : OEB : years (par année), offices (par office), total (une seule valeur), sample (notices des
 *                   100 premiers documents) ; chaque appel interroge au plus `max` requêtes
 *                   nouvelles (limite de l'OEB d'environ 30 recherches/minute) et renvoie `pending` pour le reste.
 *       cls       : codes de classification CPC ou CIB (préfixes, combinés en OU)
 *       countries : pays de résidence du déposant (Lens uniquement)
 *       detail=1  : ajoute pays des déposants, codes, statut juridique et brevets les plus cités (Lens)
 *   GET /openalex/<chemin>?<paramètres>   (relais vers api.openalex.org avec la clé)
 */

const OFFICES = ["EP", "WO", "US", "CN", "JP", "KR", "DE", "FR", "GB", "CA", "AU", "IN", "BR", "RU", "ES", "MX"];
let epoToken = null, epoTokenExp = 0;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "GET") return json({ error: "Méthode non autorisée." }, cors, 405);

    if (url.pathname === "/test-epo") {
      if (!(env.EPO_KEY && env.EPO_SECRET)) return json({ ok: false, error: "Secrets EPO_KEY et EPO_SECRET absents du Worker." }, cors, 503);
      const out = { ok: true, auth: null, tests: [] };
      let token;
      try { epoToken = null; token = await epoAuth(env); out.auth = "OK : clés acceptées par l'OEB"; }
      catch (e) { return json({ ok: false, auth: e.message }, cors, 502); }
      const queries = [
        ['ta all "perovskite solar" and pd=2024', "recherche par mots-clés + année"],
        ['ta all "perovskite solar" and cpc=/low H10K', "filtre CPC (avec sous-codes)"],
        ['ta all "perovskite solar" and pd within "2020 2024" and pn=EP', "période + office de publication"],
        ['pd=2025', "tous les brevets publiés en 2025 (sans mot-clé)"],
        ['pd=2025 and pn=MA', "tous les brevets publiés en 2025 au Maroc"],
        ['pa all "univ mohammed" and pd=2025', "filtre déposant (nom)"],
        ['ta all "solar" and pd=2025 and (pn=MA or pn=TN)', "plusieurs juridictions"]
      ];
      for (const [q, what] of queries) {
        try { const r = await epoCount(q, token); out.tests.push({ test: what, requete: q, resultats: r.n }); out.throttle = r.throttle; }
        catch (e) { out.ok = false; out.tests.push({ test: what, requete: q, erreur: e.message }); }
      }
      try {
        const r = await fetch("https://ops.epo.org/3.2/rest-services/published-data/search/biblio?Range=1-5&q=" + encodeURIComponent('ta all "desalination" and pd=2024'),
          { headers: { "Authorization": "Bearer " + token, "Accept": "application/json" } });
        if (!r.ok) throw new Error("OEB a répondu " + r.status);
        const s = parseBiblio(await r.json());
        const f = s.records[0] || {};
        out.tests.push({ test: "notices bibliographiques (échantillon de 5)", documents: s.documents, familles: s.records.length,
          premier: { numero: f.k, titre: (f.t || "").slice(0, 80), deposants: f.ap, pays_deposants: f.apc, cib: (f.ipc || []).slice(0, 3), cpc: (f.cpc || []).slice(0, 3), priorites: f.pr } });
      } catch (e) { out.ok = false; out.tests.push({ test: "notices bibliographiques", erreur: e.message }); }
      return json(out, cors);
    }

    if (url.pathname === "/health") {
      return json({ ok: true, epo: !!(env.EPO_KEY && env.EPO_SECRET), lens: !!env.LENS_TOKEN, openalex: !!env.OPENALEX_KEY }, cors);
    }

    // Cache Cloudflare (gratuit) : évite de consommer les quotas pour des requêtes identiques.
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: "GET" });
    const hit = await cache.match(cacheKey);
    if (hit) {
      const h = new Headers(hit.headers); Object.entries(cors).forEach(([k, v]) => h.set(k, v)); h.set("X-Cache", "HIT");
      return new Response(hit.body, { status: hit.status, headers: h });
    }

    let resp;
    try {
      if (url.pathname.startsWith("/openalex/")) resp = await openalex(url, env, cors);
      else if (url.pathname === "/patents") resp = await patents(url, env, cors, ctx);
      else return json({ error: "Route inconnue." }, cors, 404);
    } catch (e) {
      return json({ error: e.message || String(e) }, cors, 502);
    }
    if (resp.ok && !/no-store/.test(resp.headers.get("Cache-Control") || "")) ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
  }
};

function json(obj, headers, status = 200, maxAge = 0) {
  const h = { "Content-Type": "application/json; charset=utf-8", ...headers };
  if (maxAge) h["Cache-Control"] = "public, max-age=" + maxAge;
  return new Response(JSON.stringify(obj), { status, headers: h });
}

/* ---------------- OpenAlex (relais) ---------------- */
async function openalex(url, env, cors) {
  const path = url.pathname.replace(/^\/openalex/, "");
  if (!/^\/(works|authors|sources|institutions|topics|funders|publishers|rate-limit)(\/|$)/.test(path)) {
    return json({ error: "Chemin OpenAlex non autorisé." }, cors, 400);
  }
  const target = new URL("https://api.openalex.org" + path);
  url.searchParams.forEach((v, k) => { if (k !== "api_key") target.searchParams.set(k, v); });
  if (env.OPENALEX_KEY) target.searchParams.set("api_key", env.OPENALEX_KEY);
  const r = await fetch(target.toString(), { headers: { "User-Agent": "Biblioscope (Cloudflare Worker)" } });
  const body = await r.text();
  const maxAge = path.startsWith("/rate-limit") ? 0 : 3600; // le budget restant ne doit pas être mis en cache
  return new Response(body, { status: r.status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": r.ok && maxAge ? "public, max-age=" + maxAge : "no-store", ...cors } });
}

/* ---------------- Brevets ---------------- */
// Offices interrogés pour la carte mondiale quand aucune juridiction n'est choisie.
// Offices de brevets couverts par la base DOCDB de l'OEB, du plus au moins actif (la carte se remplit dans cet ordre).
const WORLD_OFFICES = ["CN","US","JP","KR","WO","EP","DE","TW","IN","CA","AU","BR","RU","GB","FR","ES","MX","AT","IT","CH",
  "NL","SE","DK","FI","NO","PL","PT","BE","HK","SG","IL","ZA","TR","UA","CZ","HU","RO","GR","IE","NZ","MY","PH","TH","VN",
  "ID","AR","CL","CO","PE","EC","UY","CR","CU","DO","GT","HN","NI","PA","SV","MA","TN","DZ","EG","SA","JO","GC","KE","ZM","ZW",
  "MW","AP","OA","EA","KZ","UZ","KG","TJ","GE","AM","BY","MD","RS","HR","SI","SK","BG","LT","LV","EE","BA","ME","MK","AL",
  "CY","MT","LU","MC","SM","IS","MN"];

function patentParams(url) {
  const clean = s => (s || "").replace(/["\\()=]/g, " ").replace(/\s+/g, " ").trim();
  const list = (k, re, max) => (url.searchParams.get(k) || "").split(",").map(c => c.trim().toUpperCase()).filter(c => re.test(c)).slice(0, max);
  const now = new Date().getUTCFullYear();
  const to = clampInt(url.searchParams.get("to"), 1900, now, now);
  let from = clampInt(url.searchParams.get("from"), 1900, to, to - 15);
  if (to - from > 40) from = to - 40;
  return {
    q: clean(url.searchParams.get("q")).slice(0, 200),
    applicant: clean(url.searchParams.get("applicant")).slice(0, 120),
    clsType: url.searchParams.get("clsType") === "ipc" ? "ipc" : "cpc",
    codes: (url.searchParams.get("cls") || "").split(",").map(c => c.toUpperCase().replace(/\s+/g, ""))
      .filter(c => /^[A-HY](\d{1,2}([A-Z](\d{1,4}(\/\d{1,6})?)?)?)?$/.test(c)).slice(0, 10),
    juris: list("juris", /^[A-Z]{2}$/, 20),
    countries: list("countries", /^[A-Z]{2}$/, 10),     // pays du déposant (Lens uniquement)
    part: url.searchParams.get("part") || "",
    offices: list("offices", /^[A-Z]{2}$/, 15),
    max: clampInt(url.searchParams.get("max"), 0, 12, 10),
    from, to, detail: url.searchParams.get("detail") === "1"
  };
}

async function patents(url, env, cors, ctx) {
  const p = patentParams(url);
  const want = url.searchParams.get("source");
  if (env.LENS_TOKEN && want !== "epo") {
    if (!p.q && !p.codes.length && !p.countries.length && !p.juris.length && !p.applicant) return json({ error: "Précisez un critère de recherche." }, cors, 400);
    return json(await lensStats(p, env), cors, 200, 21600);
  }
  if (env.EPO_KEY && env.EPO_SECRET) {
    const data = await epoStats(p, env, ctx);
    // Réponse complète : mise en cache 6 h ; réponse partielle : jamais en cache.
    return json(data, data.pending.length ? { ...cors, "Cache-Control": "no-store" } : cors, 200, data.pending.length ? 0 : 21600);
  }
  return json({ error: "Aucune clé brevets configurée sur le proxy (EPO_KEY/EPO_SECRET ou LENS_TOKEN)." }, cors, 503);
}

function clampInt(v, min, max, d) {
  const n = parseInt(v, 10);
  return isNaN(n) ? d : Math.min(Math.max(n, min), max);
}

/* --- OEB Open Patent Services (Espacenet) --- */
async function epoAuth(env) {
  if (epoToken && Date.now() < epoTokenExp - 60000) return epoToken;
  const r = await fetch("https://ops.epo.org/3.2/auth/accesstoken", {
    method: "POST",
    headers: { "Authorization": "Basic " + btoa(env.EPO_KEY + ":" + env.EPO_SECRET), "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials"
  });
  if (!r.ok) throw new Error("Authentification OEB refusée (" + r.status + "). Vérifiez EPO_KEY et EPO_SECRET.");
  const j = await r.json();
  epoToken = j.access_token;
  epoTokenExp = Date.now() + (parseInt(j.expires_in, 10) || 1200) * 1000;
  return epoToken;
}

class Throttled extends Error { constructor(msg, retry) { super(msg); this.retry = retry; } }

async function epoCount(cql, token) {
  const u = "https://ops.epo.org/3.2/rest-services/published-data/search?Range=1-1&q=" + encodeURIComponent(cql);
  const r = await fetch(u, { headers: { "Authorization": "Bearer " + token, "Accept": "application/json" } });
  if (r.status === 404) return { n: 0, throttle: r.headers.get("X-Throttling-Control") }; // aucun résultat
  if (r.status === 403 || r.status === 429) {
    const reason = r.headers.get("X-Rejection-Reason") || "";
    const ra = parseInt(r.headers.get("Retry-After"), 10);
    if (/quota/i.test(reason) && ra > 3600) throw new Error("Quota OEB de la semaine atteint. Réessayez après le prochain lundi.");
    throw new Throttled("Limite de requêtes OEB atteinte, reprise automatique.", isNaN(ra) ? 20 : Math.min(Math.max(ra, 5), 60));
  }
  if (!r.ok) {
    const detail = (await r.text().catch(() => "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
    throw new Error("OEB a répondu " + r.status + " pour : " + cql + (detail ? " — " + detail : ""));
  }
  const j = await r.json();
  const n = j?.["ops:world-patent-data"]?.["ops:biblio-search"]?.["@total-result-count"];
  return { n: Number(n) || 0, throttle: r.headers.get("X-Throttling-Control") };
}

/* Chaque comptage est gardé en cache : 7 jours pour les années closes, 12 h pour l'année en cours. */
const countCacheKey = cql => new Request("https://epo-count.cache/" + encodeURIComponent(cql));
async function cachedCounts(tasks, maxFetch, env, ctx) {
  const cache = caches.default, nowY = new Date().getUTCFullYear();
  const out = [], todo = [];
  for (const t of tasks) {
    const hit = await cache.match(countCacheKey(t.cql));
    if (hit) out.push({ ...t, n: Number(await hit.text()) });
    else todo.push(t);
  }
  let fetched = 0, retry = 0, throttle = null, token = null;
  const pending = [];
  for (const t of todo) {
    if (fetched >= maxFetch || retry) { pending.push(t); continue; }
    try {
      token = token || await epoAuth(env);
      const r = await epoCount(t.cql, token);
      fetched++; throttle = r.throttle || throttle;
      out.push({ ...t, n: r.n });
      const ttl = t.maxYear && t.maxYear < nowY ? 604800 : 43200;
      ctx.waitUntil(cache.put(countCacheKey(t.cql), new Response(String(r.n), { headers: { "Cache-Control": "public, max-age=" + ttl } })));
    } catch (e) {
      if (e instanceof Throttled) { retry = e.retry; pending.push(t); }
      else out.push({ ...t, n: null, err: e.message });
    }
  }
  return { out, pending, fetched, retry, throttle };
}

/* Échantillon : notices bibliographiques des 100 premiers documents (une seule recherche OPS).
   Sert aux déposants, pays des déposants, classifications CIB/CPC et réseaux. */
const arr = x => x == null ? [] : Array.isArray(x) ? x : [x];
const txt = x => x == null ? "" : typeof x === "object" ? String(x.$ ?? "") : String(x);
function splitParty(s) { const m = /^(.*?)\s*\[([A-Z]{2})\]\s*$/.exec(s); return m ? [m[1].trim(), m[2]] : [s.trim(), ""]; }
function parseBiblio(j) {
  const sr = j?.["ops:world-patent-data"]?.["ops:biblio-search"]?.["ops:search-result"];
  const docs = arr(sr?.["exchange-documents"]).flatMap(e => arr(e?.["exchange-document"] ?? e));
  const seen = new Set(), out = [];
  docs.forEach((d, i) => {
    const b = d["bibliographic-data"] || {};
    const fam = String(d["@family-id"] || "");
    if (fam && seen.has(fam)) return;                // une notice par famille
    if (fam) seen.add(fam);
    const ids = arr(b["publication-reference"]?.["document-id"]);
    const dd = ids.find(x => x["@document-id-type"] === "docdb") || ids[0] || {};
    const date = txt(dd.date);
    const titles = arr(b["invention-title"]);
    const title = txt(titles.find(x => x["@lang"] === "en") || titles[0]);
    const people = (list, key) => {
      const all = arr(list), epo = all.filter(x => x["@data-format"] === "epodoc");
      return (epo.length ? epo : all).map(x => splitParty(txt(x?.[key]?.name))).filter(x => x[0]);
    };
    const ap = people(b.parties?.applicants?.applicant, "applicant-name");
    const inv = people(b.parties?.inventors?.inventor, "inventor-name");
    // Texte CIB de l'OEB, ex. « C02F   1/22        20060101AFI… » ou « B01F  27/ 921 … » : on recompose « C02F1/22 ».
    const ipc = arr(b["classifications-ipcr"]?.["classification-ipcr"]).map(c => {
      const m = /([A-H]\d{2}[A-Z])\s*(\d{1,4})\s*\/\s*(\d{1,6})?/.exec(txt(c.text));
      return m ? `${m[1]}${m[2]}/${m[3] || "00"}` : "";   // sans sous-groupe : niveau du groupe principal
    }).filter(Boolean);
    const cpc = arr(b["patent-classifications"]?.["patent-classification"])
      .filter(c => /CPC/i.test(c?.["classification-scheme"]?.["@scheme"] || "CPC"))
      .map(c => `${txt(c.section)}${txt(c.class)}${txt(c.subclass)}${txt(c["main-group"])}/${txt(c.subgroup)}`).filter(s => s.length > 4);
    const pr = arr(b["priority-claims"]?.["priority-claim"]).map(pc => {
      const pids = arr(pc["document-id"]);
      const x = pids.find(v => v["@document-id-type"] === "docdb");
      return x ? txt(x.country) : txt(pids[0]?.["doc-number"]).slice(0, 2);
    }).filter(c => /^[A-Z]{2}$/.test(c));
    const country = String(d["@country"] || txt(dd.country));
    out.push({ j: country, y: parseInt(date.slice(0, 4), 10) || null, d: date.length === 8 ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}` : date,
      k: `${country}${d["@doc-number"] || txt(dd["doc-number"])}${d["@kind"] || txt(dd.kind)}`, t: title, a: "",
      ap: [...new Set(ap.map(x => x[0]))], apc: [...new Set(ap.map(x => x[1]).filter(Boolean))], in: [...new Set(inv.map(x => x[0]))],
      cpc: [...new Set(cpc)], ipc: [...new Set(ipc)], ls: "", dt: "", cb: 0, fs: 0, fj: [country], pr: [...new Set(pr)], fam, rank: i + 1 });
  });
  return { total: Number(j?.["ops:world-patent-data"]?.["ops:biblio-search"]?.["@total-result-count"]) || 0, records: out, documents: docs.length };
}
async function epoSample(p, cql, env, ctx, from, to) {
  const cache = caches.default, key = new Request("https://epo-sample.cache/" + encodeURIComponent(cql));
  const base = { source: "epo", part: "sample", range: [from, to], pending: [], retryAfter: 0, fetched: 0, warnings: [] };
  const hit = await cache.match(key);
  if (hit) return { ...base, ...(await hit.json()) };
  if (p.max < 1) return { ...base, pending: ["sample"] };
  const token = await epoAuth(env);
  const u = "https://ops.epo.org/3.2/rest-services/published-data/search/biblio?Range=1-100&q=" + encodeURIComponent(cql);
  const r = await fetch(u, { headers: { "Authorization": "Bearer " + token, "Accept": "application/json" } });
  const throttle = r.headers.get("X-Throttling-Control");
  if (r.status === 404) return { ...base, fetched: 1, throttle, sample: { total: 0, records: [], documents: 0 } };
  if (r.status === 403 || r.status === 429) {
    const ra = parseInt(r.headers.get("Retry-After"), 10);
    return { ...base, pending: ["sample"], retryAfter: isNaN(ra) ? 20 : Math.min(Math.max(ra, 5), 60), throttle };
  }
  if (!r.ok) return { ...base, fetched: 1, throttle, warnings: ["Échantillon OEB indisponible (" + r.status + ")."] };
  const sample = parseBiblio(await r.json());
  ctx.waitUntil(cache.put(key, new Response(JSON.stringify({ sample }), { headers: { "Cache-Control": "public, max-age=43200" } })));
  return { ...base, fetched: 1, throttle, sample };
}

function epoBase(p) {
  const parts = [];
  if (p.q) parts.push(`ta all "${p.q}"`);
  if (p.applicant) parts.push(`pa all "${p.applicant}"`);
  if (p.codes.length) {
    const idx = p.clsType === "ipc" ? "ic" : "cpc";
    parts.push("(" + p.codes.map(c => `${idx}=/low ${c}`).join(" or ") + ")"); // "/low" : codes inférieurs inclus
  }
  return parts;
}

async function epoStats(p, env, ctx) {
  // La période choisie est toujours respectée (20 ans au maximum pour les comptages par année).
  const part = p.part || "years";
  const from = part === "total" ? p.from : Math.max(p.from, p.to - 19), to = p.to;
  const parts = epoBase(p);
  const juris = p.juris.length ? "(" + p.juris.map(c => `pn=${c}`).join(" or ") + ")" : "";
  const period = from === to ? `pd=${from}` : `pd within "${from} ${to}"`;
  const tasks = [];
  if (part === "sample") return epoSample(p, [...parts, juris, period].filter(Boolean).join(" and "), env, ctx, from, to);
  if (part === "total") {
    const pre = [...parts, juris].filter(Boolean).join(" and ");
    tasks.push({ kind: "total", key: "total", maxYear: to, cql: (pre ? pre + " and " : "") + period });
  } else if (part === "years") {
    const pre = [...parts, juris].filter(Boolean).join(" and ");
    for (let y = from; y <= to; y++) tasks.push({ kind: "year", key: y, maxYear: y, cql: (pre ? pre + " and " : "") + `pd=${y}` });
  } else {
    const pre = parts.join(" and ");
    const offices = p.offices.length ? p.offices : (p.juris.length ? p.juris : WORLD_OFFICES.slice(0, 15));
    for (const cc of offices) tasks.push({ kind: "office", key: cc, maxYear: to, cql: (pre ? pre + " and " : "") + `${period} and pn=${cc}` });
  }
  const r = await cachedCounts(tasks, p.max, env, ctx);
  const byYear = r.out.filter(t => t.kind === "year").map(t => [t.key, t.n]).sort((a, b) => a[0] - b[0]);
  const totalTask = r.out.find(t => t.kind === "total");
  const byOffice = r.out.filter(t => t.kind === "office").map(t => [t.key, t.n]);
  const warnings = r.out.filter(t => t.err).map(t => t.err).slice(0, 3);
  if (from > p.from) warnings.unshift(`OEB : période limitée à ${from}–${to}.`);
  if (p.countries.length) warnings.push("Pays du déposant non disponible avec l'OEB (utilisez le filtre juridiction ou le nom du déposant).");
  return {
    source: "epo", unit: "publications (OEB)", part, range: [from, to], total: totalTask ? totalTask.n : undefined,
    byYear, byOffice, pending: r.pending.map(t => t.key), retryAfter: r.retry, fetched: r.fetched, throttle: r.throttle,
    worldOffices: WORLD_OFFICES,
    byApplicantCountry: null, topApplicants: [], topCodes: null, legal: null, top: null,
    warnings, updated: new Date().toISOString()
  };
}

/* --- Lens.org (agrégations natives) --- */
const lensTitle = arr => {
  if (!Array.isArray(arr)) return typeof arr === "string" ? arr : "";
  const t = arr.find(x => x.lang === "fr") || arr.find(x => x.lang === "en") || arr[0];
  return t ? (t.text || "") : "";
};
async function lensCall(body, env) {
  const r = await fetch("https://api.lens.org/patent/search", {
    method: "POST",
    headers: { "Authorization": "Bearer " + env.LENS_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (r.status === 401 || r.status === 403) throw new Error("Jeton Lens refusé ou expiré.");
  if (r.status === 429) throw new Error("Quota Lens atteint.");
  if (!r.ok) { const e = new Error("Lens a répondu " + r.status + "."); e.status = r.status; e.detail = (await r.text()).slice(0, 300); throw e; }
  return r.json();
}
async function lensStats(p, env) {
  const clsField = p.clsType === "ipc" ? "class_ipcr.symbol" : "class_cpc.symbol";
  const must = [{ range: { year_published: { gte: p.from, lte: p.to } } }];
  if (p.q) must.push({ query_string: { query: p.q, fields: ["title", "abstract", "claim"], default_operator: "and" } });
  if (p.codes.length) must.push({ query_string: { query: p.codes.map(c => `${clsField}:${c.replace(/\//g, "\\/")}*`).join(" OR ") } });
  if (p.countries.length) must.push({ terms: { "applicant.residence": p.countries } });
  if (p.juris.length) must.push({ terms: { "jurisdiction": p.juris } });
  if (p.applicant) must.push({ match: { "applicant.name": { query: p.applicant, operator: "and" } } });

  const aggs = {
    years: { terms: { field: "year_published", size: 60 } },
    jurisdictions: { terms: { field: "jurisdiction", size: 40 } },
    applicants: { terms: { field: "applicant.name.exact", size: 20 } }
  };
  if (p.detail) {
    aggs.residence = { terms: { field: "applicant.residence", size: 80 } };
    aggs.codes = { terms: { field: clsField, size: 150 } };
    aggs.status = { terms: { field: "legal_status.patent_status", size: 12 } };
  }
  const body = { query: { bool: { must } }, size: p.detail ? 25 : 1, aggregations: aggs,
    include: ["lens_id", "jurisdiction", "doc_number", "kind", "date_published", "biblio.invention_title", "biblio.parties.applicants", "biblio.cited_by"] };
  if (p.detail) body.sort = [{ "cited_by.patent_count": "desc" }];

  let j, warnings = [];
  try { j = await lensCall(body, env); }
  catch (e) {
    if (e.status !== 400 || !p.detail) throw e;
    // Champ refusé (tri ou agrégat facultatif) : on réessaie sans eux.
    delete body.sort; delete aggs.status;
    warnings.push("Tri par citations ou statut juridique indisponible avec ce jeton.");
    j = await lensCall(body, env);
  }
  const b = name => (j.aggregations?.[name]?.buckets || []).map(x => [x.key, x.doc_count]);
  const years = new Map(b("years").map(([k, v]) => [Number(k), v]));
  const byYear = [];
  for (let y = p.from; y <= p.to; y++) byYear.push([y, years.get(y) || 0]);
  const top = p.detail ? (j.data || []).map(h => ({
    title: lensTitle(h.biblio?.invention_title),
    number: `${h.jurisdiction || ""}${h.doc_number || ""}${h.kind ? " " + h.kind : ""}`,
    date: h.date_published || "",
    applicants: (h.biblio?.parties?.applicants || []).slice(0, 2).map(a => a.extracted_name?.value).filter(Boolean),
    cites: h.biblio?.cited_by?.patent_count ?? null,
    url: h.lens_id ? "https://www.lens.org/lens/patent/" + h.lens_id : null
  })) : null;
  return {
    source: "lens",
    unit: "documents brevets (Lens.org)",
    total: j.total ?? byYear.reduce((a, d) => a + d[1], 0),
    byYear,
    byOffice: b("jurisdictions"),
    byApplicantCountry: p.detail ? b("residence") : null,
    topApplicants: b("applicants"),
    topCodes: p.detail ? b("codes") : null,
    legal: p.detail && aggs.status ? b("status") : null,
    top,
    warnings,
    updated: new Date().toISOString()
  };
}
