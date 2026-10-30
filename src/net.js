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
  edges = edges.slice(0, Math.max(60, top.length * 6));
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
    applicants: r.ap, inventors: r.in, prio: r.pr.map(officeName) }));
  return [["cpc", t("net.cpc", { s: `${sys}, ${t("lvl." + PLEVEL).toLowerCase()}` }), 0], ["applicants", t("net.applicants"), 0], ["inventors", t("net.inventors"), 25], ["prio", t("net.prio"), 0]]
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
  if (!types.length) { clear(p === "pat" && PDATA && !PDATA.records ? t("net.na") : t("net.empty")); return; }
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
      return `<b>${esc(d.name)}</b><br>${esc(t("net.tipNode", { n: fmt(d.occ), l: d.links, y: d.year ? fmt1(d.year) : "—" }))}` + (st.color === "cluster" ? `<br>${esc(t("net.cluster", { c: d.cluster + 1 }))}` : "");
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
    $(p + "NetLegend").innerHTML = `<span class="note">${esc(t("net.yearLegend"))}</span><span class="mono">${fmt1(y0)}</span><span class="ramp" style="background:linear-gradient(90deg,${yearColor(y0, y0, y1, th)},${yearColor(mid, y0, y1, th)},${yearColor(y1, y0, y1, th)})"></span><span class="mono">${fmt1(y1)}</span>`;
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
let LENS_SAMPLE = [];
try { LENS_SAMPLE = JSON.parse($("lensSample").textContent); } catch { LENS_SAMPLE = []; }
let PFILE = null;
const splitLens = x => String(x || "").split(";;").map(v => v.trim()).filter(Boolean);
function lensFromRows(objs) {
  return objs.map(o => ({
    j: o["jurisdiction"] || "", y: parseInt(o["publication year"], 10) || parseInt(String(o["publication date"] || "").slice(0, 4), 10) || null,
    d: o["publication date"] || "", k: o["display key"] || "", id: o["lens id"] || "", t: o["title"] || "", a: String(o["abstract"] || "").slice(0, 700),
    ap: splitLens(o["applicants"]), in: splitLens(o["inventors"]), cpc: splitLens(o["cpc classifications"]), ipc: splitLens(o["ipcr classifications"]),
    ls: o["legal status"] || "", dt: o["document type"] || "", cb: parseInt(o["cited by patent count"], 10) || 0, fs: parseInt(o["simple family size"], 10) || 0,
    fj: splitLens(o["simple family member jurisdictions"]), pr: [...new Set(splitLens(o["priority numbers"]).map(x => x.split(/\s+/)[0]).filter(Boolean))],
    pd: String(o["earliest priority date"] || "").slice(0, 4)
  })).filter(r => r.y);
}
function filterPatents(recs, ps) {
  const words = ntitle(ps.q).split(" ").filter(w => w.length > 1);
  return recs.filter(r => {
    if (r.y < ps.y1 || r.y > ps.y2) return false;
    if (words.length) { const txt = r._txt || (r._txt = ntitle(r.t + " " + r.a)); if (!words.every(w => txt.includes(w))) return false; }
    if (ps.codes.length) { const list = ps.clsType === "ipc" ? r.ipc : r.cpc; if (!list.some(x => ps.codes.some(c => normCode(x).startsWith(c)))) return false; }
    if (ps.countries.length && !r.pr.some(c => ps.countries.includes(unify(c)))) return false;
    return true;
  });
}
function analyzePatents(recs, ps) {
  const f = filterPatents(recs, ps);
  const cnt = fn => { const m = new Map(); for (const r of f) for (const x of new Set(fn(r))) if (x) m.set(x, (m.get(x) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const yrs = f.map(r => r.y);
  const range = yrs.length ? [Math.max(ps.y1, Math.min(...yrs)), Math.min(ps.y2, Math.max(...yrs))] : [ps.y1, ps.y2];
  const ym = new Map(); f.forEach(r => ym.set(r.y, (ym.get(r.y) || 0) + 1));
  const byYear = []; for (let y = range[0]; y <= range[1]; y++) byYear.push([y, ym.get(y) || 0]);
  const allZero = f.every(r => !r.cb);
  const top = f.slice().sort((a, b) => allZero ? (b.fs - a.fs) : (b.cb - a.cb || b.fs - a.fs)).slice(0, 25).map(r => ({
    title: r.t, number: r.k, date: r.d, applicants: r.ap.slice(0, 2), cites: r.cb, fam: r.fs, url: r.id ? "https://lens.org/" + r.id : null }));
  return {
    source: "lensFile", unit: t("pk.unitFile"), total: f.length, range, byYear,
    byOffice: cnt(r => [r.j]), byOrigin: cnt(r => r.pr), byProtection: cnt(r => r.fj.length ? r.fj : [r.j]), byApplicantCountry: null,
    topApplicants: cnt(r => r.ap).slice(0, 20), topCodes: cnt(r => ps.clsType === "ipc" ? r.ipc : r.cpc).slice(0, 400),
    legal: cnt(r => [r.ls]), top, topBy: allZero ? "family" : "cites", records: f,
    warnings: ps.countries.length ? [t("pwarn.country")] : []
  };
}
function lensDesc(recs) {
  if (!recs.length) return "";
  const j = [...new Set(recs.map(r => r.j))].slice(0, 4).join(", ");
  const ds = recs.map(r => r.d).filter(Boolean).sort();
  const f = d => { try { return new Date(d + "T00:00:00").toLocaleDateString(LOC(), { day: "numeric", month: "long", year: "numeric" }); } catch { return d; } };
  return t("pfile.desc", { j, a: f(ds[0]), b: f(ds[ds.length - 1]) });
}
$("pfile").addEventListener("change", async e => {
  const file = e.target.files[0]; e.target.value = "";
  if (!file) return;
  setStatus("", t("st.reading", { name: file.name }));
  try {
    const text = new TextDecoder("utf-8").decode(new Uint8Array(await file.arrayBuffer())).replace(/^﻿/, "");
    const objs = rowsToObjects(parseDelimited(text, ","));
    if (!objs.length || !("jurisdiction" in objs[0]) || !("title" in objs[0])) throw new Error(t("err.lensFile", { name: file.name }));
    const recs = lensFromRows(objs);
    if (!recs.length) throw new Error(t("err.lensFile", { name: file.name }));
    PFILE = { name: file.name, recs };
    $("pReset").hidden = false;
    runPat();
  } catch (err) { setStatus("err", err.message); }
});
$("pReset").addEventListener("click", () => { PFILE = null; $("pReset").hidden = true; runPat(); });
