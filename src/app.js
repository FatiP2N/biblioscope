/* ===== Configuration du site publié / Published site configuration =====
   Renseignez ici l'URL de votre Worker pour que tous les visiteurs en profitent. */
const SITE_CONFIG = {
  workerUrl: "https://biblioscope.fatima-belmehdi.workers.dev", openAlexViaWorker: true, defaultLang: "fr",
  about: { name: "", contact: "" }   // affichés en bas de la page « À propos » s'ils sont renseignés
};

(() => {
"use strict";
const $ = id => document.getElementById(id);
const CUR_YEAR = new Date().getFullYear();
$("y2").value = CUR_YEAR; $("py2").value = CUR_YEAR;

/* ---------- stockage local ---------- */
const store = {
  get(k, d = "") { try { const v = localStorage.getItem("bs_" + k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("bs_" + k, v); } catch {} }
};
const cfg = {
  get key() { return store.get("oaKey"); },
  get worker() { return (store.get("worker") || SITE_CONFIG.workerUrl || "").replace(/\/+$/, ""); },
  get viaWorker() { return store.get("viaWorker", SITE_CONFIG.openAlexViaWorker ? "1" : "0") === "1"; }
};

/* ---------- langue ---------- */
let LANG = (() => {
  const s = store.get("lang", "");
  if (s === "fr" || s === "en") return s;
  return SITE_CONFIG.defaultLang || ((navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en");
})();
function t(key, vars) {
  let s = (I18N[LANG] && I18N[LANG][key]) ?? I18N.fr[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? "");
  return s;
}
const LOC = () => LANG === "fr" ? "fr-FR" : "en-GB";
let nf = new Intl.NumberFormat(LOC());
const fmt = n => n == null || isNaN(n) ? "—" : nf.format(Math.round(n));
const fmt1 = n => n == null || isNaN(n) ? "—" : Number(n).toLocaleString(LOC(), { maximumFractionDigits: 1 });
const fmtY = n => n == null || isNaN(n) ? "—" : Number(n).toLocaleString(LOC(), { maximumFractionDigits: 1, useGrouping: false });
const pct = x => x == null || isNaN(x) ? "—" : new Intl.NumberFormat(LOC(), { style: "percent", maximumFractionDigits: 1 }).format(x);
const ordinal = n => {
  if (LANG === "fr") return `${n}<sup>${n === 1 ? "er" : "e"}</sup>`;
  const s = (n % 100 >= 11 && n % 100 <= 13) ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
  return `${n}<sup>${s}</sup>`;
};
const now = () => new Date().toLocaleString(LOC(), { dateStyle: "short", timeStyle: "medium" });
const esc = s => String(s ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z' &-]/g, " ").replace(/\s+/g, " ").trim();
function applyStatic() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  document.querySelectorAll(".lang button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === LANG)));
  if (typeof drawCustomTabs === "function") try { drawCustomTabs(); } catch {}
}

/* ---------- pays ---------- */
const ISO = "AF AL DZ AS AD AO AI AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BA BW BR BN BG BF BI CV KH CM CA KY CF TD CL CN CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF GA GM GE DE GH GI GR GL GD GP GU GT GN GW GY HT VA HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KP KR XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU MK MP NO OM PK PW PS PA PG PY PE PH PL PT PR QA RE RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VE VN YE ZM ZW".split(" ");
const dn = l => { try { return new Intl.DisplayNames([l], { type: "region" }); } catch { return null; } };
const DN = { fr: dn("fr"), en: dn("en") };
const regionIn = (l, c) => { try { return DN[l] ? DN[l].of(c) : c; } catch { return c; } };
const cname = c => regionIn(LANG, c);
const enName = c => regionIn("en", c);
const unify = c => c === "EH" ? "MA" : c;
const expand = codes => codes.includes("MA") && !codes.includes("EH") ? [...codes, "EH"] : codes;
function mergeCounts(list) {
  const m = new Map();
  for (const [c, n] of list) { const k = unify(c); m.set(k, (m.get(k) || 0) + n); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
const GEO_OVERRIDES = { KR:"Korea", KP:"Dem. Rep. Korea", CZ:"Czech Rep.", CD:"Dem. Rep. Congo", CG:"Congo", CI:"Côte d'Ivoire",
  BA:"Bosnia and Herz.", CF:"Central African Rep.", SS:"S. Sudan", DO:"Dominican Rep.", GQ:"Eq. Guinea", LA:"Lao PDR",
  MK:"Macedonia", SZ:"Swaziland", MM:"Myanmar", TT:"Trinidad and Tobago", PS:"Palestine", SB:"Solomon Is.",
  FK:"Falkland Is.", TR:"Turkey", US:"United States", RU:"Russia", VN:"Vietnam", BN:"Brunei", SY:"Syria", IR:"Iran",
  BO:"Bolivia", VE:"Venezuela", TZ:"Tanzania", MD:"Moldova", TL:"Timor-Leste", GB:"United Kingdom", MA:"Morocco", EH:"Morocco" };
const geoName = c => GEO_OVERRIDES[c] || enName(c);
const GEO2ISO = {}; ISO.forEach(c => { GEO2ISO[geoName(c)] = c; });
const NAME2ISO = {};
ISO.forEach(c => { NAME2ISO[norm(regionIn("fr", c))] = c; NAME2ISO[norm(regionIn("en", c))] = c; });
Object.assign(NAME2ISO, {
  "usa":"US","u s a":"US","united states of america":"US","peoples r china":"CN","people's republic of china":"CN","pr china":"CN","p r china":"CN",
  "england":"GB","scotland":"GB","wales":"GB","north ireland":"GB","northern ireland":"GB","uk":"GB","great britain":"GB",
  "south korea":"KR","republic of korea":"KR","korea":"KR","korea republic":"KR","russian federation":"RU","russia":"RU",
  "iran":"IR","islamic republic of iran":"IR","viet nam":"VN","vietnam":"VN","turkey":"TR","turkiye":"TR","czech republic":"CZ",
  "u arab emirates":"AE","united arab emirates":"AE","cote d'ivoire":"CI","ivory coast":"CI","cote ivoire":"CI","macedonia":"MK","north macedonia":"MK",
  "bosnia & herceg":"BA","bosnia and herzegovina":"BA","trinidad tobago":"TT","brunei darussalam":"BN","syrian arab republic":"SY",
  "taiwan":"TW","hong kong":"HK","macau":"MO","macao":"MO","western sahara":"MA","sahara occidental":"MA","morocco":"MA","maroc":"MA",
  "palestine":"PS","state of palestine":"PS","dem rep congo":"CD","democratic republic of the congo":"CD","rep congo":"CG","laos":"LA",
  "tanzania":"TZ","bolivia":"BO","venezuela":"VE","moldova":"MD","kosovo":"XK","papua n guinea":"PG","eswatini":"SZ","swaziland":"SZ",
  "myanmar":"MM","burma":"MM","cape verde":"CV","st kitts & nevi":"KN","st lucia":"LC","st vincent":"VC","sao tome & prin":"ST",
  "cent afr republ":"CF","antigua & barbu":"AG","dominican rep":"DO","falkland island":"FK","equat guinea":"GQ","turks & caicos":"TC","br virgin isl":"VG"
});
function matchCountry(raw) {
  const x = norm(String(raw).replace(/\.$/, ""));
  if (NAME2ISO[x]) return NAME2ISO[x];
  const w = x.split(" ");
  for (let k = Math.min(4, w.length); k >= 1; k--) { const tail = w.slice(-k).join(" "); if (tail.length > 2 && NAME2ISO[tail]) return NAME2ISO[tail]; }
  return null;
}
function resolveCountryInput(v) {
  const s = String(v || "").trim(); if (!s) return null;
  if (/^[A-Za-z]{2}$/.test(s) && ISO.includes(s.toUpperCase())) return s.toUpperCase();
  return matchCountry(s);
}
function fillDatalists() {
  $("countryList").innerHTML = ISO.map(c => [c, cname(c)]).sort((a, b) => a[1].localeCompare(b[1], LANG)).map(([, n]) => `<option value="${esc(n)}"></option>`).join("");
  $("officeList").innerHTML = ["EP", "WO", "EA", "AP", "OA", "GC"].map(c => `<option value="${esc(t("off." + c))}"></option>`).join("") + $("countryList").innerHTML;
  $("clsList").innerHTML = CLS.map(r => `<option value="${esc(r[0])}" label="${esc(LANG === "fr" ? r[1] : r[2])}"></option>`).join("");
}

/* ---------- couleurs ---------- */
const tok = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const T = () => ({ ink: tok("--ink"), muted: tok("--muted"), line: tok("--line"), surface: tok("--surface"), paper: tok("--paper"),
  accent: tok("--accent"), accent2: tok("--accent-2"), soft: tok("--accent-soft"), ochre: tok("--ochre"), ochreSoft: tok("--ochre-soft"),
  good: tok("--good"), mono: "IBM Plex Mono, ui-monospace, monospace", body: "IBM Plex Sans, system-ui, sans-serif" });

/* ---------- état ---------- */
let DATA = null, PAT = null, MODE = "live", VIEW = "world", timer = null, inflight = 0, LAST_ROWS = [], SELECTED = [];
const charts = {};
function chart(id) {
  if (!window.echarts) return null;
  if (!charts[id]) { $(id).innerHTML = ""; charts[id] = echarts.init($(id), null, { renderer: "canvas" }); }
  return charts[id];
}
function noChart(id, msg) {
  if (charts[id]) { charts[id].dispose(); delete charts[id]; }
  $(id).innerHTML = `<div class="na">${esc(msg)}</div>`;
}
window.addEventListener("resize", () => Object.values(charts).forEach(c => c.resize()));
function setStatus(kind, txt) { $("dot").className = "dot " + kind; $("stateTxt").textContent = txt; }
/* Chargement : barre fine sous l'en-tête (-1 = indéterminée, 0..1 = avancement, null = masquée) et repère par panneau */
function setProgress(v) {
  const p = $("progress"); if (!p) return;
  if (v == null) { p.hidden = true; return; }
  p.hidden = false; p.classList.toggle("indet", v < 0);
  p.firstElementChild.style.width = v < 0 ? "" : Math.round(Math.min(1, Math.max(0.03, v)) * 100) + "%";
  if (v >= 0) p.setAttribute("aria-valuenow", String(Math.round(v * 100))); else p.removeAttribute("aria-valuenow");
}
function busy(el, label) {
  if (typeof el === "string") el = $(el);
  if (!el) return;
  if (label) { el.classList.add("busy"); el.dataset.busy = label; el.setAttribute("aria-busy", "true"); }
  else { el.classList.remove("busy"); delete el.dataset.busy; el.removeAttribute("aria-busy"); }
}
function pubBusy(on) { document.querySelectorAll("#pubView .panel").forEach(p => busy(p, on ? t("ld.loading") : null)); }

/* ---------- fond de carte : Maroc + Sahara occidental ---------- */
function decodeRing(str, off, scale) {
  const out = []; let px = off[0], py = off[1];
  for (let i = 0; i < str.length; i += 2) {
    let x = str.charCodeAt(i) - 64, y = str.charCodeAt(i + 1) - 64;
    x = (x >> 1) ^ (-(x & 1)); y = (y >> 1) ^ (-(y & 1));
    x += px; y += py; px = x; py = y;
    out.push([x / scale, y / scale]);
  }
  return out;
}
function decodeGeo(json) {
  if (!json.UTF8Encoding) return json;
  const scale = json.UTF8Scale == null ? 1024 : json.UTF8Scale;
  for (const f of json.features) {
    const g = f.geometry, off = g.encodeOffsets; if (!off) continue;
    if (g.type === "Polygon") g.coordinates = g.coordinates.map((r, c) => typeof r === "string" ? decodeRing(r, off[c], scale) : r);
    else if (g.type === "MultiPolygon") g.coordinates = g.coordinates.map((poly, p) => poly.map((r, c) => typeof r === "string" ? decodeRing(r, off[p][c], scale) : r));
    delete g.encodeOffsets;
  }
  json.UTF8Encoding = false;
  return json;
}
let MAPNAME = null;
function mapName() {
  if (MAPNAME !== null) return MAPNAME;
  MAPNAME = "";
  try {
    const m = echarts.getMap && echarts.getMap("world");
    if (!m) return MAPNAME;
    MAPNAME = "world";
    const src = m.geoJSON || m.geoJson || m;
    const gj = decodeGeo(JSON.parse(JSON.stringify(src)));
    const ma = gj.features.find(f => f.properties && f.properties.name === "Morocco");
    const ws = gj.features.find(f => f.properties && /^(W\.|Western) Sahara$/.test(f.properties.name));
    if (ma && ws) {
      const polys = g => g.type === "Polygon" ? [g.coordinates] : g.coordinates;
      ma.geometry = { type: "MultiPolygon", coordinates: [...polys(ma.geometry), ...polys(ws.geometry)] };
      gj.features = gj.features.filter(f => f !== ws);
    }
    echarts.registerMap("world_bs", gj);
    MAPNAME = "world_bs";
  } catch (e) { console.warn("map merge", e); }
  return MAPNAME;
}

/* ---------- OpenAlex (avec cache mémoire de 10 min) ---------- */
const CACHE = new Map();
async function getJSON(url, force) {
  const hit = CACHE.get(url);
  if (!force && hit && Date.now() - hit.t < 600000) return hit.j;
  const r = await fetch(url);
  if (r.status === 429) throw Object.assign(new Error(t("err.budget")), { fatal: true });
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error(t("err.key")), { fatal: true });
  if (!r.ok) throw Object.assign(new Error(t("err.http", { src: "OpenAlex", code: r.status })), { fatal: true });
  const j = await r.json(); CACHE.set(url, { t: Date.now(), j }); return j;
}
function oaBase() { return cfg.viaWorker && cfg.worker ? cfg.worker + "/openalex" : "https://api.openalex.org"; }
function oaURL(path, params) {
  const u = new URL(oaBase() + path);
  Object.entries(params).forEach(([k, v]) => v !== "" && v != null && u.searchParams.set(k, v));
  if (!(cfg.viaWorker && cfg.worker) && cfg.key) u.searchParams.set("api_key", cfg.key);
  return u.toString();
}
function buildFilter(spec, s, withCountries = true) {
  const f = [];
  const clean = (spec.q || "").replace(/[,|]/g, " ").replace(/\s+/g, " ").trim();
  if (clean) f.push("title_and_abstract.search:" + clean);
  if (withCountries && spec.countries.length) f.push("authorships.countries:" + expand(spec.countries).map(c => c.toLowerCase()).join("|"));
  f.push(`publication_year:${s.y1}-${s.y2}`);
  if (s.type) f.push("type:" + s.type);
  if (s.oa) f.push("is_oa:true");
  return f.join(",");
}
const okKey = g => g.key && !/unknown/i.test(g.key);
const code = k => String(k).split("/").pop().toUpperCase();

async function fetchLive(s, force) {
  const oa = (path, params) => getJSON(oaURL(path, params), force);
  const groupsRaw = (filter, by) => oa("/works", { filter, group_by: by, per_page: 200 });
  const groups = (filter, by) => groupsRaw(filter, by).then(j => j.group_by || []);
  const main = { q: s.q, countries: s.countries };
  const filter = buildFilter(main, s);
  const cmp = (s.q2 || s.c2) ? { q: s.q2 || s.q, countries: s.c2 ? [s.c2] : s.countries } : null;
  const [years, countries, inst, sources, fields, oaStatus, top, years2, world, intl] = await Promise.all([
    groups(filter, "publication_year"),
    groups(filter, "authorships.countries"),
    groups(filter, "authorships.institutions.lineage"),
    groups(filter, "primary_location.source.id"),
    groups(filter, "primary_topic.field.id"),
    groups(filter, "open_access.oa_status"),
    oa("/works", { filter, sort: "cited_by_count:desc", per_page: 200,
      select: "id,doi,display_name,publication_year,cited_by_count,authorships,primary_location,open_access,keywords,topics" }),
    cmp ? groups(buildFilter(cmp, s), "publication_year") : Promise.resolve(null),
    s.countries.length ? groupsRaw(buildFilter(main, s, false) + ",countries_distinct_count:>0", "authorships.countries") : Promise.resolve(null),
    oa("/works", { filter: filter + ",countries_distinct_count:>1", per_page: 1, select: "id" }).then(j => j.meta.count).catch(() => null)
  ]);
  return {
    mode: "live", range: [s.y1, s.y2], selected: s.countries.slice(), main, cmp,
    total: top.meta ? top.meta.count : years.reduce((a, g) => a + g.count, 0),
    years: years.map(g => [Number(g.key), g.count]).filter(d => d[0]),
    years2: years2 ? years2.map(g => [Number(g.key), g.count]).filter(d => d[0]) : null,
    countries: mergeCounts(countries.filter(okKey).map(g => [code(g.key), g.count])),
    world: world ? { total: world.meta ? world.meta.count : null, list: mergeCounts((world.group_by || []).filter(okKey).map(g => [code(g.key), g.count])) } : null,
    intl,
    inst: inst.filter(okKey).slice(0, 15).map(g => [g.key_display_name, g.count]),
    sources: sources.filter(okKey).slice(0, 15).map(g => [g.key_display_name, g.count]),
    fields: fields.filter(okKey).slice(0, 12).map(g => [g.key_display_name, g.count]),
    oa: oaStatus.map(g => [g.key, g.count]),
    works: (top.results || []).map(w => ({
      title: w.display_name, year: w.publication_year, cites: w.cited_by_count || 0, doi: w.doi,
      authors: (w.authorships || []).slice(0, 3).map(a => a.author && a.author.display_name).filter(Boolean),
      more: Math.max(0, (w.authorships || []).length - 3),
      source: w.primary_location && w.primary_location.source ? w.primary_location.source.display_name : "",
      isOa: !!(w.open_access && w.open_access.is_oa), bases: null
    })),
    docs: (top.results || []).map(w => {
      const au = w.authorships || [];
      const kw = (w.keywords || []).map(k => k.display_name).filter(Boolean);
      return { year: w.publication_year,
        kw: kw.length ? kw : (w.topics || []).map(x => x.display_name).filter(Boolean),
        countries: [...new Set(au.flatMap(a => a.countries || []).map(c => unify(String(c).toUpperCase())))],
        authors: au.map(a => a.author && a.author.display_name).filter(Boolean),
        inst: [...new Set(au.flatMap(a => (a.institutions || []).map(i => i.display_name)).filter(Boolean))] };
    })
  };
}
function describe(spec) {
  const what = spec.q ? t("d.q", { q: spec.q }) : t("d.all");
  const where = spec.countries.length ? spec.countries.map(cname).join(" + ") : t("d.world");
  return `${what} · ${where}`;
}

/* ---------- données d'exemple ---------- */
function seeded(str) {
  let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let seed = h >>> 0; return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
}
const L = i => String.fromCharCode(65 + i);
function demoData(s) {
  const rnd = seeded(s.q + s.q2 + s.countries.join("") + s.c2);
  const scaleAll = s.countries.length ? 0.06 : 1, broad = s.q ? 1 : 40;
  const main = { q: s.q, countries: s.countries };
  const cmp = (s.q2 || s.c2) ? { q: s.q2 || s.q, countries: s.c2 ? [s.c2] : s.countries } : null;
  const years = [], years2 = [];
  for (let y = s.y1; y <= s.y2; y++) {
    const x = (y - s.y1) / Math.max(1, s.y2 - s.y1);
    let v = broad * scaleAll * 9000 / (1 + Math.exp(-9 * (x - 0.6))) * (0.9 + rnd() * 0.2);
    if (y === CUR_YEAR) v *= 0.82;
    years.push([y, Math.round(v + 20)]);
    if (cmp) { let w = broad * scaleAll * 3800 / (1 + Math.exp(-6 * (x - 0.45))) * (0.9 + rnd() * 0.2); if (y === CUR_YEAR) w *= 0.82; years2.push([y, Math.round(w + 15)]); }
  }
  const total = years.reduce((a, d) => a + d[1], 0);
  const cw = [["CN",.38],["US",.14],["KR",.07],["IN",.065],["JP",.05],["DE",.045],["GB",.04],["SA",.03],["IT",.028],["AU",.027],["CH",.025],["ES",.022],["FR",.021],["CA",.02],["TW",.019],["SG",.016],["IR",.015],["NL",.014],["SE",.012],["PK",.011],["BR",.01],["MY",.009],["EG",.008],["TR",.008],["PL",.007],["BE",.006],["DK",.006],["RU",.006],["MX",.005],["ZA",.004],["MA",.004],["DZ",.003],["TN",.003],["NG",.003],["AR",.002],["CL",.002]];
  const worldTotal = s.countries.length ? Math.round(total / scaleAll) : total;
  const worldList = cw.map(([c, w]) => [c, Math.round(worldTotal * w * (0.85 + rnd() * 0.3))]).sort((a, b) => b[1] - a[1]);
  let countries = worldList;
  if (s.countries.length) {
    countries = [...s.countries.map(c => [c, total]), ...worldList.filter(([c]) => !s.countries.includes(c)).map(([c, n]) => [c, Math.round(total * 0.25 * n / worldList[0][1] * (0.5 + rnd()))])].sort((a, b) => b[1] - a[1]);
    s.countries.forEach(c => { if (!worldList.some(r => r[0] === c)) worldList.push([c, total]); });
    worldList.sort((a, b) => b[1] - a[1]);
  }
  const scale = arr => arr.map((n, i) => [n, Math.round(total * (0.02 / (1 + i * 0.25)) * (0.85 + rnd() * 0.3))]).sort((a, b) => b[1] - a[1]);
  const pYears = years.map(([y, v]) => [y, Math.round(v * 0.18 * (0.8 + rnd() * 0.4))]);
  return {
    d: { mode: "demo", range: [s.y1, s.y2], selected: s.countries.slice(), main, cmp,
      total, years, years2: cmp ? years2 : null, countries, world: s.countries.length ? { total: worldTotal, list: worldList } : null,
      intl: Math.round(total * (s.countries.length ? 0.46 : 0.22)),
      inst: scale(Array.from({ length: 12 }, (_, i) => t("ex.inst", { x: L(i) }))),
      sources: scale(Array.from({ length: 10 }, (_, i) => t("ex.journal", { x: i + 1 }))),
      fields: scale(["Materials Science","Engineering","Energy","Chemistry","Physics and Astronomy","Medicine","Environmental Science","Computer Science"]),
      oa: [["closed", .41],["gold", .19],["hybrid", .14],["green", .12],["bronze", .11],["diamond", .03]].map(([k, w]) => [k, Math.round(total * w)]),
      works: Array.from({ length: 200 }, (_, i) => ({ title: t("ex.title", { n: i + 1 }), year: s.y1 + Math.floor(rnd() * (s.y2 - s.y1 + 1)),
        cites: Math.round(9000 / Math.pow(i + 1, 0.78)), doi: null, authors: [t("ex.author", { x: "A" }), t("ex.author", { x: "B" })], more: Math.floor(rnd() * 8),
        source: t("ex.journal1"), isOa: rnd() > .5, bases: null })),
      docs: Array.from({ length: 200 }, (_, i) => {
        const g = i % 4, pickN = (n, f) => Array.from({ length: n }, () => f()).filter((v, j, a) => a.indexOf(v) === j);
        return { year: s.y1 + Math.floor(rnd() * (s.y2 - s.y1 + 1)),
          kw: pickN(4, () => t("ex.kw", { x: L(g * 6 + Math.floor(rnd() * (rnd() < .8 ? 6 : 24)) % 24) })),
          countries: pickN(3, () => cw[Math.floor(Math.pow(rnd(), 2) * cw.length)][0]),
          authors: pickN(4, () => t("ex.author", { x: L(g * 5 + Math.floor(rnd() * 5)) })),
          inst: pickN(2, () => t("ex.inst", { x: L(g * 3 + Math.floor(rnd() * 3)) })) };
      }) },
    pat: { source: "demo", total: pYears.reduce((a, d) => a + d[1], 0) }
  };
}

/* ======================================================================
   IMPORT ET FUSION (WoS, Scopus, Publish or Perish)
   ====================================================================== */
function loadScript(src) {
  return new Promise((ok, ko) => { const el = document.createElement("script"); el.src = src; el.onload = ok; el.onerror = () => ko(new Error("Script: " + src)); document.head.appendChild(el); });
}
function parseDelimited(text, delim) {
  const rows = [], n = text.length, D = delim.charCodeAt(0), quotes = delim !== "\t";
  let row = [], i = 0;
  while (i < n) {
    let field;
    if (quotes && text.charCodeAt(i) === 34) {
      const parts = []; let j = i + 1;
      for (;;) {
        const k = text.indexOf('"', j);
        if (k === -1) { parts.push(text.slice(j)); i = n; break; }
        if (text.charCodeAt(k + 1) === 34) { parts.push(text.slice(j, k + 1)); j = k + 2; continue; }
        parts.push(text.slice(j, k)); i = k + 1; break;
      }
      let k = i; while (k < n) { const c = text.charCodeAt(k); if (c === D || c === 10 || c === 13) break; k++; }
      field = parts.join("") + text.slice(i, k); i = k;
    } else {
      let k = i; while (k < n) { const c = text.charCodeAt(k); if (c === D || c === 10 || c === 13) break; k++; }
      field = text.slice(i, k); i = k;
    }
    row.push(field);
    if (i >= n) break;
    const c = text.charCodeAt(i);
    if (c === D) { i++; if (i === n) row.push(""); continue; }
    if (c === 13) i++;
    if (text.charCodeAt(i) === 10) i++;
    rows.push(row); row = [];
  }
  if (row.length) rows.push(row);
  return rows;
}
function parseTagged(text) {
  const recs = []; let cur = null, tag = null;
  for (const raw of text.split(/\r?\n/)) {
    if (/^ER\s*$/.test(raw)) { if (cur) recs.push(cur); cur = null; tag = null; continue; }
    if (/^(FN|VR|EF)(\s|$)/.test(raw)) continue;
    const m = raw.match(/^([A-Z][A-Z0-9])\s(.*)$/);
    if (m) { tag = m[1]; cur = cur || {}; cur[tag] = cur[tag] ? cur[tag] + "\n" + m[2] : m[2]; }
    else if (/^\s{2,}\S/.test(raw) && cur && tag) cur[tag] += "\n" + raw.trim();
  }
  return recs.map(r => {
    const o = {};
    for (const [k, v] of Object.entries(r)) o[k.toLowerCase()] = ["AU", "AF", "C1", "C3"].includes(k) ? v.split("\n").join("; ") : v.split("\n").join(" ");
    return o;
  });
}
function rowsToObjects(rows) {
  const head = (rows[0] || []).map(h => h.replace(/^﻿/, "").trim().toLowerCase());
  return rows.slice(1).filter(r => r.some(x => String(x).trim())).map(r => { const o = {}; head.forEach((h, i) => { if (h) o[h] = r[i] ?? ""; }); return o; });
}
async function readFile(file) {
  if (/\.xlsx?$/i.test(file.name)) {
    if (!window.XLSX) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    return { recs: json.map(o => { const n = {}; for (const [k, v] of Object.entries(o)) n[k.trim().toLowerCase()] = v; return n; }), tagged: false };
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  const enc = buf[0] === 0xFF && buf[1] === 0xFE ? "utf-16le" : buf[0] === 0xFE && buf[1] === 0xFF ? "utf-16be" : "utf-8";
  const text = new TextDecoder(enc).decode(buf).replace(/^﻿/, "");
  if (/^(FN |PT )/.test(text) && !/^PT\t/.test(text)) return { recs: parseTagged(text), tagged: true };
  const first = text.split(/\r?\n/, 1)[0];
  const cnt = d => first.split(d).length - 1;
  const delim = [["\t", cnt("\t")], [",", cnt(",")], [";", cnt(";")]].sort((a, b) => b[1] - a[1])[0][0];
  return { recs: rowsToObjects(parseDelimited(text, delim)), tagged: false };
}
const COLS = {
  title: ["title", "ti", "article title", "document title"],
  year: ["year", "py", "publication year"],
  cites: ["cites", "cited by", "tc", "times cited, all databases", "times cited, wos core", "z9", "citations", "citation count"],
  source: ["source title", "so", "journal", "publication name", "source"],
  doi: ["doi", "di"],
  authors: ["authors", "au", "author full names", "af", "author names"],
  affil: ["affiliations", "c1", "addresses", "authors with affiliations"],
  oa: ["open access", "oa", "open access designations"],
  type: ["document type", "dt", "type"],
  kw: ["author keywords", "de", "keywords", "author keywords (de)"],
  kwi: ["index keywords", "id", "keywords plus", "keywords plus®"],
  prov: ["provenance"]
};
const pick = (o, keys) => { for (const k of keys) if (k in o && String(o[k]).trim() !== "") return String(o[k]).trim(); return ""; };
const hasCol = (o, keys) => keys.some(k => k in o);
function undouble(v) {
  const parts = String(v || "").trim().split("; "), n = parts.length;
  if (n % 2 === 0 && n > 0 && parts.slice(0, n / 2).join("; ").toLowerCase() === parts.slice(n / 2).join("; ").toLowerCase()) return parts.slice(0, n / 2).join("; ");
  return String(v || "").trim();
}
const stripTags = s => String(s || "").replace(/<\/?(sub|sup|i|b|em|strong|scp|inf)>/gi, "").replace(/\s+/g, " ").trim();
const ntitle = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const ndoi = d => String(d || "").trim().toLowerCase().replace(/^(https?:\/\/)?(dx\.)?doi\.org\//, "").replace(/\.$/, "");
function firstAuthor(au) {
  const a = String(au || "").split(";")[0].trim();
  if (!a) return "";
  if (a.includes(",")) return ntitle(a.split(",")[0]);
  const keep = a.split(/\s+/).filter(x => !/^([A-Z]\.?-?){1,3}\.?$/.test(x));
  return ntitle(keep.length ? keep.join(" ") : a);
}
function countriesFrom(affil) {
  if (!affil) return [];
  const out = new Set();
  for (const p of String(affil).replace(/\[[^\]]*\]/g, " ").split(/;|\n/)) {
    const seg = p.split(",").map(x => x.trim()).filter(Boolean);
    if (!seg.length) continue;
    const c = matchCountry(seg[seg.length - 1]);
    if (c) out.add(unify(c));
  }
  return [...out];
}
function oaClass(v) {
  const s = norm(v); if (!s) return "closed";
  if (/gold/.test(s)) return "gold"; if (/hybrid/.test(s)) return "hybrid"; if (/bronze/.test(s)) return "bronze"; if (/green/.test(s)) return "green";
  return /open/.test(s) ? "green" : "closed";
}
function detectBase(s0, tagged) {
  if ("gsrank" in s0 || "citesperyear" in s0 || "ecc" in s0) return "PoP";
  if ("eid" in s0 || "source title" in s0 || "link" in s0 && "cited by" in s0) return "Scopus";
  if (tagged || "ut" in s0 || "ut (unique wos id)" in s0 || "tc" in s0 || "times cited, all databases" in s0) return "WoS";
  return "Autre";
}
/* Une notice normalisée */
function normalize(r, base) {
  const title = stripTags(undouble(pick(r, COLS.title)));
  const year = parseInt(pick(r, COLS.year), 10);
  const cites = parseInt(String(pick(r, COLS.cites)).replace(/\s/g, ""), 10);
  const au = pick(r, COLS.authors);
  const auList = au ? au.split(au.includes(";") ? ";" : ",").map(x => x.trim()).filter(Boolean) : [];
  const affil = pick(r, COLS.affil);
  const oaRaw = hasCol(r, COLS.oa) ? pick(r, COLS.oa) : null;
  let doi = pick(r, COLS.doi);
  const kwRaw = pick(r, COLS.kw) || pick(r, COLS.kwi);
  const kw = kwRaw ? [...new Set(kwRaw.split(";").map(x => x.trim().toLowerCase()).filter(x => x && x.length < 80))] : [];
  return {
    kw,
    title, nt: ntitle(title), year: year > 1000 ? year : null, doi: ndoi(doi), source: /^(scopus|web of science|wos)$/i.test(pick(r, COLS.source)) ? "" : undouble(pick(r, COLS.source)),
    authors: auList, fa: firstAuthor(au), affil, countries: countriesFrom(affil), oaRaw, type: undouble(pick(r, COLS.type)),
    bases: [base], citesBy: { [base]: isNaN(cites) ? null : cites }, cites: isNaN(cites) ? 0 : cites
  };
}
let FILES = [];   // { name, base, recs (normalisées), raw: nombre lu, internal: doublons internes }
let MERGE = null; // résultat de la fusion
function dedupeWithin(recs) {
  const seen = new Set(), out = []; let dropped = 0;
  for (const r of recs) {
    const k = r.doi ? "d:" + r.doi : "t:" + r.nt + "|" + r.year;
    if (seen.has(k)) { dropped++; continue; }
    seen.add(k); out.push(r);
  }
  return { out, dropped };
}
function mergeInto(m, r, rule) {
  for (const b of r.bases) if (!m.bases.includes(b)) m.bases.push(b);
  for (const [b, v] of Object.entries(r.citesBy)) if (v != null) m.citesBy[b] = Math.max(m.citesBy[b] ?? 0, v);
  m.cites = Math.max(m.cites, r.cites);
  for (const k of ["doi", "source", "affil", "type"]) if (!m[k] && r[k]) m[k] = r[k];
  if (!m.year && r.year) m.year = r.year;
  if (!m.authors.length && r.authors.length) m.authors = r.authors;
  if (m.oaRaw == null && r.oaRaw != null) m.oaRaw = r.oaRaw;
  m.countries = [...new Set([...m.countries, ...r.countries])];
  m.kw = [...new Set([...(m.kw || []), ...(r.kw || [])])];
  if (r.authors.length > m.authors.length) m.authors = r.authors;
  m.rules = [...(m.rules || []), rule];
}
const wordSet = s => new Set(s.split(" ").filter(w => w.length > 2));
function jaccard(a, b) { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1); }
function runMerge() {
  const master = [], byDoi = new Map(), byKey = new Map(), byTY = new Map();
  let nDoi = 0, nTitle = 0, review = [];
  const index = (m, i) => {
    if (m.doi) byDoi.set(m.doi, i);
    byKey.set(m.nt + "|" + m.year + "|" + m.fa, i);
    const k = m.nt + "|" + m.year; if (!byTY.has(k)) byTY.set(k, []); byTY.get(k).push(i);
  };
  FILES.forEach((f, fi) => {
    const addedHere = [];
    for (const r0 of f.recs) {
      const r = { ...r0, bases: [...r0.bases], citesBy: { ...r0.citesBy }, countries: [...r0.countries], fileIdx: fi };
      let i = null, rule = null;
      if (r.doi && byDoi.has(r.doi) && master[byDoi.get(r.doi)].fileIdx !== fi) { i = byDoi.get(r.doi); rule = "doi"; }
      if (i == null && r.nt) {
        const k = r.nt + "|" + r.year + "|" + r.fa;
        if (byKey.has(k) && master[byKey.get(k)].fileIdx !== fi) { i = byKey.get(k); rule = "title"; }
      }
      if (i == null && r.nt) {
        const c = (byTY.get(r.nt + "|" + r.year) || []).filter(j => master[j].fileIdx !== fi);
        if (c.length === 1 && (!r.doi || !master[c[0]].doi)) { i = c[0]; rule = "title"; }
      }
      if (i != null) { mergeInto(master[i], r, rule); rule === "doi" ? nDoi++ : nTitle++; }
      else { const idx = master.push(r) - 1; index(r, idx); addedHere.push(idx); }
    }
    /* quasi-doublons : nouvelles notices de ce fichier vs notices des fichiers précédents restées seules */
    if (fi > 0) {
      const earlier = master.filter(m => m.fileIdx < fi && m.bases.length === 1).map(m => ({ m, ws: wordSet(m.nt) }));
      for (const idx of addedHere) {
        const r = master[idx]; if (!r.nt) continue;
        const ws = wordSet(r.nt); if (ws.size < 3) continue;
        let best = null;
        for (const e of earlier) {
          if (r.year && e.m.year && Math.abs(r.year - e.m.year) > 1) continue;
          if (Math.abs(e.ws.size - ws.size) > Math.max(3, ws.size * 0.3)) continue;
          const j = jaccard(ws, e.ws);
          if (j >= 0.85 && (!best || j > best.j)) best = { j, a: e.m, b: r };
        }
        if (best) review.push(best);
      }
    }
  });
  MERGE = { records: master, nDoi, nTitle, review, raw: FILES.reduce((a, f) => a + f.raw, 0) };
  return MERGE;
}
function dataFromMerge(mg) {
  const recs = mg.records;
  const yearMap = new Map(), cMap = new Map(), sMap = new Map(), oaMap = new Map();
  let withCountry = 0, intl = 0, authorsSum = 0, hasOA = false, hasAffil = false;
  for (const r of recs) {
    if (r.year) yearMap.set(r.year, (yearMap.get(r.year) || 0) + 1);
    if (r.source) sMap.set(r.source, (sMap.get(r.source) || 0) + 1);
    if (r.affil) hasAffil = true;
    if (r.countries.length) { withCountry++; r.countries.forEach(c => cMap.set(c, (cMap.get(c) || 0) + 1)); if (r.countries.length > 1) intl++; }
    if (r.oaRaw != null) { hasOA = true; const k = oaClass(r.oaRaw); oaMap.set(k, (oaMap.get(k) || 0) + 1); }
    authorsSum += r.authors.length;
  }
  const ys = [...yearMap.keys()];
  const works = recs.map(r => ({ title: r.title, year: r.year, cites: r.cites, doi: r.doi ? "https://doi.org/" + r.doi : null,
    authors: r.authors.slice(0, 3), more: Math.max(0, r.authors.length - 3), source: r.source, isOa: r.oaRaw != null && oaClass(r.oaRaw) !== "closed", bases: r.bases }))
    .sort((a, b) => b.cites - a.cites);
  return {
    mode: "file", range: ys.length ? [Math.min(...ys), Math.max(...ys)] : [CUR_YEAR, CUR_YEAR], selected: [],
    total: recs.length, years: [...yearMap.entries()].sort((a, b) => a[0] - b[0]), years2: null,
    countries: cMap.size ? [...cMap.entries()].sort((a, b) => b[1] - a[1]) : null, countryCoverage: recs.length ? withCountry / recs.length : 0,
    hasAffil, world: null, intl: hasAffil ? intl : null, inst: null, fields: null,
    sources: [...sMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15), oa: hasOA ? [...oaMap.entries()] : null,
    works, authorsAvg: recs.length ? authorsSum / recs.length : null,
    docs: recs.map(r => ({ year: r.year, kw: r.kw || [], countries: r.countries, authors: r.authors, inst: [] }))
  };
}
function mergedCSV() {
  const rows = [["Title", "Year", "Source title", "Cited by", "DOI", "Authors", "Affiliations", "Countries", "Open Access", "Document Type", "Provenance",
    ...[...new Set(FILES.map(f => f.base))].map(b => "Cited by (" + b + ")")]];
  const bases = [...new Set(FILES.map(f => f.base))];
  for (const r of MERGE.records) rows.push([r.title, r.year || "", r.source, r.cites, r.doi, r.authors.join("; "), r.affil, r.countries.join("; "),
    r.oaRaw ?? "", r.type, r.bases.join(" + "), ...bases.map(b => r.citesBy[b] ?? "")]);
  return csv(rows);
}
async function addFiles(list) {
  for (const file of list) {
    setStatus("", t("st.reading", { name: file.name }));
    try {
      const { recs, tagged } = await readFile(file);
      if (!recs.length) throw new Error(t("file.errEmpty", { name: file.name }));
      if (!hasCol(recs[0], COLS.title)) throw new Error(t("file.errTitle", { name: file.name }));
      let base = detectBase(recs[0], tagged);
      if (hasCol(recs[0], COLS.prov) && "cited by" in recs[0] && !("eid" in recs[0])) base = "Biblioscope";
      const normed = recs.map(r => normalize(r, base));
      const { out, dropped } = dedupeWithin(normed);
      FILES.push({ name: file.name, base, recs: out, raw: recs.length, internal: dropped });
    } catch (e) { setStatus("err", e.message); return; }
  }
  refreshFiles();
}
function refreshFiles() {
  const box = $("fileList");
  box.hidden = !FILES.length;
  box.innerHTML = FILES.length ? `<span class="flabel">${esc(t("imp.loaded"))}</span>` + FILES.map((f, i) =>
    `<span class="fchip"><b>${esc(f.base === "Autre" ? t("file.generic") : f.base)}</b> ${esc(f.name)} · ${fmt(f.raw)}<button type="button" data-rm="${i}" aria-label="${esc(t("imp.remove"))} ${esc(f.name)}">×</button></span>`).join("") +
    `<button type="button" class="ghost" id="clearFiles">${esc(t("imp.clear"))}</button>` : "";
  box.querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", () => { FILES.splice(Number(b.dataset.rm), 1); refreshFiles(); }));
  const cl = $("clearFiles"); if (cl) cl.addEventListener("click", () => { FILES = []; refreshFiles(); });
  if (!FILES.length) { MERGE = null; if (DATA && DATA.mode === "file") { DATA = null; } $("mergePanel").hidden = true; $("fileBanner").hidden = true; setStatus("", t("st.chooseFile")); return; }
  runMerge();
  DATA = dataFromMerge(MERGE); PAT = null;
  $("demoBanner").hidden = true;
  renderFileBanner(); renderAll();
  $("updated").textContent = now();
  setStatus("live", t("st.fileDone"));
}
function renderFileBanner() {
  if (!DATA || DATA.mode !== "file") return;
  const formats = [...new Set(FILES.map(f => f.base === "Autre" ? t("file.generic") : f.base))].join(" + ");
  $("fileBanner").innerHTML = t("file.banner", { n: FILES.length, formats: esc(formats), total: fmt(DATA.total) }) +
    (DATA.countries ? t("file.countries", { p: pct(DATA.countryCoverage) }) : t("file.noAffil")) + t("file.private");
  $("fileBanner").hidden = false;
}
function renderMerge() {
  const p = $("mergePanel");
  if (!DATA || DATA.mode !== "file" || !MERGE) { p.hidden = true; return; }
  p.hidden = false;
  const mg = MERGE, dups = mg.nDoi + mg.nTitle;
  $("mergeSrc").textContent = [...new Set(FILES.map(f => f.base))].join(" + ");
  const items = [
    [t("m.s.read"), fmt(mg.raw), t("m.s.inFiles", { n: FILES.length })],
    [t("m.s.dups"), fmt(dups), `${t("m.s.byDoi", { n: fmt(mg.nDoi) })} · ${t("m.s.byTitle", { n: fmt(mg.nTitle) })}`],
    [t("m.s.unique"), fmt(mg.records.length), ""],
    [t("m.s.review"), fmt(mg.review.length), t("m.s.reviewS")]
  ];
  $("mergeStats").innerHTML = items.map(([k, v, s]) => `<div><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span><span class="s">${esc(s)}</span></div>`).join("");
  $("tFiles").tBodies[0].innerHTML = FILES.map(f => `<tr><td>${esc(f.name)}</td><td>${esc(f.base === "Autre" ? t("file.generic") : f.base)}</td><td class="n">${fmt(f.raw)}</td><td class="n">${fmt(f.internal)}</td><td class="n">${fmt(f.recs.length)}</td></tr>`).join("");
  const prov = new Map(); mg.records.forEach(r => { const k = r.bases.join(" + "); prov.set(k, (prov.get(k) || 0) + 1); });
  const rows = [...prov.entries()].sort((a, b) => b[0].split(" + ").length - a[0].split(" + ").length || b[1] - a[1]);
  $("tProv").tBodies[0].innerHTML = rows.map(([k, n]) => `<tr><td>${esc(k)}</td><td class="n">${fmt(n)}</td><td class="n">${pct(n / mg.records.length)}</td></tr>`).join("");
  /* couverture sur les années communes, pour deux bases */
  let cov = "";
  const bases = [...new Set(FILES.map(f => f.base))];
  if (bases.length === 2) {
    const yrs = b => new Set(mg.records.filter(r => r.bases.includes(b) && r.year).map(r => r.year));
    const ya = yrs(bases[0]), yb = yrs(bases[1]); const common = [...ya].filter(y => yb.has(y)).sort();
    if (common.length) {
      const inYears = r => common.includes(r.year);
      const a = mg.records.filter(r => inYears(r) && r.bases.includes(bases[0]));
      const both = a.filter(r => r.bases.includes(bases[1])).length;
      const b = mg.records.filter(r => inYears(r) && r.bases.includes(bases[1]));
      const span = common.length > 1 ? `${common[0]}–${common[common.length - 1]}` : String(common[0]);
      cov = " " + t("m.coverage", { y: span, a: pct(a.length ? both / a.length : 0), b1: bases[0], b2: bases[1] }) + " " +
        t("m.coverage", { y: span, a: pct(b.length ? both / b.length : 0), b1: bases[1], b2: bases[0] });
    }
  }
  $("mergeNote").textContent = t("m.note") + cov;
  $("reviewBox").hidden = !mg.review.length;
  $("tReview").tBodies[0].innerHTML = mg.review.slice(0, 100).map(x => `<tr><td class="n">${pct(x.j)}</td><td>${esc(x.a.title)}<div class="w-meta">${esc(x.a.bases.join(" + "))}</div></td><td>${esc(x.b.title)}<div class="w-meta">${esc(x.b.bases.join(" + "))}</div></td><td class="n">${x.a.year ?? "—"} / ${x.b.year ?? "—"}</td></tr>`).join("");
}
let dlNS; // capacité « downloads » quand la page est vue dans claude.ai ; sinon téléchargement navigateur classique
if (window.claude && typeof window.claude.use === "function") window.claude.use("downloads").then(ns => { dlNS = ns; }).catch(() => { dlNS = null; });
$("btnDownload").addEventListener("click", async () => {
  if (!MERGE) return;
  const data = "\uFEFF" + mergedCSV(), filename = "biblioscope_corpus_fusionne.csv";
  if (dlNS) { try { await dlNS.save({ filename, data: new Blob([data], { type: "text/csv" }) }); } catch {} return; }
  try {
    const blob = new Blob([data], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  } catch {}
});
$("btnCopyMerged").addEventListener("click", async e => {
  if (!MERGE) return; const b = e.currentTarget, old = b.textContent;
  try { await navigator.clipboard.writeText(mergedCSV()); b.textContent = t("m.copied"); } catch { b.textContent = t("m.copyFail"); }
  setTimeout(() => b.textContent = old, 1600);
});

/* ---------- rendu publications ---------- */
function hIndex(works) {
  const c = works.map(w => w.cites).sort((a, b) => b - a);
  let h = 0; while (h < c.length && c[h] >= h + 1) h++;
  let g = 0, sum = 0; for (let i = 0; i < c.length; i++) { sum += c[i]; if (sum >= (i + 1) * (i + 1)) g = i + 1; }
  return { h, g, capped: h === c.length && c.length >= 200 };
}
function axisCommon(th) {
  return { axisLine: { lineStyle: { color: th.line } }, axisTick: { show: false },
    axisLabel: { color: th.muted, fontFamily: th.mono, fontSize: 11 }, splitLine: { lineStyle: { color: th.line, type: [3, 3] } } };
}
const tip = th => ({ backgroundColor: th.surface, borderColor: th.line, textStyle: { color: th.ink, fontSize: 12 } });
const labelMain = () => DATA.main ? describe(DATA.main) : (FILES.length > 1 ? t("scope.files", { n: FILES.length }) : (FILES[0] ? FILES[0].name : ""));

function renderYears(th) {
  if (!DATA.years.length) { noChart("cYears", t("na.years")); return; }
  const c = chart("cYears"); if (!c) return;
  const [y1, y2] = DATA.range;
  const ys = []; for (let y = y1; y <= y2; y++) ys.push(y);
  const m1 = new Map(DATA.years), m2 = DATA.years2 ? new Map(DATA.years2) : null;
  const patMap = PAT && PAT.byYear ? new Map(PAT.byYear) : null;
  const series = [{ name: labelMain(), type: "bar", barMaxWidth: 26,
    data: ys.map(y => ({ value: m1.get(y) || 0, itemStyle: { color: th.accent, opacity: y === CUR_YEAR ? 0.4 : 1, borderRadius: [2, 2, 0, 0] } })) }];
  if (m2) series.push({ name: describe(DATA.cmp), type: "line", smooth: 0.25, symbolSize: 5, lineStyle: { width: 2, color: th.ink }, itemStyle: { color: th.ink }, data: ys.map(y => m2.get(y) || 0) });
  if (patMap) series.push({ name: t("ser.patents"), type: "line", yAxisIndex: 1, smooth: 0.25, symbolSize: 5, lineStyle: { width: 2, color: th.ochre, type: "dashed" }, itemStyle: { color: th.ochre }, data: ys.map(y => patMap.has(y) ? patMap.get(y) : null) });
  const ax = axisCommon(th);
  c.setOption({
    animationDuration: 500, textStyle: { fontFamily: th.body },
    grid: { left: 8, right: patMap ? 8 : 16, top: 36, bottom: 8, containLabel: true },
    legend: { top: 0, left: 0, textStyle: { color: th.ink, fontSize: 12 }, itemWidth: 14, itemHeight: 8 },
    tooltip: { trigger: "axis", ...tip(th), valueFormatter: v => v == null ? "—" : fmt(v) },
    xAxis: { type: "category", data: ys, ...ax, splitLine: { show: false } },
    yAxis: [{ type: "value", name: t("ser.pubs"), nameTextStyle: { color: th.muted, align: "left" }, ...ax, axisLine: { show: false }, axisLabel: { ...ax.axisLabel, formatter: v => fmt(v) } },
      ...(patMap ? [{ type: "value", name: t("ser.patents"), nameTextStyle: { color: th.ochre, align: "right" }, ...ax, splitLine: { show: false }, axisLine: { show: false }, axisLabel: { ...ax.axisLabel, color: th.ochre, formatter: v => fmt(v) } }] : [])],
    series
  }, true);
}

let mapClickBound = false;
function renderMap(th) {
  const sel = new Set(DATA.selected);
  const hasSel = sel.size > 0 && DATA.world;
  $("mapSeg").hidden = !hasSel;
  const view = hasSel ? VIEW : "dist";
  document.querySelectorAll("#mapSeg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.view === VIEW)));
  const names = DATA.selected.map(cname).join(" + ");
  const collab = DATA.intl != null && DATA.total ? t("map.collab", { p: pct(DATA.intl / DATA.total) }) : "";
  let rows, denom, note;
  if (view === "world") {
    rows = DATA.world.list; denom = DATA.world.total || rows.reduce((a, r) => a + r[1], 0);
    $("mapTitle").textContent = t("map.world");
    note = t("map.noteWorld", { subj: DATA.main.q ? t("d.q", { q: DATA.main.q }) : t("map.allPubs"), y1: DATA.range[0], y2: DATA.range[1] }) + collab;
  } else if (view === "partners") {
    rows = (DATA.countries || []).filter(([c]) => !sel.has(c)); denom = DATA.total;
    $("mapTitle").textContent = t("map.partners", { names });
    note = t("map.notePartners", { names }) + collab;
  } else {
    rows = DATA.countries; denom = DATA.total;
    $("mapTitle").textContent = t("map.dist");
    note = rows ? t("map.noteDist") + collab + (DATA.mode === "file" ? "" : t("map.clickHint")) : "";
  }
  $("mapSrc").textContent = DATA.mode === "file" ? t("map.srcFile") : t("map.srcLive");
  $("mapNote").textContent = note;
  const tb = $("tCountries").tBodies[0];
  tb.className = DATA.mode === "file" ? "" : "click";
  if (!rows || !rows.length) {
    LAST_ROWS = [];
    tb.innerHTML = `<tr><td colspan="4" class="note">${esc(DATA.mode === "file" ? t("map.noAffil") : t("map.noCountry"))}</td></tr>`;
    noChart("cMap", DATA.mode === "file" ? t("map.noAffilMap") : t("map.noData"));
    return;
  }
  rows = rows.slice().sort((a, b) => b[1] - a[1]); LAST_ROWS = rows.map(r => [...r, denom]);
  const max = rows[0][1];
  tb.innerHTML = rows.slice(0, 80).map(([c, n], i) => `<tr data-code="${c}" class="${sel.has(c) ? "sel" : ""}"><td class="rank">${i + 1}</td><td>${esc(cname(c))}<div class="bar"><i style="width:${(n / max * 100).toFixed(1)}%"></i></div></td><td class="n">${fmt(n)}</td><td class="n">${pct(n / denom)}</td></tr>`).join("");
  const mn = mapName();
  if (!mn) { noChart("cMap", t("map.noBase")); return; }
  const c = chart("cMap"); if (!c) return;
  const data = rows.map(([cc, n], i) => {
    const d = { name: geoName(cc), value: Math.log10(n + 1), raw: n, code: cc, rank: i + 1 };
    if (sel.has(cc)) d.itemStyle = { borderColor: th.ochre, borderWidth: 2 };
    if (cc === "MA") d.itemStyle = { ...(d.itemStyle || {}), borderWidth: sel.has(cc) ? 2 : 0 };
    return d;
  });
  if (view === "partners") DATA.selected.forEach(cc => data.push({ name: geoName(cc), value: NaN, raw: null, code: cc, self: true, itemStyle: { areaColor: th.ochre, borderWidth: cc === "MA" ? 0 : 0.6 } }));
  if (!data.some(d => d.code === "MA")) data.push({ name: "Morocco", value: NaN, code: "MA", raw: null, itemStyle: { borderWidth: 0 } });
  const maxLog = Math.max(1, ...data.filter(d => !isNaN(d.value)).map(d => d.value));
  c.setOption({
    tooltip: { trigger: "item", ...tip(th), formatter: p => {
      const d = p.data; if (!d || !d.code) return esc(p.name);
      if (d.self) return `<b>${esc(cname(d.code))}</b><br>${esc(t("tip.selected"))}`;
      if (d.raw == null) return `<b>${esc(cname(d.code))}</b><br>${esc(t("tip.none"))}`;
      return `<b>${esc(cname(d.code))}</b>${view === "world" ? " · " + ordinal(d.rank) : ""}<br>${esc(t("tip.pubs", { n: fmt(d.raw), p: pct(d.raw / denom) }))}`;
    } },
    visualMap: { min: 0, max: maxLog, left: 0, bottom: 0, orient: "horizontal", itemWidth: 10, itemHeight: 120, calculable: false,
      text: [fmt(Math.pow(10, maxLog)), "1"], textStyle: { color: th.muted, fontFamily: th.mono, fontSize: 11 },
      inRange: { color: [th.soft, th.accent, th.accent2] }, outOfRange: { color: th.line } },
    series: [{ type: "map", map: mn, roam: true, scaleLimit: { min: 1, max: 8 }, top: 10, bottom: 30,
      itemStyle: { areaColor: th.line, borderColor: th.surface, borderWidth: 0.6 },
      emphasis: { label: { show: false }, itemStyle: { areaColor: th.ochre } }, select: { disabled: true }, data }]
  }, true);
  if (!mapClickBound) { mapClickBound = true; c.on("click", p => { const cc = (p.data && p.data.code) || GEO2ISO[p.name]; if (cc && DATA && DATA.mode !== "file") focusCountry(unify(cc)); }); }
}
$("tCountries").tBodies[0].addEventListener("click", e => {
  const tr = e.target.closest("tr[data-code]"); if (!tr || !DATA || DATA.mode === "file") return;
  focusCountry(tr.dataset.code);
});
document.querySelectorAll("#mapSeg button").forEach(b => b.addEventListener("click", () => { VIEW = b.dataset.view; if (charts.cMap) charts.cMap.clear(); renderMap(T()); }));

function hbar(id, rows, th, color, naMsg) {
  if (!rows || !rows.length) { noChart(id, naMsg || t("na.default")); return; }
  const c = chart(id); if (!c) return;
  const r = rows.slice().reverse();
  const ax = axisCommon(th);
  c.setOption({
    animationDuration: 500, grid: { left: 8, right: 56, top: 4, bottom: 4, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, ...tip(th), valueFormatter: v => fmt(v) },
    xAxis: { type: "value", show: false },
    yAxis: { type: "category", data: r.map(d => d[0]), ...ax, axisLine: { show: false },
      axisLabel: { color: th.ink, fontFamily: th.body, fontSize: 12, width: 210, overflow: "truncate" } },
    series: [{ type: "bar", data: r.map(d => d[1]), barMaxWidth: 16, itemStyle: { color, borderRadius: [0, 2, 2, 0] },
      label: { show: true, position: "right", color: th.muted, fontFamily: th.mono, fontSize: 11, formatter: p => fmt(p.value) } }]
  }, true);
}
function renderOA(th) {
  if (!DATA.oa) { $("oaBox").innerHTML = `<div class="na">${esc(t("na.oa"))}</div>`; $("kOA").textContent = "—"; return; }
  const order = ["diamond", "gold", "hybrid", "green", "bronze", "closed"];
  const colors = { diamond: th.accent2, gold: th.ochre, hybrid: th.accent, green: th.good, bronze: th.muted, closed: th.line };
  const m = new Map(DATA.oa); const sum = [...m.values()].reduce((a, b) => a + b, 0) || 1;
  $("oaBox").innerHTML = `<div class="oabar">${order.filter(k => m.get(k)).map(k => `<span title="${esc(t("oa." + k))} : ${fmt(m.get(k))}" style="width:${(m.get(k) / sum * 100).toFixed(2)}%;background:${colors[k]}"></span>`).join("")}</div>` +
    `<div class="legend" style="margin-top:10px">${order.filter(k => m.get(k)).map(k => `<span><b style="background:${colors[k]}"></b>${esc(t("oa." + k))} <span class="mono">${pct(m.get(k) / sum)}</span></span>`).join("")}</div>`;
  $("kOA").textContent = pct((sum - (m.get("closed") || 0)) / sum);
}
function renderTables() {
  const file = DATA.mode === "file";
  $("srcSources").textContent = file ? t("src.file") : "OpenAlex";
  $("srcWorks").textContent = file ? t("src.file") : "OpenAlex";
  const max = DATA.sources.length ? DATA.sources[0][1] : 1;
  $("tSources").tBodies[0].innerHTML = DATA.sources.map(([n, c], i) => `<tr><td class="rank">${i + 1}</td><td>${esc(n)}<div class="bar"><i style="width:${(c / max * 100).toFixed(1)}%"></i></div></td><td class="n">${fmt(c)}</td></tr>`).join("") || `<tr><td colspan="3" class="note">${esc(t("na.sources"))}</td></tr>`;
  $("tWorks").tBodies[0].innerHTML = DATA.works.slice(0, 50).map((w, i) => {
    const link = w.doi ? `<a href="${esc(w.doi)}" target="_blank" rel="noopener">${esc(w.title)}</a>` : esc(w.title);
    const au = w.authors.join(", ") + (w.more ? t("w.more", { n: w.more }) : "");
    const bases = w.bases ? `<span class="pill">${esc(w.bases.join(" · "))}</span>` : "";
    return `<tr><td class="rank">${i + 1}</td><td class="w-title">${link}${w.isOa ? `<span class="pill oa">${esc(t("w.oa"))}</span>` : ""}${bases}<div class="w-meta">${esc(au)}${w.source ? " · <i>" + esc(w.source) + "</i>" : ""}</div></td><td class="n">${w.year ?? "—"}</td><td class="n">${fmt(w.cites)}</td></tr>`;
  }).join("") || `<tr><td colspan="4" class="note">${esc(t("na.works"))}</td></tr>`;
}
function renderKPIs() {
  const file = DATA.mode === "file";
  $("scope").innerHTML = file ? t("scope.file", { name: esc(labelMain()) })
    : t("scope.live", { a: esc(describe(DATA.main)), cmp: DATA.cmp ? t("scope.cmp", { b: esc(describe(DATA.cmp)) }) : "", y1: DATA.range[0], y2: DATA.range[1] });
  $("kPubs").textContent = fmt(DATA.total);
  $("kPubsS").textContent = `${DATA.range[0]}–${DATA.range[1]}`;
  const hi = hIndex(DATA.works);
  $("kH").textContent = (hi.capped ? "≥ " : "") + hi.h;
  $("kHS").textContent = file ? t("k.g", { g: hi.g }) : t("k.hCorpus");
  $("kCit").textContent = fmt(DATA.works.reduce((a, w) => a + w.cites, 0));
  $("kCitS").textContent = file ? t("k.citFile") : (DATA.total > 200 ? t("k.citTop") : t("k.citAll"));
  const box = $("kRankBox");
  if (DATA.selected.length === 1 && DATA.world) {
    const list = DATA.world.list, cc = DATA.selected[0], idx = list.findIndex(r => r[0] === cc);
    box.classList.add("is-rank"); $("kRankK").textContent = t("k.rank");
    $("kRank").innerHTML = idx >= 0 ? ordinal(idx + 1) : "—";
    $("kRankS").textContent = idx >= 0 && DATA.world.total ? t("k.rankShare", { p: pct(list[idx][1] / DATA.world.total) }) : t("k.rankOf", { n: list.length });
  } else if (DATA.selected.length > 1 && DATA.world) {
    box.classList.add("is-rank"); $("kRankK").textContent = t("k.worldShare");
    $("kRank").textContent = DATA.world.total ? pct(DATA.total / DATA.world.total) : "—";
    $("kRankS").textContent = t("k.worldShareS");
  } else {
    box.classList.remove("is-rank"); $("kRankK").textContent = t("k.countries");
    $("kRank").textContent = DATA.countries ? fmt(DATA.countries.length) : "—";
    $("kRankS").textContent = DATA.countries ? t("k.countriesS") : t("k.noAffil");
  }
}
function renderMetrics() {
  const p = $("metricsPanel");
  if (DATA.mode !== "file") { p.hidden = true; return; }
  p.hidden = false;
  const hi = hIndex(DATA.works), cites = DATA.works.reduce((a, w) => a + w.cites, 0);
  const span = Math.max(1, CUR_YEAR - DATA.range[0] + 1), cited = DATA.works.filter(w => w.cites > 0).length;
  const items = [
    [t("mt.h"), hi.h, t("mt.hS")], [t("mt.g"), hi.g, t("mt.gS")],
    [t("mt.m"), fmt1(hi.h / span), t("mt.mS", { n: span, y: DATA.range[0] })],
    [t("mt.cpp"), fmt1(cites / (DATA.total || 1)), t("mt.cppS")], [t("mt.cpy"), fmt(cites / span), t("mt.cpyS")],
    [t("mt.cited"), pct(cited / (DATA.total || 1)), t("mt.citedS", { a: fmt(cited), b: fmt(DATA.total) })],
    [t("mt.apa"), fmt1(DATA.authorsAvg), t("mt.apaS")],
    [t("mt.intl"), DATA.intl != null ? pct(DATA.intl / (DATA.total || 1)) : "—", t("mt.intlS")]
  ];
  $("metrics").innerHTML = items.map(([k, v, s]) => `<div><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span><span class="s">${esc(s)}</span></div>`).join("");
}
function renderAll() {
  if (!DATA) return;
  const th = T(), file = DATA.mode === "file";
  $("srcYears").textContent = file ? t("src.file") : "OpenAlex";
  $("yearsNote").hidden = DATA.range[1] !== CUR_YEAR;
  $("instNote").hidden = !DATA.selected.length;
  $("instPanel").hidden = file; $("fieldsPanel").hidden = file;
  $("srcOA").textContent = file ? t("src.file") : "OpenAlex · Unpaywall";
  renderMerge(); renderKPIs(); renderMetrics(); renderYears(th); renderMap(th);
  if (!file) { hbar("cInst", DATA.inst, th, th.accent, t("na.inst")); hbar("cFields", DATA.fields, th, th.accent2, t("na.fields")); }
  renderTables(); renderOA(th);
  renderNet("pub");
}

/* ---------- pays sélectionnés (puces) ---------- */
function makeChips(boxId, inputId, getList, setList, opts) {
  const nameOf = (opts && opts.name) || cname, resolve = (opts && opts.resolve) || resolveCountryInput;
  const phEmpty = (opts && opts.ph) || "ph.country";
  const draw = () => {
    const box = $(boxId), input = $(inputId);
    box.querySelectorAll(".chip").forEach(n => n.remove());
    getList().forEach(c => {
      const el = document.createElement("span"); el.className = "chip";
      el.innerHTML = `${esc(nameOf(c))}<button type="button" aria-label="${esc(t("imp.remove"))} ${esc(nameOf(c))}">×</button>`;
      el.querySelector("button").addEventListener("click", () => { setList(getList().filter(x => x !== c)); draw(); });
      box.insertBefore(el, input);
    });
    input.placeholder = getList().length ? t("ph.countryMore") : t(phEmpty);
  };
  const add = () => {
    const c = resolve($(inputId).value); if (!c) return false;
    const u = unify(c); if (!getList().includes(u)) setList([...getList(), u]);
    $(inputId).value = ""; draw(); return true;
  };
  $(inputId).addEventListener("change", add);
  $(inputId).addEventListener("keydown", e => {
    if (e.key === "Enter" && $(inputId).value.trim()) { e.preventDefault(); if (!add()) setStatus("err", t("err.country")); }
    if (e.key === "Backspace" && !$(inputId).value && getList().length) { setList(getList().slice(0, -1)); draw(); }
  });
  $(boxId).addEventListener("click", e => { if (e.target === $(boxId)) $(inputId).focus(); });
  return { draw, add };
}
const pubChips = makeChips("chips", "cInput", () => SELECTED, v => { SELECTED = v; });
function focusCountry(cc) {
  if (SELECTED.length === 1 && SELECTED[0] === cc) return;
  SELECTED = [cc]; VIEW = "world"; pubChips.draw(); run();
}

/* ---------- recherche en direct ---------- */
function state() {
  let y1 = parseInt($("y1").value, 10) || 2005, y2 = parseInt($("y2").value, 10) || CUR_YEAR;
  y2 = Math.min(Math.max(y2, 1900), CUR_YEAR); y1 = Math.min(Math.max(y1, 1900), y2);
  const c2 = resolveCountryInput($("c2").value);
  return { q: $("q").value.trim(), q2: $("q2").value.trim(), countries: SELECTED.slice(), c2: c2 ? unify(c2) : "", y1, y2, type: $("type").value, oa: $("oaOnly").checked };
}
async function run(force) {
  if (MODE !== "live") return;
  if ($("cInput").value.trim()) pubChips.add();
  const s = state();
  if ($("c2").value.trim() && !s.c2) { setStatus("err", t("err.c2")); return; }
  store.set("last", JSON.stringify(s));
  const my = ++inflight;
  $("go").disabled = true; $("grid").classList.add("loading");
  setStatus("", t("st.querying"));
  let demo = false, err = null;
  try {
    setProgress(-1); pubBusy(true);
    const [d] = await Promise.allSettled([fetchLive(s, force)]);
    if (my !== inflight || MODE !== "live") return;
    if (d.status === "fulfilled") {
      DATA = d.value; PAT = null;
    } else {
      if (d.reason && d.reason.fatal) throw d.reason;
      const ex = demoData(s); DATA = ex.d; PAT = ex.pat; demo = true;
    }
    $("demoBanner").hidden = !demo; $("fileBanner").hidden = true;
    renderAll();
    $("updated").textContent = now();
    if (demo) setStatus("demo", t("st.demo"));
    else setStatus("live", t("st.live"));
    if (!demo) checkBudget();
  } catch (e) { setStatus("err", e.message); }
  finally { if (my === inflight) { $("go").disabled = false; $("grid").classList.remove("loading"); setProgress(null); pubBusy(false); } }
}
async function checkBudget() {
  $("budget").textContent = "";
  const via = cfg.viaWorker && cfg.worker;
  if (!via && !cfg.key) { $("budget").textContent = t("bud.none"); return; }
  if (via) $("budget").textContent = t("bud.proxy");
  try {
    const r = await fetch(via ? cfg.worker + "/openalex/rate-limit" : "https://api.openalex.org/rate-limit?api_key=" + encodeURIComponent(cfg.key));
    if (!r.ok) return;
    const j = await r.json(); const rl = j.rate_limit || {};
    if (rl.daily_remaining_usd != null) $("budget").innerHTML = t("bud.left", { v: Number(rl.daily_remaining_usd).toFixed(3) });
  } catch {}
}

/* ======================================================================
   ONGLET BREVETS
   ====================================================================== */
const normCode = s => String(s || "").toUpperCase().replace(/\s+/g, "");
const CLSMAP = new Map(CLS.map(r => [normCode(r[0]), r]));
function clsLabel(sym) {
  const s = normCode(sym);
  for (let k = s.length; k >= 1; k--) { const r = CLSMAP.get(s.slice(0, k)); if (r) return LANG === "fr" ? r[1] : r[2]; }
  return "";
}
const rollup = (sym, level) => { const s = normCode(sym); if (level === "subclass") return s.slice(0, 4); if (level === "group") return s.split("/")[0]; return s; };
const officeName = c => (I18N[LANG]["off." + c] || I18N.fr["off." + c]) ? t("off." + c) : cname(c);
let PSEL = [], PDATA = null, PVIEW = "applicant", PLEVEL = "subclass", pinflight = 0, LAST_PROWS = [], pMapBound = false, pCodesBound = false;
/* Juridictions : pays + offices régionaux et internationaux */
const REGIONAL = ["EP", "WO", "EA", "AP", "OA", "GC"];
function resolveOffice(v) {
  const s = String(v || "").trim(); if (!s) return null;
  const up = s.toUpperCase();
  if (REGIONAL.includes(up)) return up;
  const n = norm(s);
  for (const c of REGIONAL) for (const l of ["fr", "en"]) { const name = I18N[l]["off." + c]; if (name && norm(name) === n) return c; }
  if (/(office europeen|european patent|^oeb$|^epo$)/.test(n)) return "EP";
  if (/(ompi|wipo|pct)/.test(n)) return "WO";
  return resolveCountryInput(s);
}
const patChips = makeChips("pchips", "pcInput", () => PSEL, v => { PSEL = v; }, { name: c => officeName(c), resolve: resolveOffice, ph: "ph.juris" });

function pstate() {
  let y1 = parseInt($("py1").value, 10) || 2005, y2 = parseInt($("py2").value, 10) || CUR_YEAR;
  y2 = Math.min(Math.max(y2, 1900), CUR_YEAR); y1 = Math.min(Math.max(y1, 1900), y2);
  const raw = $("pcls").value.split(/[,;]+/).map(normCode).filter(Boolean);
  const codes = raw.filter(c => /^[A-HY](\d{1,2}([A-Z](\d{1,4}(\/\d{1,6})?)?)?)?$/.test(c));
  return { q: $("pq").value.trim(), applicant: $("pap").value.trim(), codes, bad: raw.filter(c => !codes.includes(c)), clsType: $("pclsType").value, countries: PSEL.slice(), y1, y2 };
}
function patURL(ps, extra) {
  const u = new URL(cfg.worker + "/patents");
  u.searchParams.set("q", ps.q); u.searchParams.set("from", ps.y1); u.searchParams.set("to", ps.y2); u.searchParams.set("detail", "1");
  if (ps.applicant) u.searchParams.set("applicant", ps.applicant);
  if (ps.codes.length) { u.searchParams.set("cls", ps.codes.join(",")); u.searchParams.set("clsType", ps.clsType); }
  if (ps.countries.length) u.searchParams.set("juris", expand(ps.countries).join(","));
  Object.entries(extra || {}).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}
async function patCall(url) {
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || t("err.http", { src: "Proxy", code: r.status }));
  return j;
}
/* L'OEB accepte environ 30 recherches par minute : le site en demande au plus 25 nouvelles par minute,
   par lots, et le proxy garde chaque comptage en cache. Les données s'affichent au fur et à mesure. */
let OPS_RATE = 25;
let opsWin = { t0: 0, used: 0 };
function opsBudget() { const n = Date.now(); if (n - opsWin.t0 > 60000) opsWin = { t0: n, used: 0 }; return Math.max(0, OPS_RATE - opsWin.used); }
/* L'OEB annonce son état dans chaque réponse, ex. « busy (… search=green:15) » : le site suit ce rythme. */
function opsAdapt(throttle) {
  const m = /search=(\w+):(\d+)/.exec(throttle || ""); if (!m) return;
  const color = m[1], n = parseInt(m[2], 10);
  const factor = color === "green" ? 1 : color === "yellow" ? 0.6 : color === "red" ? 0.3 : 0;
  OPS_RATE = Math.max(3, Math.min(25, Math.floor(n * factor) - 1));   // « black » : pause d'une minute ci-dessous, puis reprise lente
  if (color === "black") opsWin = { t0: Date.now(), used: 999 };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function fetchPat(ps, isCurrent, onPartial) {
  const years = new Map(), offices = new Map(), warnings = new Set();
  let queue = [{ part: "years" }, { part: "sample" }], range = null, first = true, rounds = 0, info = null, sampleRecs = null;
  let total = (ps.y2 - Math.max(ps.y1, ps.y2 - 19) + 1) + 1 + (ps.countries.length ? expand(ps.countries).length : 100);
  const snapshot = complete => {
    const by = [...years.entries()].filter(e => e[1] != null).sort((a, b) => a[0] - b[0]);
    const ss = sampleRecs ? sampleStats(sampleRecs.map(r => ({ ...r, live: true })), ps) : { byApplicantCountry: null, byOrigin: null, topApplicants: [], topCodes: null, legal: null, top: null, records: null, sampleN: 0 };
    return { source: "epo", unit: t("unit.epo"), range, byYear: by, total: by.reduce((a, e) => a + e[1], 0),
      byOffice: [...offices.entries()].filter(e => e[1] != null), byProtection: null, ...ss, legal: null, sampleLoading: !sampleRecs,
      warnings: [...warnings], complete, done: years.size + offices.size + (sampleRecs ? 1 : 0), expected: total,
      yearsDone: !queue.some(q => q.part === "years"), officesDone: !queue.some(q => q.part === "offices"),
      officesN: offices.size, officesExpected: total - (range ? range[1] - range[0] + 1 : 0) - 1, officesZero: [...offices.values()].filter(n => n === 0).length };
  };
  while (queue.length && rounds < 60) {
    if (!isCurrent()) return null;
    let budget = opsBudget();
    if (budget <= 0) {
      const s = Math.ceil((60000 - (Date.now() - opsWin.t0)) / 1000);
      onPartial(snapshot(false), s);
      await sleep(Math.max(1, s) * 1000); continue;
    }
    const job = queue[0];
    const j = await patCall(patURL(ps, { part: job.part, max: Math.min(10, budget), ...(job.offices ? { offices: job.offices.join(",") } : {}) }));
    if (j.source !== "epo") return j;                // Lens : réponse complète en un appel
    info = j; rounds++;
    opsWin.used += j.fetched || 0;
    opsAdapt(j.throttle);
    (j.warnings || []).forEach(w => warnings.add(w));
    if (j.part === "years") { range = j.range; (j.byYear || []).forEach(([y, n]) => years.set(y, n)); }
    else if (j.part === "sample") { if (j.sample) sampleRecs = j.sample.records || []; else if (!(j.pending || []).length) sampleRecs = []; }
    else (j.byOffice || []).forEach(([c, n]) => offices.set(c, n));
    if (first) {
      first = false;
      const list = ps.countries.length ? expand(ps.countries) : (j.worldOffices || []);
      for (let i = 0; i < list.length; i += 15) queue.push({ part: "offices", offices: list.slice(i, i + 15) });
      total = (j.range ? j.range[1] - j.range[0] + 1 : 0) + 1 + list.length;
    }
    if (!(j.pending || []).length) queue.shift();
    const complete = !queue.length;
    onPartial(snapshot(complete), j.retryAfter || 0);
    if (j.retryAfter && !complete) await sleep(j.retryAfter * 1000);
  }
  if (!isCurrent()) return null;
  return snapshot(!queue.length);
}
const DEMO_SYMS = ["Y02E10/549","H10K30/50","H10K85/50","H10K30/10","H01L31/0256","H10K71/12","H01G9/2009","C07F7/24","H02S40/38","B82Y30/00","H10K30/40","H01L31/18","H10K30/88","C09K11/66","H10K50/11","Y02P70/50","H01M10/0525","G06N3/08","A61K9/00","H04W72/04"];
function patDemo(ps) {
  const rnd = seeded(ps.q + ps.codes.join("") + ps.countries.join(""));
  const k = (ps.q ? 1 : 6) * (ps.codes.length ? 0.6 : 1) * (ps.countries.length ? 0.08 : 1);
  const byYear = [];
  for (let y = ps.y1; y <= ps.y2; y++) {
    const x = (y - ps.y1) / Math.max(1, ps.y2 - ps.y1);
    let v = k * 2600 / (1 + Math.exp(-8 * (x - 0.62))) * (0.88 + rnd() * 0.24);
    if (y === CUR_YEAR) v *= 0.55; else if (y === CUR_YEAR - 1) v *= 0.82;
    byYear.push([y, Math.round(v + 3)]);
  }
  const total = byYear.reduce((a, d) => a + d[1], 0);
  const share = list => list.map(([c, w]) => [c, Math.round(total * w * (0.85 + rnd() * 0.3))]).sort((a, b) => b[1] - a[1]);
  const byOffice = share([["CN",.48],["US",.12],["WO",.11],["KR",.08],["JP",.07],["EP",.05],["DE",.015],["IN",.015],["GB",.008],["FR",.007],["CA",.007],["AU",.006],["TW",.006],["BR",.003],["ES",.002],["MA",.0008]]);
  let byApplicantCountry = share([["CN",.5],["US",.11],["JP",.08],["KR",.08],["DE",.03],["GB",.015],["CH",.015],["FR",.012],["CA",.01],["NL",.009],["TW",.009],["IN",.008],["SA",.006],["SE",.005],["IT",.005],["AU",.005],["ES",.004],["SG",.004],["IL",.003],["BR",.002],["MA",.001],["EG",.001]]);
  if (ps.countries.length) byApplicantCountry = ps.countries.map(c => [c, Math.round(total / ps.countries.length)]);
  let syms = DEMO_SYMS;
  if (ps.codes.length) {
    const hit = DEMO_SYMS.filter(s => ps.codes.some(c => s.startsWith(c)));
    syms = hit.length ? hit : ps.codes.flatMap(c => c.includes("/") ? [c, c + "1", c + "2", c + "4"] : c.length >= 4 ? ["10/00","30/10","30/50","50/80","71/12","85/50"].map(g => c.slice(0, 4) + (c.length > 4 ? c.slice(4) : g.split("/")[0]) + "/" + g.split("/")[1]) : DEMO_SYMS);
  }
  const topCodes = syms.map((sym, i) => [sym, Math.round(total * 0.4 / (1 + i * 0.35) * (0.8 + rnd() * 0.4))]).sort((a, b) => b[1] - a[1]);
  const legal = [["ACTIVE",.36],["PENDING",.24],["INACTIVE",.22],["EXPIRED",.09],["DISCONTINUED",.09]].map(([c, w]) => [c, Math.round(total * w)]);
  const topApplicants = Array.from({ length: 12 }, (_, i) => [t("ex.applicant", { x: L(i) }), Math.round(total * 0.03 / (1 + i * 0.3))]);
  const top = Array.from({ length: 20 }, (_, i) => ({ title: t("ex.patent", { n: i + 1 }), number: "XX" + (1000000 + Math.floor(rnd() * 8999999)) + "A1",
    date: `${ps.y1 + Math.floor(rnd() * (ps.y2 - ps.y1 + 1))}-0${1 + Math.floor(rnd() * 9)}-15`, applicants: [t("ex.applicant", { x: L(i % 12) })], cites: Math.round(600 / Math.pow(i + 1, 0.7)), url: null }));
  return { source: "demo", unit: t("unit.demo"), total, byYear, byOffice, byApplicantCountry, topApplicants, topCodes, legal, top, warnings: [] };
}
/* Dernières réponses du serveur brevets, gardées dans ce navigateur pour le cas où il ne répond plus */
const PCACHE_KEY = "patcache";
const pKey = ps => JSON.stringify([ps.q.toLowerCase(), (ps.applicant || "").toLowerCase(), ps.codes, ps.clsType, ps.countries || [], ps.y1, ps.y2]);
function pCacheRead() { try { return JSON.parse(store.get(PCACHE_KEY, "null")) || { entries: {}, last: null }; } catch { return { entries: {}, last: null }; } }
function pCacheSave(ps, d) {
  const c = pCacheRead(), k = pKey(ps);
  c.entries[k] = { t: Date.now(), ps, d }; c.last = k;
  const keys = Object.keys(c.entries).sort((a, b) => c.entries[b].t - c.entries[a].t);
  keys.slice(12).forEach(x => delete c.entries[x]);
  store.set(PCACHE_KEY, JSON.stringify(c));
}
function pCacheFind(ps) { const c = pCacheRead(); return c.entries[pKey(ps)] || (c.last && c.entries[c.last]) || null; }
const pWhat = ps => [ps.q ? t("d.q", { q: ps.q }) : "", ps.codes.length ? `${ps.clsType === "ipc" ? t("opt.ipc") : "CPC"} ${ps.codes.join(", ")}` : "",
  ps.applicant ? t("p.applicant", { a: ps.applicant }) : ""].filter(Boolean).join(" + ") || t("p.allTech");
let PSRC = null; // "api" | "sample" | "file"
function patSource() {
  if (PSRC === "sample" && SAMPLE_RECS.length) return "sample";
  if (cfg.worker) return "api";
  return SAMPLE_RECS.length ? "sample" : "demo";
}
function syncPatButtons() {
  const src = patSource();
  $("pSample").hidden = src === "sample" || !SAMPLE_RECS.length;
  $("pLive").hidden = src === "api" || !cfg.worker;
}
async function runPat() {
  if (MODE !== "pat") return;
  if ($("pcInput").value.trim()) patChips.add();
  const ps0 = pstate();
  if (ps0.bad.length) { setStatus("err", t("err.cls", { codes: ps0.bad.join(", ") })); return; }
  store.set("plast", JSON.stringify(ps0));
  const my = ++pinflight;
  $("pgo").disabled = true; $("pgrid").classList.add("loading");
  setStatus("", t("st.patQuerying"));
  const src = patSource(); syncPatButtons();
  if (src === "api") { setProgress(-1); patBusyAll(); }
  try {
    let d, kind, ps = ps0, offline = null;
    if (src === "sample") { d = analyzePatents(SAMPLE_RECS, ps); kind = "sample"; }
    else if (src === "demo") { d = patDemo(ps); kind = "demo"; }
    else {
      const latest = false;
      try {
        const psNow = ps;
        d = await fetchPat(ps, () => my === pinflight && MODE === "pat", (part, wait) => {
          PDATA = { ...part, ps: psNow, kind: "api", loading: !part.complete, offline: null };
          $("pgo").disabled = false; $("pgrid").classList.remove("loading");   // une nouvelle recherche reste possible pendant le chargement
          const views = availableViews(PDATA); if (!views.includes(PVIEW)) PVIEW = views[0] || "office";
          renderPat();
          setStatus("", t("pload.progress", { a: fmt(part.done), b: fmt(part.expected) }) + (wait ? t("pload.wait", { s: wait }) : "") + t("pload.cachedNote"));
          setProgress(part.expected ? part.done / part.expected : -1);
        });
        if (!d) return;
        kind = "api";
        if (d.complete !== false) pCacheSave(ps, d);
        else d.warnings = [t("pload.partial", { a: fmt(d.done), b: fmt(d.expected) }), ...(d.warnings || [])];
        if (latest) d.warnings = [t("pwarn.latest", { y: ps.y2 }) + (ps.y2 === CUR_YEAR ? t("pwarn.latestPart") : ""), ...(d.warnings || [])];
      } catch (err) {
        const hit = pCacheFind(ps);
        offline = { msg: err && err.message ? err.message : String(err), hit };
        if (hit) { d = hit.d; ps = { ...ps, ...hit.ps, bad: [] }; kind = "cached"; }
        else { d = { source: "epo", total: 0, byYear: [], byOffice: [], byApplicantCountry: null, topApplicants: [], topCodes: null, legal: null, top: null, warnings: [] }; kind = "offline"; }
      }
    }
    if (my !== pinflight || MODE !== "pat") return;
    PDATA = { ...d, ps, kind, demo: kind === "demo", offline };
    const views = availableViews(PDATA);
    if (!views.includes(PVIEW)) PVIEW = views[0] || "office";
    renderPat();
    $("updated").textContent = kind === "cached" ? new Date(offline.hit.t).toLocaleString(LOC(), { dateStyle: "short", timeStyle: "short" }) : now();
    const warn = d.warnings && d.warnings.length ? " · " + d.warnings[0] : "";
    if (kind === "demo") setStatus("demo", t("st.patDemo"));
    else if (kind === "api") setStatus("live", t("st.patLive", { src: d.source === "lens" ? "Lens.org" : t("src.epo") }) + warn);
    else if (kind === "cached") setStatus("err", t("st.patCached", { date: new Date(offline.hit.t).toLocaleString(LOC(), { dateStyle: "short", timeStyle: "short" }) }));
    else if (kind === "offline") setStatus("err", t("st.patOffline"));
    else setStatus("live", t("st.patSample", { n: fmt(d.total) }) + warn);
  } catch (e) { setStatus("err", e.message); }
  finally { if (my === pinflight) { $("pgo").disabled = false; $("pgrid").classList.remove("loading"); setProgress(null); if (!PDATA || !PDATA.loading) patBusyClear(); } }
}
const PAT_PANELS = ["pYearsPanel", "pMapPanel", "patNetPanel", "pCodesPanel", "pAppPanel", "officesPanel", "pTopPanel"];
function patBusyAll() { PAT_PANELS.forEach(id => busy(id, t("ld.loading"))); }
function patBusyClear() { PAT_PANELS.forEach(id => busy(id, null)); }
function patBusyFrom(d) {
  if (!d || d.kind !== "api" || !d.loading) { patBusyClear(); return; }
  busy("pYearsPanel", d.yearsDone ? null : t("ld.loading"));
  const offL = d.officesDone ? null : t("ld.offices", { a: fmt(d.officesN || 0), b: fmt(d.officesExpected || 0) });
  busy("pMapPanel", offL); busy("officesPanel", offL);
  const sL = d.sampleLoading ? t("ld.sample") : null;
  ["patNetPanel", "pCodesPanel", "pAppPanel", "pTopPanel"].forEach(id => busy(id, sL));
}
function renderPat() {
  const d = PDATA; if (!d) return;
  const th = T(), ps = d.ps;
  patBusyFrom(d);
  const srcName = d.source === "lens" ? t("src.lens") : d.source === "epo" ? t("src.epo") : d.source === "sample" ? t("src.sample") : t("src.demo");
  ["pSrc1", "pSrc2", "pSrc3"].forEach(id => $(id).textContent = srcName);
  const banner = $("pDemoBanner");
  banner.classList.toggle("info", d.kind === "sample");
  banner.classList.toggle("err", d.kind === "cached" || d.kind === "offline");
  if (d.kind === "cached" || d.kind === "offline") {
    const h = d.offline.hit;
    banner.innerHTML = (h ? t("poff.cached", { what: esc(pWhat(h.ps)) + " · " + h.ps.y1 + (h.ps.y2 !== h.ps.y1 ? "–" + h.ps.y2 : ""), date: esc(new Date(h.t).toLocaleString(LOC(), { dateStyle: "long", timeStyle: "short" })) }) : t("poff.none"))
      + `<span class="note">${esc(t("poff.detail", { msg: d.offline.msg }))}</span> <button class="go" type="button" id="pRetry">${esc(t("poff.retry"))}</button>`;
    $("pRetry").addEventListener("click", () => runPat());
  }
  else if (d.kind === "demo") banner.innerHTML = t("pdemo.banner");
  else if (d.kind === "sample") { const m = SAMPLE.meta || {}; banner.innerHTML = t("pfile.sample", { n: fmt(SAMPLE_RECS.length), q: esc(m.query || ""), total: fmt(m.total) }); }
  banner.hidden = d.kind === "api";
  syncPatButtons();
  $("pSetup").hidden = !!cfg.worker;
  const what = pWhat(ps);
  $("pscope").innerHTML = t("pscope", { what: esc(what), where: esc(ps.countries.length ? t("p.juris", { c: ps.countries.map(officeName).join(" + ") }) : t("pp.world")), y1: ps.y1, y2: ps.y2 }).replace(/(\d{4})–\1/, "$1");
  $("pTot").textContent = fmt(d.total); $("pTotS").textContent = d.source === "demo" ? t("unit.demo") : (d.unit || t("pk.period"));
  const ym = new Map(d.byYear), last = CUR_YEAR - 2;
  const sumR = (a, b) => { let s = 0; for (let y = a; y <= b; y++) s += ym.get(y) || 0; return s; };
  const recent = sumR(last - 4, last), before = sumR(last - 9, last - 5);
  $("pGrowth").textContent = before > 0 && last - 9 >= ps.y1 ? (recent >= before ? "+" : "") + pct((recent - before) / before) : "—";
  $("pGrowthS").textContent = t("pk.growthS", { a: `${last - 4}–${last}`, b: `${last - 9}–${last - 5}` });
  if (d.byApplicantCountry) { $("pCtry").textContent = fmt(d.byApplicantCountry.length); $("pCtryS").textContent = d.sampleN ? t("pk.ctrySample", { n: fmt(d.sampleN) }) : t("pk.ctryS"); }
  else if (d.byOrigin) { $("pCtry").textContent = fmt(d.byOrigin.filter(r => ISO.includes(r[0])).length); $("pCtryS").textContent = t("pk.prioS"); }
  else { $("pCtry").textContent = "—"; $("pCtryS").textContent = d.sampleLoading ? t("pp.codesWait") : t("pk.ctryS"); }
  const offs = (d.byOffice || []).filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]);
  $("pOff").textContent = fmt(offs.length); $("pOffS").textContent = offs.length ? t("pk.offFirst", { o: officeName(offs[0][0]) }) : t("pk.offS");
  const ap = d.topApplicants || [];
  $("pTopApp").textContent = ap.length ? ap[0][0] : "—";
  $("pTopAppS").textContent = ap.length ? t("pk.topS", { n: fmt(ap[0][1]) }) + (d.source === "epo" ? " · " + t("pk.inSample", { n: fmt(d.sampleN) }) : "") : (d.sampleLoading ? t("pp.codesWait") : "");
  const hasLegal = !!(d.legal && d.legal.length && d.legal.some(r => r[0]));
  if (hasLegal) {
    const tot = d.legal.reduce((a, r) => a + r[1], 0) || 1;
    const act = d.legal.filter(r => ["ACTIVE", "PENDING", "PATENTED"].includes(String(r[0]).toUpperCase())).reduce((a, r) => a + r[1], 0);
    $("pActiveK").textContent = t("pk.active"); $("pActive").textContent = pct(act / tot); $("pActiveS").textContent = t("pk.activeS");
  } else {
    const nApp = d.records ? new Set(d.records.flatMap(r => r.ap || [])).size : 0;
    $("pActiveK").textContent = t("pk.distinctApp"); $("pActive").textContent = d.records ? fmt(nApp) : "—";
    $("pActiveS").textContent = d.records && d.records.length ? t("pk.inSample", { n: fmt(d.sampleN || d.records.length) }) : (d.sampleLoading ? t("pp.codesWait") : t("ld.noSample"));
    if (d.records && !d.records.length) $("pActive").textContent = "—";
  }
  $("legalPanel").hidden = !hasLegal;
  $("officesPanel").classList.toggle("wide", !hasLegal);

  const c1 = chart("cPYears"), ax = axisCommon(th);
  if (c1) {
    const rg = d.range || [ps.y1, ps.y2];
    const ys = []; for (let y = rg[0]; y <= rg[1]; y++) ys.push(y);
    c1.setOption({
      animationDuration: 500, grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: { trigger: "axis", ...tip(th), valueFormatter: v => fmt(v) },
      xAxis: { type: "category", data: ys, ...ax, splitLine: { show: false } },
      yAxis: { type: "value", ...ax, axisLine: { show: false }, axisLabel: { ...ax.axisLabel, formatter: v => fmt(v) } },
      series: [{ name: t("ser.patents"), type: "bar", barMaxWidth: 26, data: ys.map(y => ({ value: ym.get(y) || 0, itemStyle: { color: th.ochre, opacity: y >= CUR_YEAR - 1 ? 0.4 : 1, borderRadius: [2, 2, 0, 0] } })) }]
    }, true);
  }
  renderPMap(th);
  $("pCodesTitle").textContent = t("pp.codes", { s: ps.clsType === "ipc" ? t("opt.ipc") : "CPC" });
  document.querySelectorAll("#pLevelSeg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.level === PLEVEL)));
  if (d.topCodes && d.topCodes.length) {
    const m = new Map();
    d.topCodes.forEach(([sym, n]) => { const k = rollup(sym, PLEVEL); m.set(k, (m.get(k) || 0) + n); });
    const rows = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    hbar("cPCodes", rows.map(([c, n]) => [c + (clsLabel(c) ? " · " + clsLabel(c) : ""), n]), th, th.ochre);
    const cc = charts.cPCodes;
    if (cc && !pCodesBound) { pCodesBound = true; cc.on("click", p => { const cd = String(p.name).split(" · ")[0]; if (cd) { $("pcls").value = cd; runPat(); } }); }
  } else { pCodesBound = false; noChart("cPCodes", d.sampleLoading ? t("pp.codesWait") : t("pp.codesNA")); }
  $("tPApplicants").tBodies[0].innerHTML = ap.length ? ap.slice(0, 20).map(([n, c], i) => `<tr><td class="rank">${i + 1}</td><td>${esc(n)}</td><td class="n">${fmt(c)}</td></tr>`).join("")
    : `<tr><td colspan="3" class="note">${esc(d.sampleLoading ? t("pp.codesWait") : t("pp.applicantsNA"))}</td></tr>`;
  hbar("cPOffice", offs.slice(0, 12).map(([c, n]) => [officeName(c), n]), th, th.ochre, t("pp.officesNA"));
  if (hasLegal) hbar("cPLegal", (d.legal || []).slice().sort((a, b) => b[1] - a[1]).map(([c, n]) => [I18N.fr["legal." + String(c).toUpperCase()] ? t("legal." + String(c).toUpperCase()) : c, n]), th, th.accent, t("pp.legalNA"));
  const mode = d.topBy || "recent";
  const TOPT = { cites: ["pp.top", "pp.topSrc", "th.cites"], rank: ["pp.topRank", "pp.topRankSrc", "th.offices"], recent: ["pp.topRecent", "pp.topRecentSrc", "th.offices"] }[mode] || ["pp.top", "pp.topSrc", "th.cites"];
  $("pTopTitle").textContent = t(TOPT[0]); $("pTopSrc").textContent = t(TOPT[1]); $("pTopCol").textContent = t(TOPT[2]);
  $("tPTop").tBodies[0].innerHTML = d.top && d.top.length ? d.top.slice(0, 25).map((p, i) => {
    const title = p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title || t("pp.noTitle"))}</a>` : esc(p.title || t("pp.noTitle"));
    const last = mode === "cites" ? (p.cites == null ? "—" : fmt(p.cites)) : esc((p.offices || []).join(", "));
    return `<tr><td class="rank">${i + 1}</td><td class="w-title">${title}<div class="w-meta">${esc((p.applicants || []).join(", "))}</div></td><td class="mono" style="white-space:nowrap">${esc(p.number || "")}</td><td class="n">${esc((p.date || "").slice(0, 4))}</td><td class="n">${last}</td></tr>`;
  }).join("") : `<tr><td colspan="5" class="note">${esc(d.sampleLoading ? t("pp.codesWait") : t("pp.topNA"))}</td></tr>`;
  renderNet("pat");
}
function renderPMap(th) {
  const d = PDATA, sel = new Set(d.ps.countries);
  const views = availableViews(d);
  if (!views.includes(PVIEW)) PVIEW = views[0] || "office";
  document.querySelectorAll("#pMapSeg button").forEach(b => { b.hidden = !views.includes(b.dataset.pview); b.setAttribute("aria-pressed", String(b.dataset.pview === PVIEW)); });
  const src = { applicant: d.byApplicantCountry, origin: d.byOrigin, protection: d.byProtection, office: d.byOffice }[PVIEW] || [];
  const rows = (PVIEW === "office" ? src : mergeCounts(src)).filter(r => r[1] != null && r[1] > 0).sort((a, b) => b[1] - a[1]);
  const sampleView = d.source === "epo" && (PVIEW === "applicant" || PVIEW === "origin");
  const denom = (sampleView ? d.sampleN : d.total) || rows.reduce((a, r) => a + r[1], 0) || 1;
  const TT = { applicant: ["pp.mapApplicant", "th.country", "pp.noteApplicant"], origin: ["pp.mapOrigin", "th.country", "pp.noteOrigin"],
    protection: ["pp.mapProtection", "th.office", "pp.noteProtection"], office: ["pp.mapOffice", "th.office", "pp.noteOffice"] }[PVIEW];
  $("pMapTitle").textContent = t(TT[0]); $("pColName").textContent = t(TT[1]);
  $("pMapNote").textContent = (PVIEW === "applicant" && d.source === "epo" ? t("pp.noteApplicantSample", { n: fmt(d.sampleN) })
    : t(TT[2]) + (sampleView ? " (" + t("pk.inSample", { n: fmt(d.sampleN) }) + ")" : ""))
    + (PVIEW === "office" && d.source === "epo" && d.officesZero ? " " + t("pp.zeroOffices", { n: fmt(d.officesZero), m: fmt(d.officesN) }) + (d.ps.q ? " " + t("pp.zeroKw") : "") : "");
  const max = rows.length ? rows[0][1] : 1;
  LAST_PROWS = rows.map(r => [...r, denom]);
  $("tPCountries").tBodies[0].innerHTML = rows.length ? rows.slice(0, 80).map(([c, n], i) => `<tr data-code="${c}" class="${sel.has(c) ? "sel" : ""}"><td class="rank">${i + 1}</td><td>${esc(officeName(c))}<div class="bar"><i style="width:${(n / max * 100).toFixed(1)}%;background:var(--ochre)"></i></div></td><td class="n">${fmt(n)}</td><td class="n">${pct(n / denom)}</td></tr>`).join("")
    : `<tr><td colspan="4" class="note">${esc(t("pp.noData"))}</td></tr>`;
  const mn = mapName();
  if (!mn) { noChart("cPMap", t("map.noBase")); return; }
  const geoRows = rows.filter(([c]) => ISO.includes(c) || c === "EH");
  if (!geoRows.length) { noChart("cPMap", t("pp.noGeo")); return; }
  const c = chart("cPMap"); if (!c) return;
  const data = geoRows.map(([cc, n], i) => {
    const o = { name: geoName(cc), value: Math.log10(n + 1), raw: n, code: unify(cc), rank: i + 1 };
    if (sel.has(cc)) o.itemStyle = { borderColor: th.ink, borderWidth: 1.5 };
    if (unify(cc) === "MA") o.itemStyle = { ...(o.itemStyle || {}), borderWidth: sel.has(cc) ? 1.5 : 0 };
    return o;
  });
  if (!data.some(o => o.code === "MA")) data.push({ name: "Morocco", value: NaN, code: "MA", raw: null, itemStyle: { borderWidth: 0 } });
  const maxLog = Math.max(1, ...data.filter(o => !isNaN(o.value)).map(o => o.value));
  c.setOption({
    tooltip: { trigger: "item", ...tip(th), formatter: p => {
      const o = p.data; if (!o || !o.code) return esc(p.name);
      if (o.raw == null) return `<b>${esc(cname(o.code))}</b><br>${esc(t("tip.noPat"))}`;
      return `<b>${esc(cname(o.code))}</b> · ${ordinal(o.rank)}<br>${esc(t("tip.pats", { n: fmt(o.raw), p: pct(o.raw / denom) }))}`;
    } },
    visualMap: { min: 0, max: maxLog, left: 0, bottom: 0, orient: "horizontal", itemWidth: 10, itemHeight: 120, calculable: false,
      text: [fmt(Math.pow(10, maxLog)), "1"], textStyle: { color: th.muted, fontFamily: th.mono, fontSize: 11 },
      inRange: { color: [th.ochreSoft, th.ochre] }, outOfRange: { color: th.line } },
    series: [{ type: "map", map: mn, roam: true, scaleLimit: { min: 1, max: 8 }, top: 10, bottom: 30,
      itemStyle: { areaColor: th.line, borderColor: th.surface, borderWidth: 0.6 },
      emphasis: { label: { show: false }, itemStyle: { areaColor: th.accent } }, select: { disabled: true }, data }]
  }, true);
  if (!pMapBound) { pMapBound = true; c.on("click", p => { const cc = (p.data && p.data.code) || GEO2ISO[p.name]; if (cc) pFocusCountry(unify(cc)); }); }
}
function availableViews(d) {
  return ["applicant", "origin", "protection", "office"].filter(v => Array.isArray({ applicant: d.byApplicantCountry, origin: d.byOrigin, protection: d.byProtection, office: d.byOffice }[v]));
}
function pFocusCountry(cc) {
  if (PVIEW !== "office" && PVIEW !== "protection") return;
  if (PSEL.length === 1 && PSEL[0] === cc) return;
  PSEL = [cc]; patChips.draw(); runPat();
}
$("tPCountries").tBodies[0].addEventListener("click", e => {
  const tr = e.target.closest("tr[data-code]"); if (!tr) return;
  pFocusCountry(unify(tr.dataset.code));
});
document.querySelectorAll("#pMapSeg button").forEach(b => b.addEventListener("click", () => { if (b.disabled) return; PVIEW = b.dataset.pview; if (charts.cPMap) charts.cPMap.clear(); renderPMap(T()); }));
document.querySelectorAll("#pLevelSeg button").forEach(b => b.addEventListener("click", () => { PLEVEL = b.dataset.level; renderPat(); }));
$("pform").addEventListener("submit", e => { e.preventDefault(); runPat(); });
$("pclsType").addEventListener("change", () => runPat());

/* ======================================================================
   RÉSEAUX DE CO-OCCURRENCE (principes de VOSviewer)
   ====================================================================== */
const NET = { pub: { color: "cluster", type: null, edges: [], nodes: [] }, pat: { color: "cluster", type: null, edges: [], nodes: [] } };
function louvain(n, edges) {
  const adj = Array.from({ length: n }, () => new Map());
  let m2 = 0;
  for (const e of edges) { adj[e.s].set(e.t, (adj[e.s].get(e.t) || 0) + e.w); adj[e.t].set(e.s, (adj[e.t].get(e.s) || 0) + e.w); m2 += 2 * e.w; }
  const k = adj.map(a => { let x = 0; a.forEach(v => { x += v; }); return x; });
  const comm = Array.from({ length: n }, (_, i) => i), tot = k.slice();
  if (!m2) return comm;
  for (let pass = 0; pass < 40; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      const ci = comm[i], w = new Map();
      adj[i].forEach((v, j) => { if (j !== i) w.set(comm[j], (w.get(comm[j]) || 0) + v); });
      tot[ci] -= k[i];
      let best = ci, bestGain = (w.get(ci) || 0) - tot[ci] * k[i] / m2;
      w.forEach((wc, c) => { const g = wc - tot[c] * k[i] / m2; if (g > bestGain + 1e-12) { bestGain = g; best = c; } });
      comm[i] = best; tot[best] += k[i];
      if (best !== ci) moved = true;
    }
    if (!moved) break;
  }
  const size = new Map(); comm.forEach(c => size.set(c, (size.get(c) || 0) + 1));
  const rank = new Map([...size.entries()].sort((a, b) => b[1] - a[1]).map((x, i) => [x[0], i]));
  return comm.map(c => rank.get(c));
}
function buildNetwork(docs, field, maxNodes, maxNames) {
  const occ = new Map(), yrs = new Map(), lists = [];
  for (const d of docs) {
    let arr = d[field]; if (!arr || !arr.length) continue;
    if (maxNames && arr.length > maxNames) continue;
    arr = [...new Set(arr.map(x => String(x).trim()).filter(Boolean))];
    lists.push(arr);
    for (const x of arr) {
      occ.set(x, (occ.get(x) || 0) + 1);
      if (d.year) { const o = yrs.get(x) || [0, 0]; o[0] += d.year; o[1]++; yrs.set(x, o); }
    }
  }
  const top = [...occ.entries()].filter(e => e[1] >= 2).sort((a, b) => b[1] - a[1]).slice(0, maxNodes);
  const idx = new Map(top.map((e, i) => [e[0], i]));
  const ew = new Map();
  for (const arr of lists) {
    const sel = arr.filter(x => idx.has(x)).map(x => idx.get(x)).slice(0, 40);
    for (let a = 0; a < sel.length; a++) for (let b = a + 1; b < sel.length; b++) {
      const key = Math.min(sel[a], sel[b]) * 10000 + Math.max(sel[a], sel[b]);
      ew.set(key, (ew.get(key) || 0) + 1);
    }
  }
  let edges = [...ew.entries()].map(([key, w]) => ({ s: Math.floor(key / 10000), t: key % 10000, w })).sort((a, b) => b.w - a.w);
  /* chaque nœud garde ses liens les plus forts (comme la sélection des liens dans VOSviewer) */
  const kept = [], perNode = new Array(top.length).fill(0), K = 6, CAP = Math.max(80, top.length * 8);
  for (const e of edges) { if (kept.length >= CAP) break; if (perNode[e.s] < K || perNode[e.t] < K) { kept.push(e); perNode[e.s]++; perNode[e.t]++; } }
  edges = kept;
  const deg = new Array(top.length).fill(0);
  edges.forEach(e => { deg[e.s]++; deg[e.t]++; });
  const remap = new Map(); top.forEach((_, i) => { if (deg[i] > 0) remap.set(i, remap.size); });
  const nodes = [];
  top.forEach(([name, o], i) => { if (!remap.has(i)) return; const y = yrs.get(name); nodes.push({ name, occ: o, year: y ? y[0] / y[1] : null, links: deg[i] }); });
  edges = edges.map(e => ({ s: remap.get(e.s), t: remap.get(e.t), w: e.w }));
  const comm = louvain(nodes.length, edges);
  nodes.forEach((n, i) => { n.cluster = comm[i]; });
  return { nodes, edges, clusters: nodes.length ? Math.max(...comm) + 1 : 0 };
}
function hexMix(a, b, x) {
  const p = h => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  try { const A = p(a), B = p(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * x).toString(16).padStart(2, "0")).join(""); } catch { return a; }
}
function yearColor(y, y0, y1, th) {
  if (y == null) return th.muted;
  const x = y1 > y0 ? (y - y0) / (y1 - y0) : 0.5;
  return x < 0.5 ? hexMix(th.accent2, th.accent, x * 2) : hexMix(th.accent, th.ochre, (x - 0.5) * 2);
}
function netTypes(p) {
  if (p === "pub") {
    if (!DATA || !DATA.docs) return null;
    const docs = DATA.docs.map(d => ({ year: d.year, kw: d.kw, countries: (d.countries || []).map(cname), authors: d.authors, inst: d.inst }));
    return [["kw", t("net.kw"), 0], ["countries", t("net.countries"), 0], ["authors", t("net.authors"), 25], ["inst", t("net.inst"), 0]]
      .filter(([f]) => docs.some(d => d[f] && d[f].length > 1)).map(([f, label, max]) => ({ key: f, label, field: f, max, docs }));
  }
  if (!PDATA) return null;
  if (!PDATA.records) return [];
  const sys = PDATA.ps.clsType === "ipc" ? t("opt.ipc") : "CPC";
  const docs = PDATA.records.map(r => ({ year: r.y, cpc: [...new Set((PDATA.ps.clsType === "ipc" ? r.ipc : r.cpc).map(c => rollup(c, PLEVEL)))],
    applicants: r.ap, inventors: r.in, prio: (r.pr || []).map(officeName), apc: (r.apc || []).map(c => cname(unify(c))) }));
  return [["cpc", t("net.cpc", { s: `${sys}, ${t("lvl." + PLEVEL).toLowerCase()}` }), 0], ["applicants", t("net.applicants"), 0], ["inventors", t("net.inventors"), 25], ["apc", t("net.apc"), 0], ["prio", t("net.prio"), 0]]
    .filter(([f]) => docs.some(d => d[f] && d[f].length > 1)).map(([f, label, max]) => ({ key: f, label, field: f, max, docs }));
}
function renderNet(p) {
  const st = NET[p], panel = $(p + "NetPanel"), chartId = p + "cNet";
  const types = netTypes(p);
  if (types === null) { panel.hidden = true; return; }
  panel.hidden = false;
  document.querySelectorAll(`#${p}NetColor button`).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.color === st.color)));
  const sel = $(p + "NetType");
  sel.innerHTML = types.map(x => `<option value="${x.key}">${esc(x.label)}</option>`).join("");
  sel.disabled = !types.length;
  $(p + "NetNote").textContent = (p === "pub" ? (DATA.mode === "file" ? t("net.noteFile") : t("net.noteLive")) : t("net.notePat")) + t("net.method");
  const clear = msg => { noChart(chartId, msg); $(p + "NetStats").textContent = ""; $(p + "NetLegend").innerHTML = ""; st.nodes = []; st.edges = []; };
  if (!types.length) { clear(p === "pat" && PDATA && !PDATA.records ? (PDATA.sampleLoading ? t("pp.codesWait") : t("net.na")) : t("net.empty")); return; }
  if (!types.some(x => x.key === st.type)) st.type = types[0].key;
  sel.value = st.type;
  const ty = types.find(x => x.key === st.type);
  const net = buildNetwork(ty.docs, ty.field, Number($(p + "NetSize").value) || 60, ty.max);
  if (!net.nodes.length) { clear(t("net.empty")); return; }
  st.nodes = net.nodes; st.edges = net.edges;
  const th = T(), pal = [1, 2, 3, 4, 5, 6, 7, 8].map(i => tok("--c" + i));
  const maxOcc = Math.max(...net.nodes.map(n => n.occ)), maxW = Math.max(...net.edges.map(e => e.w));
  const ys = net.nodes.map(n => n.year).filter(Boolean), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const colorOf = n => st.color === "year" ? yearColor(n.year, y0, y1, th) : pal[n.cluster % pal.length];
  const labelCut = net.nodes.map(n => n.occ).sort((a, b) => b - a)[Math.min(net.nodes.length - 1, Math.max(12, Math.round(net.nodes.length * 0.4)))];
  const c = chart(chartId); if (!c) return;
  c.setOption({
    animationDurationUpdate: 400,
    tooltip: { ...tip(th), formatter: q => {
      if (q.dataType === "edge") return `${esc(q.data.sn)} — ${esc(q.data.tn)}<br>${esc(t("net.tipEdge", { w: fmt(q.data.value) }))}`;
      const d = q.data;
      return `<b>${esc(d.name)}</b><br>${esc(t("net.tipNode", { n: fmt(d.occ), l: d.links, y: d.year ? fmtY(d.year) : "—" }))}` + (st.color === "cluster" ? `<br>${esc(t("net.cluster", { c: d.cluster + 1 }))}` : "");
    } },
    series: [{
      type: "graph", layout: "force", roam: true, draggable: true, cursor: "pointer",
      force: { repulsion: net.nodes.length > 100 ? 110 : 180, gravity: 0.09, edgeLength: [30, 120], friction: 0.2, layoutAnimation: true },
      labelLayout: { hideOverlap: true },
      emphasis: { focus: "adjacency", lineStyle: { opacity: 0.85 } },
      blur: { itemStyle: { opacity: 0.15 }, lineStyle: { opacity: 0.05 }, label: { opacity: 0.2 } },
      data: net.nodes.map(n => ({ name: n.name, value: n.occ, occ: n.occ, links: n.links, year: n.year, cluster: n.cluster,
        symbolSize: 8 + 32 * Math.sqrt(n.occ / maxOcc),
        itemStyle: { color: colorOf(n), borderColor: th.surface, borderWidth: 1 },
        label: { show: n.occ >= labelCut, position: "right", color: th.ink, fontFamily: th.body, fontSize: Math.round(10 + 4 * Math.sqrt(n.occ / maxOcc)) } })),
      links: net.edges.map(e => ({ source: net.nodes[e.s].name, target: net.nodes[e.t].name, value: e.w, sn: net.nodes[e.s].name, tn: net.nodes[e.t].name,
        lineStyle: { width: 0.4 + 3.2 * (e.w / maxW), color: st.color === "year" ? th.muted : colorOf(net.nodes[e.s]), opacity: 0.35, curveness: 0.15 } }))
    }]
  }, true);
  $(p + "NetStats").textContent = t("net.stats", { n: net.nodes.length, e: net.edges.length, c: net.clusters });
  if (st.color === "year") {
    const mid = (y0 + y1) / 2;
    $(p + "NetLegend").innerHTML = `<span class="note">${esc(t("net.yearLegend"))}</span><span class="mono">${fmtY(y0)}</span><span class="ramp" style="background:linear-gradient(90deg,${yearColor(y0, y0, y1, th)},${yearColor(mid, y0, y1, th)},${yearColor(y1, y0, y1, th)})"></span><span class="mono">${fmtY(y1)}</span>`;
  } else {
    const groups = [];
    for (let g = 0; g < Math.min(net.clusters, 8); g++) {
      const members = net.nodes.filter(n => n.cluster === g).sort((a, b) => b.occ - a.occ);
      if (members.length) groups.push(`<span><b style="background:${pal[g % pal.length]}"></b>${esc(t("net.cluster", { c: g + 1 }))} · ${esc(members.slice(0, 2).map(m => m.name).join(", "))}${members.length > 2 ? "…" : ""}</span>`);
    }
    $(p + "NetLegend").innerHTML = `<div class="legend">${groups.join("")}</div>`;
  }
}
["pub", "pat"].forEach(p => {
  $(p + "NetType").addEventListener("change", e => { NET[p].type = e.target.value; renderNet(p); });
  $(p + "NetSize").addEventListener("change", () => renderNet(p));
  document.querySelectorAll(`#${p}NetColor button`).forEach(b => b.addEventListener("click", () => { NET[p].color = b.dataset.color; renderNet(p); }));
  $(p + "NetCopy").addEventListener("click", async e => {
    const st = NET[p]; if (!st.nodes.length) return;
    const text = csv([["source", "target", "weight", "source_cluster", "target_cluster"], ...st.edges.map(x => [st.nodes[x.s].name, st.nodes[x.t].name, x.w, st.nodes[x.s].cluster + 1, st.nodes[x.t].cluster + 1])]);
    const b = e.currentTarget, old = b.textContent;
    try { await navigator.clipboard.writeText(text); b.textContent = t("net.copied"); } catch { b.textContent = t("m.copyFail"); }
    setTimeout(() => b.textContent = old, 1600);
  });
});

/* ======================================================================
   BREVETS DEPUIS UN EXPORT LENS (échantillon intégré ou fichier importé)
   ====================================================================== */
let SAMPLE = { meta: null, records: [] };
try { SAMPLE = JSON.parse($("patSample").textContent); } catch { SAMPLE = { meta: null, records: [] }; }
const SAMPLE_RECS = SAMPLE.records || [];
function filterPatents(recs, ps) {
  const words = ntitle(ps.q).split(" ").filter(w => w.length > 1);
  return recs.filter(r => {
    if (!r.y || r.y < ps.y1 || r.y > ps.y2) return false;
    if (words.length) { const txt = r._txt || (r._txt = ntitle(r.t + " " + r.a)); if (!words.every(w => txt.includes(w))) return false; }
    if (ps.codes.length) { const list = ps.clsType === "ipc" ? r.ipc : r.cpc; if (!list.some(x => ps.codes.some(c => normCode(x).startsWith(c)))) return false; }
    if (ps.countries.length && ![r.j, ...r.fj].some(c => ps.countries.includes(unify(c)))) return false;
    if (ps.applicant) { const a = ntitle(ps.applicant); if (!r.ap.some(x => ntitle(x).includes(a))) return false; }
    return true;
  });
}
const cntBy = (f, fn) => { const m = new Map(); for (const r of f) for (const x of new Set(fn(r) || [])) if (x) m.set(x, (m.get(x) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
const patLink = r => r.id ? "https://lens.org/" + r.id : (r.k ? "https://worldwide.espacenet.com/patent/search?q=pn%3D" + encodeURIComponent(r.k) : null);
/* Indicateurs calculés sur des notices (échantillon Espacenet ou notices OEB) */
function sampleStats(f, ps) {
  const has = fn => f.some(r => { const v = fn(r); return Array.isArray(v) ? v.length : v; });
  let topBy, sorted;
  if (has(r => r.cb)) { topBy = "cites"; sorted = f.slice().sort((a, b) => b.cb - a.cb); }
  else if (has(r => r.rank) && !has(r => r.live)) { topBy = "rank"; sorted = f.slice().sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9)); }
  else { topBy = "recent"; sorted = f.slice().sort((a, b) => String(b.d).localeCompare(String(a.d))); }
  return {
    byApplicantCountry: has(r => r.apc) ? cntBy(f, r => (r.apc || []).map(unify)) : null,
    byOrigin: has(r => r.pr) ? cntBy(f, r => r.pr) : null,
    topApplicants: cntBy(f, r => r.ap).slice(0, 20),
    topCodes: cntBy(f, r => ps.clsType === "ipc" ? r.ipc : r.cpc).slice(0, 400),
    legal: has(r => r.ls) ? cntBy(f, r => [r.ls]) : null,
    top: sorted.slice(0, 25).map(r => ({ title: r.t, number: r.k, date: r.d, applicants: (r.ap || []).slice(0, 2), cites: r.cb, offices: r.fj || [], url: patLink(r) })),
    topBy, records: f, sampleN: f.length
  };
}
function analyzePatents(recs, ps) {
  const f = filterPatents(recs, ps);
  const yrs = f.map(r => r.y).filter(Boolean);
  const range = yrs.length ? [Math.max(ps.y1, Math.min(...yrs)), Math.min(ps.y2, Math.max(...yrs))] : [ps.y1, ps.y2];
  const ym = new Map(); f.forEach(r => ym.set(r.y, (ym.get(r.y) || 0) + 1));
  const byYear = []; for (let y = range[0]; y <= range[1]; y++) byYear.push([y, ym.get(y) || 0]);
  return {
    source: "sample", unit: t("unit.sample"), total: f.length, range, byYear,
    byOffice: cntBy(f, r => [r.j]), byProtection: cntBy(f, r => r.fj && r.fj.length ? r.fj : [r.j]),
    ...sampleStats(f, ps),
    warnings: ps.countries.length ? [t("pwarn.jurisFile")] : []
  };
}
$("pSample").addEventListener("click", () => { PSRC = "sample"; runPat(); });
$("pLive").addEventListener("click", () => { PSRC = "api"; runPat(); });

/* ---------- onglets ---------- */
function setMode(m) {
  MODE = m;
  $("tabLive").setAttribute("aria-selected", String(m === "live"));
  $("tabPat").setAttribute("aria-selected", String(m === "pat"));
  $("tabFile").setAttribute("aria-selected", String(m === "file"));
  $("tabAbout").setAttribute("aria-selected", String(m === "about"));
  $("liveControls").hidden = m !== "live"; $("patControls").hidden = m !== "pat"; $("importer").hidden = m !== "file";
  $("autoBox").hidden = m === "file"; $("statusBar").hidden = m === "about";
  const isCustom = m.startsWith("custom:"), cid = isCustom ? m.slice(7) : "";
  document.querySelectorAll("#tabs [data-custom]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.custom === cid)));
  if (isCustom) { $("liveControls").hidden = true; $("autoBox").hidden = true; $("statusBar").hidden = true; }
  $("pubView").hidden = m === "pat" || m === "about" || isCustom; $("patView").hidden = m !== "pat"; $("aboutView").hidden = m !== "about"; $("customView").hidden = !isCustom;
  try {
    const want = m === "about" ? "#about" : isCustom ? "#" + cid : "";
    if (want && location.hash !== want) location.hash = want.slice(1);
    else if (!want && location.hash && location.hash !== "#") history.replaceState(null, "", location.pathname + location.search);
  } catch {}
  if (isCustom) { inflight++; pinflight++; $("demoBanner").hidden = true; $("fileBanner").hidden = true; setProgress(null); renderCustom(cid); window.scrollTo(0, 0); return; }
  if (m === "about") { inflight++; pinflight++; $("demoBanner").hidden = true; $("fileBanner").hidden = true; renderAbout(); window.scrollTo(0, 0); return; }
  if (m !== "live") $("demoBanner").hidden = true;
  if (m !== "file") $("fileBanner").hidden = true;
  Object.values(charts).forEach(c => c.resize());
  if (m === "live") run();
  else if (m === "pat") { inflight++; $("go").disabled = false; $("grid").classList.remove("loading"); runPat(); }
  else {
    inflight++; pinflight++; $("go").disabled = false; $("pgo").disabled = false; $("grid").classList.remove("loading");
    if (FILES.length) { DATA = dataFromMerge(MERGE || runMerge()); PAT = null; renderFileBanner(); renderAll(); setStatus("live", t("st.fileLoaded")); }
    else { $("mergePanel").hidden = true; setStatus("", t("st.chooseFile")); }
  }
}
$("tabLive").addEventListener("click", () => setMode("live"));
$("tabPat").addEventListener("click", () => setMode("pat"));
$("tabFile").addEventListener("click", () => setMode("file"));
$("tabAbout").addEventListener("click", () => setMode("about"));
window.addEventListener("hashchange", () => {
  const h = location.hash.slice(1);
  if (h === "about" && MODE !== "about") setMode("about");
  else if (h && CUSTOM.some(x => x.id === h) && MODE !== "custom:" + h) setMode("custom:" + h);
});
function renderAbout() {
  const body = $("aboutBody");
  $("aboutToc").innerHTML = `<span class="flabel">${esc(t("about.toc"))}</span>` + [...body.querySelectorAll("section")].map(sec => {
    const h = sec.querySelector("h3"); return h ? `<button type="button" class="ghost" data-sec="${sec.id}">${esc(h.textContent)}</button>` : "";
  }).join("");
  $("aboutToc").querySelectorAll("[data-sec]").forEach(b => b.addEventListener("click", () => { const el = $(b.dataset.sec); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }));
  const a = SITE_CONFIG.about || {}, parts = [];
  if (a.name) parts.push(`<span>${esc(t("about.author"))} : <b>${esc(a.name)}</b></span>`);
  if (a.contact) parts.push(`<span>${esc(t("about.contact"))} : <span class="mono">${esc(a.contact)}</span></span>`);
  $("aboutByline").innerHTML = parts.join(""); $("aboutByline").hidden = !parts.length;
  const extra = SITE && SITE.aboutExtra ? pickLang(SITE.aboutExtra) : "";
  $("aboutExtra").hidden = !extra;
  if (extra) renderFileInto($("aboutExtra"), extra, () => MODE === "about");
}

/* ======================================================================
   PERSONNALISATION SANS TOUCHER AU CODE : site.json + dossier pages/
   ====================================================================== */
let SITE = null;
const CUSTOM = [];   // onglets ajoutés : { id, title: {fr, en}, file }
const MARKED_URL = "https://cdnjs.cloudflare.com/ajax/libs/marked/4.3.0/marked.min.js";
const pickLang = v => v == null ? "" : typeof v === "string" ? v : (v[LANG] || v.fr || v.en || "");
const BUILTIN_TABS = { live: "tabLive", patents: "tabPat", import: "tabFile", about: "tabAbout" };
async function renderFileInto(el, file, stillWanted) {
  el.innerHTML = `<p class="note">${esc(t("ld.loading"))}</p>`;
  try {
    const r = await fetch(file, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    let html = await r.text();
    if (/\.(md|markdown|txt)$/i.test(file)) {
      if (!window.marked) await loadScript(MARKED_URL);
      html = window.marked.parse(html);
    }
    if (stillWanted && !stillWanted()) return;
    el.innerHTML = html;
    // les codes embed qui contiennent un <script> (Twitter, Flourish…) doivent être réactivés
    el.querySelectorAll("script").forEach(old => {
      const sc = document.createElement("script");
      [...old.attributes].forEach(a => sc.setAttribute(a.name, a.value));
      sc.textContent = old.textContent; old.replaceWith(sc);
    });
    el.querySelectorAll("a[href^='http']").forEach(a => { a.target = "_blank"; a.rel = "noopener"; });
  } catch (e) {
    el.innerHTML = `<div class="banner err">${esc(t("custom.err", { file, msg: e.message }))}</div>`;
  }
}
function renderCustom(id) {
  const tab = CUSTOM.find(x => x.id === id); if (!tab) return;
  renderFileInto($("customBody"), pickLang(tab.file), () => MODE === "custom:" + id);
}
function drawCustomTabs() {
  document.querySelectorAll("#tabs [data-custom]").forEach(b => { const tab = CUSTOM.find(x => x.id === b.dataset.custom); if (tab) b.textContent = pickLang(tab.title) || tab.id; });
}
async function loadSite() {
  let r;
  try { r = await fetch("site.json", { cache: "no-store" }); } catch { return; }   // aperçu ou fichier ouvert en local : rien à faire
  if (!r.ok) return;
  let j;
  try { j = JSON.parse(await r.text()); }
  catch (e) { $("siteBanner").innerHTML = t("site.err", { msg: esc(e.message) }); $("siteBanner").hidden = false; return; }
  SITE = j;
  if (j.about) SITE_CONFIG.about = { ...(SITE_CONFIG.about || {}), ...j.about };
  if (j.texts) ["fr", "en"].forEach(l => Object.assign(I18N[l], (j.texts && j.texts[l]) || {}));
  (j.hideTabs || []).forEach(name => { const b = $(BUILTIN_TABS[name]); if (b) b.hidden = true; });
  const aboutBtn = $("tabAbout");
  (j.tabs || []).forEach(tab => {
    if (!tab || !tab.id || !tab.file) return;
    const id = String(tab.id).toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (CUSTOM.some(x => x.id === id) || ["about", "settings", "sidebar", "customize", "upgrade", "downloads"].includes(id)) return;
    CUSTOM.push({ id, title: tab.title || id, file: tab.file });
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", "false"); b.dataset.custom = id;
    b.addEventListener("click", () => setMode("custom:" + id));
    if (tab.after === "about" || !aboutBtn) $("tabs").appendChild(b); else $("tabs").insertBefore(b, aboutBtn);
  });
  applyStatic();
  const wantLang = j.defaultLang;
  if ((wantLang === "fr" || wantLang === "en") && !store.get("lang", "") && wantLang !== LANG) setLang(wantLang);
  const h = location.hash.slice(1);
  if (h && CUSTOM.some(x => x.id === h)) setMode("custom:" + h);
  else if (MODE === "about") renderAbout();
  else {
    const cur = { live: "tabLive", pat: "tabPat", file: "tabFile" }[MODE];
    if (cur && $(cur).hidden) {
      const first = [...document.querySelectorAll("#tabs button")].find(x => !x.hidden);
      if (first) first.click();
    } else if (MODE === "live" && j.texts) run();
  }
}
$("file").addEventListener("change", e => { addFiles([...e.target.files]); e.target.value = ""; });
const drop = $("drop");
["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => addFiles([...e.dataTransfer.files]));

/* ---------- copie CSV ---------- */
function csv(rows) { return rows.map(r => r.map(v => { const s = String(v ?? ""); return /[",;\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(",")).join("\n"); }
document.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", async () => {
  const k = b.dataset.copy;
  if (k === "pcountries" ? !PDATA : !DATA) return;
  const text = k === "pcountries"
    ? csv([["rank", "code", PVIEW, "patents", "share"], ...LAST_PROWS.map(([c, n, d], i) => [i + 1, c, officeName(c), n, (n / d).toFixed(4)])])
    : k === "countries"
    ? csv([["rank", "code", "country", "publications", "share"], ...LAST_ROWS.map(([c, n, d], i) => [i + 1, c, cname(c), n, (n / d).toFixed(4)])])
    : csv([["rank", "title", "year", "citations", "doi", "source", "databases"], ...DATA.works.map((w, i) => [i + 1, w.title, w.year, w.cites, w.doi || "", w.source, w.bases ? w.bases.join(" + ") : ""])]);
  const old = b.textContent;
  try { await navigator.clipboard.writeText(text); b.textContent = t("m.copied"); } catch { b.textContent = t("m.copyFail"); }
  setTimeout(() => b.textContent = old, 1600);
}));

/* ---------- réglages ---------- */
$("oaKey").value = cfg.key; $("workerUrl").value = store.get("worker") || SITE_CONFIG.workerUrl; $("viaWorker").checked = cfg.viaWorker;
$("btnSettings").addEventListener("click", () => { const el = $("settings"); el.hidden = !el.hidden; $("btnSettings").setAttribute("aria-expanded", String(!el.hidden)); });
$("saveSettings").addEventListener("click", () => {
  store.set("oaKey", $("oaKey").value.trim()); store.set("worker", $("workerUrl").value.trim()); store.set("viaWorker", $("viaWorker").checked ? "1" : "0");
  CACHE.clear(); $("settingsMsg").textContent = t("set.saved");
  if (MODE === "live") run(); else if (MODE === "pat") runPat();
});
$("testWorker").addEventListener("click", async () => {
  const w = $("workerUrl").value.trim().replace(/\/+$/, "");
  if (!w) { $("settingsMsg").textContent = t("set.needUrl"); return; }
  $("settingsMsg").textContent = t("set.testing");
  try {
    const r = await fetch(w + "/health"); const j = await r.json();
    $("settingsMsg").textContent = t("set.ok", { epo: j.epo ? t("set.yes") : t("set.no"), lens: j.lens ? t("set.yes") : t("set.no"), oa: j.openalex ? t("set.keyYes") : t("set.keyNo") });
  } catch { $("settingsMsg").textContent = t("set.ko"); }
});

/* ---------- actualisation automatique ---------- */
$("auto").value = store.get("auto", "0");
function setAuto() {
  clearInterval(timer); const m = Number($("auto").value); store.set("auto", String(m));
  if (m > 0) timer = setInterval(() => { if (document.hidden) return; if (MODE === "live") run(true); else if (MODE === "pat") runPat(); }, m * 60000);
}
$("auto").addEventListener("change", setAuto);

/* ---------- langue ---------- */
function setLang(l) {
  if (l === LANG) return;
  LANG = l; store.set("lang", l); nf = new Intl.NumberFormat(LOC());
  applyStatic(); fillDatalists(); pubChips.draw(); patChips.draw();
  if ($("c2").value.trim()) { const c = resolveCountryInput($("c2").value); if (c) $("c2").value = cname(c); }
  if (MODE === "live") run();
  else if (MODE === "pat") runPat();
  else if (MODE === "about") renderAbout();
  else if (MODE.startsWith("custom:")) renderCustom(MODE.slice(7));
  else if (FILES.length) refreshFiles();
  else setStatus("", t("st.chooseFile"));
}
document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));

/* ---------- thème ---------- */
const rerender = () => { Object.values(charts).forEach(c => c.clear()); renderAll(); if (PDATA) renderPat(); };
try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", rerender); } catch {}
new MutationObserver(rerender).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

/* ---------- démarrage ---------- */
applyStatic(); fillDatalists();
let restored = false;
try {
  const last = JSON.parse(store.get("last", "null"));
  if (last && typeof last === "object") {
    restored = true;
    $("q").value = last.q || ""; $("q2").value = last.q2 || ""; $("y1").value = last.y1 || 2005; $("type").value = last.type || ""; $("oaOnly").checked = !!last.oa;
    SELECTED = Array.isArray(last.countries) ? last.countries.filter(c => ISO.includes(c)) : [];
    $("c2").value = last.c2 ? cname(last.c2) : "";
  }
} catch {}
if (!restored) { $("q").value = ""; SELECTED = ["CA"]; $("c2").value = cname("FR"); }
try {
  const pl = JSON.parse(store.get("plast", "null"));
  if (pl && typeof pl === "object") { $("pq").value = pl.q || ""; $("pap").value = pl.applicant || ""; $("pcls").value = (pl.codes || []).join(", "); $("pclsType").value = pl.clsType === "ipc" ? "ipc" : "cpc"; $("py1").value = pl.y1 || 2005; PSEL = (pl.countries || []).filter(c => ISO.includes(c)); }
  else $("pq").value = "";
} catch {}
pubChips.draw(); patChips.draw();
$("qform").addEventListener("submit", e => { e.preventDefault(); run(); });
setAuto();
if (location.hash === "#about") setMode("about"); else run();
loadSite();
})();
