// Checks data/*.json. Run with: node test-data.js
// With --release, every source must be verified, as required before going public.
const fs = require("fs"), path = require("path");
const load = f => JSON.parse(fs.readFileSync(path.join(__dirname, "data", f + ".json"), "utf8"));
const release = process.argv.includes("--release");
const D = {};
["kapitel", "bauteile", "materialien", "schadstoffe", "regeln", "avv", "tabellen", "laender", "quellen", "wandel", "bilder"].forEach(f => D[f] = load(f));

const errs = [];
const err = m => errs.push(m);
const ids = l => new Set(l.map(x => x.id));
const Q = ids(D.quellen), S = ids(D.schadstoffe), R = ids(D.regeln), L = ids(D.laender.laender), AVV = new Set(D.avv.map(a => a.code));

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
  need(b, w, ["titel", "bauzeit", "schichten", "erkennen", "verdacht", "quelle"]);
  quelle(b.quelle, w);
  (b.schadstoffe || []).forEach(s => { if (!S.has(s)) err(`${w}: unbekannter Schadstoff ${s}`); });
  if (b.schnitt && !fs.existsSync(path.join(__dirname, "img/schnitte", b.schnitt + ".svg"))) err(`${w}: Skizze fehlt`);
});
D.schadstoffe.forEach(s => {
  const w = `schadstoff ${s.id}`;
  need(s, w, ["titel", "fundorte"]);
  (s.avv || []).forEach(c => { if (!AVV.has(c)) err(`${w}: unbekannter AVV-Schlüssel ${c}`); });
  (s.regeln || []).forEach(r => { if (!R.has(r)) err(`${w}: unbekannte Regel ${r}`); });
});
D.regeln.forEach(r => { need(r, `regel ${r.id}`, ["titel", "text", "quelle"]); quelle(r.quelle, `regel ${r.id}`); });
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
  if (v == null || v.offen) return;
  if (v.von != null ? !(num(v.von) && num(v.bis)) : !num(v.zahl)) err(`${w}: Wert nicht numerisch`);
};
D.tabellen.forEach(t => {
  const w = `tabelle ${t.id}`;
  need(t, w, ["titel", "sub", "spalten", "zeilen", "quelle", "fundstelle"]);
  quelle(t.quelle, w);
  t.zeilen.forEach(z => {
    if (z.werte.length !== t.spalten.length) err(`${w}/${z.parameter}: Spaltenzahl`);
    z.werte.forEach((v, i) => wert(v, `${w}/${z.parameter}/${i}`));
  });
});
D.laender.werte.forEach((v, i) => {
  const w = `landeswert ${i}`;
  need(v, w, ["land", "schadstoff", "material", "einheit", "bezug", "quelle"]);
  quelle(v.quelle, w);
  if (!L.has(v.land)) err(`${w}: unbekanntes Land ${v.land}`);
  if (!S.has(v.schadstoff)) err(`${w}: unbekannter Schadstoff ${v.schadstoff}`);
  wert(v, w);
});
D.laender.laender.forEach(l => (l.quellen || []).forEach(q => quelle(q, `land ${l.id}`)));
if (D.laender.laender.length !== 16) err(`laender: ${D.laender.laender.length} statt 16`);
D.wandel.forEach((w, i) => { need(w, `wandel ${i}`, ["titel", "text", "status", "quelle"]); quelle(w.quelle, `wandel ${i}`); });
D.bilder.forEach((b, i) => {
  need(b, `bild ${i}`, ["datei", "titel", "urheber", "lizenz", "url"]);
  if (!fs.existsSync(path.join(__dirname, "img/fotos", b.datei || ""))) err(`bild ${i}: Datei fehlt`);
});
// Offline must cover every file the app can ask for.
const sw = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
fs.readdirSync(path.join(__dirname, "data")).forEach(f => { if (!sw.includes(`data/${f}`)) err(`sw.js: data/${f} fehlt`); });
fs.readdirSync(path.join(__dirname, "img/schnitte")).forEach(f => { if (!sw.includes(`img/schnitte/${f}`)) err(`sw.js: img/schnitte/${f} fehlt`); });
fs.readdirSync(path.join(__dirname, "img/fotos")).forEach(f => { if (!sw.includes(`img/fotos/${f}`)) err(`sw.js: img/fotos/${f} fehlt`); });

errs.forEach(e => console.log("FAIL " + e));
console.log(errs.length ? `${errs.length} Fehler` : `Daten ok: ${D.bauteile.length} Bauteile, ${D.schadstoffe.length} Schadstoffe, ${D.avv.length} AVV, ${D.tabellen.length} Tabellen, ${D.quellen.length} Quellen`);
process.exit(errs.length ? 1 : 0);
