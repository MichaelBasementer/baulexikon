// Rebuilds data/tabellen.json and data/avv.json straight from the official consolidated texts,
// so numbers are never typed by hand. Run with: node tools/import-recht.js
// After a change in a law: run it, review the git diff, update Stand and Prüfdatum in data/quellen.json.
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const BASE = "https://www.gesetze-im-internet.de";

const dec = s => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
const txt = s => dec(s.replace(/<sup[^>]*>(.*?)<\/sup>/gis, "^$1^").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const get = async p => {
  const r = await fetch(BASE + p);
  if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
  return new TextDecoder("latin1").decode(await r.arrayBuffer());
};
const tables = html => [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map(m => [...m[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)].map(r => [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => txt(c[1]))));
// Joins words broken over a line, but keeps "bitumen- oder hydraulisch".
const unhyphen = s => s.replace(/(\p{Ll})- (?!oder |und |bzw\.? |sowie )(\p{Ll})/gu, "$1$2").replace(/\^/g, "").trim();
const toNum = s => Number(s.replace(/ /g, "").replace(",", "."));
const NUM = "\\d[\\d ]*(?:,\\d+)?";

// Footnote marks arrive as ^3^) or ^ 6)^ from the <sup> tags.
const FN = /\^\s*(\d+[a-z]?)\s*\)?\s*\^\s*\)?/g;
const split = raw => ({ c: raw.replace(FN, "").replace(/\s+/g, " ").trim(), fn: [...raw.matchAll(FN)].map(m => m[1]).join(",") });

// One table cell to a value. Keeps the printed form in s so the app shows the law's own notation.
function cell(raw) {
  const { c, fn } = split(raw);
  if (!c) return null;
  const base = { s: c, ...(fn ? { fn } : {}) };
  let m;
  if ((m = c.match(new RegExp(`^(≤|<|>|≥)\\s*(${NUM})$`)))) return { ...base, op: m[1], zahl: toNum(m[2]) };
  if ((m = c.match(new RegExp(`^(${NUM})\\s*–\\s*(${NUM})$`)))) return { ...base, von: toNum(m[1]), bis: toNum(m[2]) };
  if ((m = c.match(new RegExp(`^(${NUM})\\s*\\((${NUM})\\)$`)))) return { ...base, zahl: toNum(m[1]), klammer: toNum(m[2]) };
  if ((m = c.match(new RegExp(`^(${NUM})$`)))) return { ...base, zahl: toNum(m[1]) };
  return { text: c, ...(fn ? { fn } : {}) };
}
const rowsOf = (rows, nameCol, unitCol, cols) => rows
  .filter(r => r.length > Math.max(...cols))
  .map(r => { const p = split(r[nameCol]); return { parameter: unhyphen(p.c), ...(p.fn ? { fn: p.fn } : {}), einheit: unitCol < 0 ? "" : r[unitCol], werte: cols.map(c => cell(r[c] || "")) }; })
  .filter(z => z.werte.some(Boolean));
const notes = s => txt(s).replace(/\^/g, "").split(/\s(?=\d{1,2}[a-z]?\)\s)/).map(x => x.trim()).filter(x => /^\d{1,2}[a-z]?\)\s/.test(x));
// Notes are numbered 1, 2, 3 … Walking the sequence keeps "§ 6 Absatz 2 Nummer 8" from being read as a note.
function notesPlain(s) {
  const t = " " + txt(s).replace(/zum Seitenanfang[\s\S]*$/, "").replace(/\^/g, " ").replace(/\s+/g, " ");
  const out = [];
  let pos = 0, cur = null;
  for (let n = 1; n < 40; n++) {
    const re = new RegExp(`(?<!(?:§|Absatz|Nummer|Satz|Tabelle|Anlage|Teil|bis|und|Abs\\.)) ${n} (?=[A-ZÄÖÜ])`, "g");
    re.lastIndex = pos;
    const m = re.exec(t);
    if (!m) break;
    if (cur != null) out.push(`${n - 1}) ${t.slice(cur, m.index).trim()}`);
    cur = m.index + m[0].length;
    pos = cur;
  }
  if (cur != null) out.push(`${out.length + 1}) ${t.slice(cur).trim()}`);
  return out;
}

async function depv() {
  const html = await get("/depv_2009/anhang_3.html");
  const t = tables(html)[1];
  const after = html.slice(html.lastIndexOf("</table>")).replace(/zum Seitenanfang[\s\S]*$/, "");
  const fussnoten = notes(after);
  const cols = [3, 4, 5, 6, 7, 8], spalten = ["Geol. Barriere", "DK 0", "DK I", "DK II", "DK III", "Rekult."];
  const by = re => t.filter(r => re.test(r[0]));
  const mk = (id, titel, re, fund) => ({ id, titel, sub: "DepV Anhang 3 Tabelle 2", stichworte: "DK0 DK1 DK2 DK3 DK 0 DK I DK II DK III Deponieklasse Zuordnungskriterien", spalten, start: [1, 2, 3], zeilen: rowsOf(by(re), 1, 2, cols), quelle: "depv", fundstelle: fund, fussnoten });
  return [mk("depv-fest", "Deponieklassen, Feststoff", /^(1\.0|2\.)/, "Anhang 3 Tabelle 2, Nr. 1 und 2"), mk("depv-eluat", "Deponieklassen, Eluat", /^3\./, "Anhang 3 Tabelle 2, Nr. 3")];
}

async function ebv() {
  const html = await get("/ersatzbaustoffv/anlage_1.html");
  const t = tables(html);
  const parts = html.split(/<\/table>/i);
  // Tabelle 1 is printed in two parts; its notes follow the second part.
  const after = i => notesPlain((parts[(i === 1 ? 2 : i) + 1] || "").split(/<table/i)[0]);
  const mk = (i, id, titel, sub, fund, stich, spalten, unit = 1) => {
    const n = spalten.length, cols = Array.from({ length: n }, (_, k) => unit + 1 + k);
    return { id, titel, sub, stichworte: stich, spalten, start: [0, 1, 2].filter(x => x < n), zeilen: rowsOf(t[i].filter(r => r.length === n + 2 && !/^(MEB|Parameter)$/.test(r[0])), 0, 1, cols), quelle: "ebv", fundstelle: fund, fussnoten: after(i) };
  };
  return [
    mk(1, "ebv-rc", "RC-Baustoffe und Schlacken", "EBV Anlage 1 Tabelle 1", "Anlage 1 Tabelle 1", "Recycling Baustoff RC RC-1 RC-2 RC-3 Hochofenstückschlacke Stahlwerksschlacke Materialwerte", ["RC-1", "RC-2", "RC-3", "HOS-1", "HOS-2", "HS", "SWS-1", "SWS-2", "GKOS"]),
    mk(2, "ebv-asche", "Aschen und weitere Ersatzbaustoffe", "EBV Anlage 1 Tabelle 1", "Anlage 1 Tabelle 1", "Hausmüllverbrennungsasche HMVA Flugasche Gießereirestsand Kupferhüttenmaterial", ["CUM-1", "CUM-2", "GRS", "SKG", "SKA", "SFA", "BFA", "HMVA-1", "HMVA-2"]),
    mk(3, "ebv-gs", "Gleisschotter", "EBV Anlage 1 Tabelle 2", "Anlage 1 Tabelle 2", "Gleisschotter GS", ["GS-0", "GS-1", "GS-2", "GS-3"]),
    mk(4, "ebv-bm", "Bodenmaterial und Baggergut", "EBV Anlage 1 Tabelle 3, gilt auch für BG", "Anlage 1 Tabelle 3", "Bodenmaterial BM BG Baggergut BM-0 BM-F0 BM-F1 BM-F2 BM-F3", ["BM-0 Sand", "BM-0 Lehm", "BM-0 Ton", "BM-0*", "BM-F0*", "BM-F1", "BM-F2", "BM-F3"]),
    mk(5, "ebv-bm-zusatz", "Bodenmaterial, weitere Stoffe", "EBV Anlage 1 Tabelle 4", "Anlage 1 Tabelle 4", "Bodenmaterial Zusatzparameter Antimon Herbizide", ["BM-F0*", "BM-F1", "BM-F2", "BM-F3"]),
  ];
}

async function bbodschv() {
  const html = await get("/bbodschv_2023/anlage_1.html");
  const t = tables(html), parts = html.split(/<\/table>/i);
  const after = i => notesPlain((parts[i + 1] || "").split(/<table/i)[0].split(/Tabelle \d:/)[0]);
  const mk = (i, skip, id, titel, fund, spalten) => ({ id, titel, sub: `BBodSchV Anlage 1 ${fund}`, stichworte: "Bodenschutz Vorsorgewert Verfüllung Auf- oder Einbringen durchwurzelbare Bodenschicht", spalten, start: spalten.map((_, k) => k).slice(0, 3), zeilen: rowsOf(t[i].slice(skip), 0, -1, spalten.map((_, k) => k + 1)).map(z => ({ ...z, einheit: z.einheit || "" })), quelle: "bbodschv", fundstelle: `Anlage 1 ${fund}`, fussnoten: after(i) });
  return [
    mk(0, 2, "bbod-anorg", "Vorsorgewerte, anorganisch", "Tabelle 1", ["Sand", "Lehm/Schluff", "Ton"]),
    mk(1, 2, "bbod-org", "Vorsorgewerte, organisch", "Tabelle 2", ["TOC ≤ 4 %", "TOC > 4–9 %"]),
    mk(3, 3, "bbod-verfuell", "Auf- oder Einbringen unterhalb der durchwurzelbaren Schicht", "Tabelle 4", ["Feststoff mg/kg TM", "Eluat µg/l, TOC < 0,5 %", "Eluat µg/l, TOC ≥ 0,5 %"]),
    mk(4, 3, "bbod-zusatz", "Zusätzliche Stoffe bei über 10 % Fremdbestandteilen", "Tabelle 5", ["Feststoff mg/kg TM", "Eluat µg/l, TOC < 0,5 %", "Eluat µg/l, TOC ≥ 0,5 %"]),
  ];
}

// Anlagen 2 and 3: one table per material, every row one way of building it in.
async function einsatz(anlage, gruppe, prefix) {
  const html = await get(`/ersatzbaustoffv/anlage_${anlage}.html`);
  const t = tables(html), parts = html.split(/<\/table>/i);
  const spalten = ["ungünstig", "günstig Sand", "günstig Lehm/Ton", "WSG III A Sand", "WSG III A Lehm/Ton", "WSG III B Sand", "WSG III B Lehm/Ton", "Vorrang Sand", "Vorrang Lehm/Ton"];
  const out = [];
  t.forEach((rows, i) => {
    const data = rows.filter(r => r.length === 11 && r[0] !== "Sand");
    if (!data.length) return;
    const titel = unhyphen(rows[0][0]).replace(/\s+/g, " ");
    out.push({ id: `${prefix}-${out.length + 1}`, gruppe, titel, sub: `EBV Anlage ${anlage} Tabelle ${out.length + 1}`, stichworte: "Einbauweise Einsatzmöglichkeiten Grundwasserdeckschicht", spalten, start: [0, 1, 2],
      zeilen: data.map(r => { const p = split(r[1]); return { parameter: `${r[0]} ${unhyphen(p.c)}`, einheit: "", werte: r.slice(2).map(cell) }; }),
      quelle: "ebv", fundstelle: `Anlage ${anlage} Tabelle ${out.length + 1}`, fussnoten: notesPlain((parts[i + 1] || "").split(/<table/i)[0].split(/Tabelle \d+:/)[0]) });
  });
  return out;
}

async function avv(old) {
  const html = await get("/avv/anlage.html");
  const rows = tables(html)[0].filter(r => /^17 \d\d \d\d\*?$/.test(r[0]));
  const keep = new Map(old.map(a => [a.code, a]));
  // Same waste named once with and once without "gefährliche Stoffe".
  const SPIEGEL = { "17 01 06*": "17 01 07", "17 02 04*": "17 02 01", "17 03 01*": "17 03 02", "17 04 09*": "17 04 07", "17 04 10*": "17 04 11", "17 05 03*": "17 05 04", "17 05 05*": "17 05 06", "17 05 07*": "17 05 08", "17 06 03*": "17 06 04", "17 08 01*": "17 08 02", "17 09 03*": "17 09 04" };
  const back = Object.fromEntries(Object.entries(SPIEGEL).map(([a, b]) => [b, a]));
  return rows.map(r => ({ code: r[0], titel: r[1], gefaehrlich: r[0].endsWith("*"), ...((SPIEGEL[r[0]] || back[r[0]]) ? { spiegel: SPIEGEL[r[0]] || back[r[0]] } : {}), ...(keep.get(r[0])?.stichworte ? { stichworte: keep.get(r[0]).stichworte } : {}), quelle: "avv" }));
}

(async () => {
  const old = JSON.parse(fs.readFileSync(path.join(ROOT, "data/avv.json"), "utf8"));
  const tabs = [...await depv(), ...await ebv(), ...await bbodschv(), ...await einsatz(2, "ebv-einsatz", "ebv-e"), ...await einsatz(3, "ebv-bahn", "ebv-b")];
  const codes = await avv(old);
  // Tables from PDFs (LAGA, Länder) are maintained in the file itself.
  const lagaTabs = JSON.parse(fs.readFileSync(path.join(ROOT, "data/tabellen.json"), "utf8")).filter(t => !["depv", "ebv", "bbodschv"].includes(t.quelle));
  fs.writeFileSync(path.join(ROOT, "data/tabellen.json"), JSON.stringify([...tabs, ...lagaTabs], null, 1) + "\n");
  fs.writeFileSync(path.join(ROOT, "data/avv.json"), JSON.stringify(codes, null, 1) + "\n");
  tabs.forEach(t => console.log(`${t.id}: ${t.zeilen.length} Zeilen, ${t.fussnoten.length} Fußnoten`));
  console.log(`AVV Kapitel 17: ${codes.length} Schlüssel`);
})();
