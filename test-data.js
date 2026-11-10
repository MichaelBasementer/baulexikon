// Checks data/*.json. Run with: node test-data.js
// With --release, every source must be verified, as required before going public.
const fs = require("fs"), path = require("path");
const load = f => JSON.parse(fs.readFileSync(path.join(__dirname, "data", f + ".json"), "utf8"));
const release = process.argv.includes("--release");
const D = {};
["kapitel", "bauteile", "erkennung", "materialien", "schadstoffe", "regeln", "avv", "tabellen", "laender", "quellen", "wandel", "bilder"].forEach(f => D[f] = load(f));

const errs = [];
const err = m => errs.push(m);
const ids = l => new Set(l.map(x => x.id));
const B = ids(D.bilder), M = ids(D.materialien), T = ids(D.bauteile), Q = ids(D.quellen), S = ids(D.schadstoffe), R = ids(D.regeln), L = ids(D.laender.laender), AVV = new Set(D.avv.map(a => a.code));

const need = (o, where, fields) => fields.forEach(f => { if (o[f] == null || o[f] === "") err(`${where}: Feld ${f} fehlt`); });
const uniq = (l, name) => { const s = new Set(); l.forEach(x => { if (s.has(x.id)) err(`${name}: doppelte id ${x.id}`); s.add(x.id); }); };
const quelle = (id, where) => { if (!Q.has(id)) err(`${where}: unbekannte Quelle ${id}`); };
const iso = /^\d{4}-\d{2}-\d{2}$/;

[["bauteile", D.bauteile], ["materialien", D.materialien], ["schadstoffe", D.schadstoffe], ["regeln", D.regeln], ["tabellen", D.tabellen], ["quellen", D.quellen]].forEach(([n, l]) => uniq(l, n));

D.quellen.forEach(q => {
  const w = `quelle ${q.id}`;
  need(q, w, ["titel", "kurz", "fassung", "herausgeber", "status"]);
  if (!["geprueft", "ungeprueft", "entwurf"].includes(q.status)) err(`${w}: Status ${q.status}`);
  if (q.status === "geprueft" && !iso.test(q.geprueft || "")) err(`${w}: geprüft ohne Prüfdatum`);
  if (q.status === "geprueft" && !q.url && !q.lokal) err(`${w}: geprüft ohne Link`);
  if (release && q.status === "ungeprueft") err(`${w}: vor Veröffentlichung nicht geprüft`);
});
D.bauteile.forEach(b => {
  const w = `bauteil ${b.id}`;
  if (b.quelle) quelle(b.quelle, w);
  (b.belege || []).forEach(q => quelle(q, w));
  need(b, w, ["titel", "gruppe", "bauzeit", "schichten", "erkennen", "verdacht", "schadstoffe", "richtung"]);
  b.schadstoffe.forEach(s => { if (!S.has(s)) err(`${w}: unbekannter Schadstoff ${s}`); });
  b.schichten.forEach(s => { if (s[2] && !M.has(s[2]) && s[2] !== "luft") err(`${w}: unbekanntes Material ${s[2]}`); });
  if (b.richtung !== "belag" && !b.schichten.length) err(`${w}: keine Schichten`);
  if (b.richtung !== "belag" && !fs.existsSync(path.join(__dirname, "img/schnitte", b.id + ".svg"))) err(`${w}: Skizze fehlt`);
  (b.fotos || []).forEach(f => { if (!B.has(f)) err(`${w}: Foto ${f} fehlt`); });
});
D.schadstoffe.forEach(s => {
  const w = `schadstoff ${s.id}`;
  need(s, w, ["titel", "fundorte", "quelle"]);
  quelle(s.quelle, w);
  (s.avv || []).forEach(c => { if (!AVV.has(c)) err(`${w}: unbekannter AVV-Schlüssel ${c}`); });
  (s.regeln || []).forEach(r => { if (!R.has(r)) err(`${w}: unbekannte Regel ${r}`); });
});
D.erkennung.forEach(e => { if (!T.has(e.bauteil)) err(`erkennung: ${e.bauteil}`); });
D.materialien.forEach(m => {
  need(m, `material ${m.id}`, ["titel", "text", "schadstoffe"]);
  m.schadstoffe.forEach(s => { if (!S.has(s)) err(`material ${m.id}: ${s}`); });
  if (m.foto && !B.has(m.foto)) err(`material ${m.id}: Foto ${m.foto} fehlt`);
});
D.regeln.forEach(r => {
  need(r, `regel ${r.id}`, ["titel", "text", "quelle", "bereich"]);
  quelle(r.quelle, `regel ${r.id}`);
  (r.fotos || []).forEach(f => { if (!B.has(f)) err(`regel ${r.id}: Foto ${f} fehlt`); });
  (r.belege || []).forEach(q => quelle(q, `regel ${r.id}`));
  (r.tabellen || []).forEach(t => { if (!D.tabellen.some(x => x.id === t)) err(`regel ${r.id}: Tabelle ${t}`); });
});
D.avv.forEach(a => {
  const w = `avv ${a.code}`;
  need(a, w, ["code", "titel", "quelle"]);
  quelle(a.quelle, w);
  if (typeof a.gefaehrlich !== "boolean") err(`${w}: gefaehrlich fehlt`);
  if (a.code.endsWith("*") !== a.gefaehrlich) err(`${w}: Stern passt nicht zu gefaehrlich`);
  if (!/^\d{2} \d{2} \d{2}\*?$/.test(a.code)) err(`${w}: Schlüsselformat`);
  if (a.spiegel && !AVV.has(a.spiegel)) err(`${w}: unbekannter Spiegeleintrag ${a.spiegel}`);
});
const wert = (v, w) => {
  const num = x => typeof x === "number" && Number.isFinite(x);
  if (v == null || v.text) return;
  if (v.s && /[\^)]$/.test(v.s) && !v.s.includes("(")) err(`${w}: Fußnotenrest ${v.s}`);
  if (v.von != null ? !(num(v.von) && num(v.bis)) : !num(v.zahl)) err(`${w}: Wert nicht numerisch`);
};
D.tabellen.forEach(t => {
  const w = `tabelle ${t.id}`;
  need(t, w, ["titel", "sub", "spalten", "start", "zeilen", "fussnoten", "quelle", "fundstelle"]);
  if (t.zeilen.length < 3 && !t.gruppe) err(`${w}: nur ${t.zeilen.length} Zeilen, Import prüfen`);
  quelle(t.quelle, w);
  t.zeilen.forEach(z => {
    if (z.werte.length !== t.spalten.length) err(`${w}/${z.parameter}: Spaltenzahl`);
    z.werte.forEach((v, i) => wert(v, `${w}/${z.parameter}/${i}`));
  });
});
D.laender.werte.forEach((v, i) => {
  const w = `landeswert ${i}`;
  need(v, w, ["land", "schadstoff", "material", "bezug", "quelle", ...(v.text ? [] : ["einheit"])]);
  quelle(v.quelle, w);
  if (!L.has(v.land)) err(`${w}: unbekanntes Land ${v.land}`);
  if (!S.has(v.schadstoff)) err(`${w}: unbekannter Schadstoff ${v.schadstoff}`);
  wert(v, w);
});
D.laender.hinweise.forEach((h, i) => {
  need(h, `hinweis ${i}`, ["land", "schadstoff", "titel", "text", "quelle", "fundstelle"]);
  quelle(h.quelle, `hinweis ${i}`);
  if (!L.has(h.land)) err(`hinweis ${i}: Land ${h.land}`);
  if (!S.has(h.schadstoff)) err(`hinweis ${i}: Schadstoff ${h.schadstoff}`);
});
D.laender.laender.forEach(l => (l.quellen || []).forEach(q => quelle(q, `land ${l.id}`)));
if (D.laender.laender.length !== 16) err(`laender: ${D.laender.laender.length} statt 16`);
D.wandel.forEach((w, i) => { need(w, `wandel ${i}`, ["titel", "text", "status", "quelle"]); quelle(w.quelle, `wandel ${i}`); });
D.bilder.forEach((b, i) => {
  need(b, `bild ${i}`, ["datei", "titel", "urheber", "lizenz", "url"]);
  if (b.urheber.length > 120) err(`bild ${i}: Urheberfeld zu lang, Lizenzbedingungen prüfen`);
  if (!fs.existsSync(path.join(__dirname, "img/fotos", b.datei || ""))) err(`bild ${i}: Datei fehlt`);
});
// KE AbfallCheck reads rechner.json. It may only point at existing rows, never carry limit values itself.
const rechner = load("rechner");
const zeile = (tabelle, parameter, w) => {
  const t = D.tabellen.find(x => x.id === tabelle);
  if (!t) return err(`${w}: Tabelle ${tabelle} fehlt`);
  if (!t.zeilen.some(z => z.parameter === parameter)) err(`${w}: Zeile ${parameter} fehlt in ${tabelle}`);
};
rechner.gefahr.forEach(g => {
  const w = `rechner ${g.id}`;
  if (g.laga) zeile(g.laga[0], g.laga[1], w);
  if (g.rp) zeile("rp-gefaehrlich", g.rp, w);
  if (g.quelle) quelle(g.quelle, w);
  [g.text, ...Object.values(g.textLand || {})].filter(Boolean).forEach(text => {
    if (!D.regeln.find(r => r.id === g.regel).text.join(" ").includes(text)) err(`${w}: Wert ${text} steht nicht in Regel ${g.regel}`);
  });
  Object.values(g.quelleLand || {}).forEach(q => quelle(q, w));
  if (g.rpErsetzt) zeile("rp-gefaehrlich", g.rpErsetzt, w);
});
Object.entries(rechner.rpZuordnung).forEach(([laga, rp]) => {
  if (!["laga-metalle", "laga-organik", "laga-eluat"].some(t => D.tabellen.find(x => x.id === t).zeilen.some(z => z.parameter === laga))) err(`rechner rpZuordnung: ${laga} fehlt`);
  if (rp) zeile("rp-gefaehrlich", rp, `rechner rpZuordnung ${laga}`);
});
Object.values(rechner.ebv).forEach(e => { if (!D.tabellen.some(t => t.id === e.tabelle)) err(`rechner: Tabelle ${e.tabelle} fehlt`); });
const depv = D.tabellen.find(t => t.id === rechner.depv.tabelle);
rechner.depv.zeilen.forEach(([anfang]) => { if (!depv.zeilen.some(z => z.parameter.startsWith(anfang))) err(`rechner: DepV-Zeile ${anfang} fehlt`); });
const stoffe = new Set(["standard", ...rechner.gefahr.map(g => g.id)]);
const ROUTEN = { r: D.regeln, s: D.schadstoffe, b: D.bauteile, t: D.tabellen };
rechner.materialien.forEach(m => {
  const w = `rechner ${m.id}`;
  need(m, w, ["titel", "stichworte", "art", "avv", "lexikon"]);
  if (!["immer", "spiegel", "kategorie"].includes(m.art)) err(`${w}: Art ${m.art}`);
  m.avv.forEach(c => { if (!AVV.has(c)) err(`${w}: unbekannter AVV-Schlüssel ${c}`); });
  if (m.art === "immer" && !m.avv.every(c => c.endsWith("*"))) err(`${w}: immer gefährlich ohne Stern`);
  (m.stoffe || []).forEach(s => { if (!stoffe.has(s)) err(`${w}: unbekannter Stoff ${s}`); });
  if (m.ebv && !rechner.ebv[m.ebv]) err(`${w}: EBV ${m.ebv}`);
  if (m.hinweisRegel && !R.has(m.hinweisRegel)) err(`${w}: Regel ${m.hinweisRegel}`);
  (m.quellen || []).forEach(q => quelle(q, w));
  Object.values(m.landHinweis || {}).forEach(h => quelle(h.quelle, w));
  m.lexikon.forEach(l => {
    const treffer = l.match(/^#\/([rsbt])\/(.+)$/);
    if (!treffer || !ROUTEN[treffer[1]].some(x => x.id === treffer[2])) err(`${w}: Verweis ${l}`);
  });
});
// Offline must cover every file the app can ask for.
const off = fs.readFileSync(path.join(__dirname, "files.js"), "utf8");
["data", "img/schnitte", "img/fotos", "kit/fonts"].forEach(d => fs.readdirSync(path.join(__dirname, d)).forEach(f => { if (!off.includes(`"${d}/${f}"`)) err(`files.js: ${d}/${f} fehlt, tools/make-schnitte.js laufen lassen`); }));

errs.forEach(e => console.log("FAIL " + e));
console.log(errs.length ? `${errs.length} Fehler` : `Daten ok: ${D.bauteile.length} Bauteile, ${D.schadstoffe.length} Schadstoffe, ${D.avv.length} AVV, ${D.tabellen.length} Tabellen, ${D.quellen.length} Quellen`);
process.exit(errs.length ? 1 : 0);
