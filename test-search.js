// Run with: node test-search.js
const S = require("./search.js");
const idx = S.build([
  { titel: "17 06 05* asbesthaltige Baustoffe", sub: "AVV-Schlüssel", route: "#/a/170605" },
  { titel: "17 05 04 Boden und Steine", sub: "AVV-Schlüssel", route: "#/a/170504" },
  { titel: "Holzbalkendecke", sub: "Bauteil", stichworte: "Fehlboden Schüttung", route: "#/b/holz" },
  { titel: "Preußische Kappendecke", sub: "Bauteil", route: "#/b/kappe" },
  { titel: "Flexplatten", sub: "Bodenbelag", route: "#/b/flex" },
]);
const first = q => (S.find(idx, q)[0] || {}).route;
const cases = [
  ["Schlüssel ohne Leerzeichen", first("170605"), "#/a/170605"],
  ["Schlüssel mit Leerzeichen", first("17 06 05"), "#/a/170605"],
  ["Schlüssel mit Stern", first("17 06 05*"), "#/a/170605"],
  ["ß als ss", first("preussische"), "#/b/kappe"],
  ["ß wie geschrieben", first("Preußische"), "#/b/kappe"],
  ["Großschreibung egal", first("FLEXPLATTE"), "#/b/flex"],
  ["Umlaut als ue im Stichwort", first("schuettung"), "#/b/holz"],
  ["Wörter getrennt", first("holz decke"), "#/b/holz"],
  ["Titel vor Stichwort", S.find(idx, "decke").length, 2],
  ["Kein Treffer", S.find(idx, "xyz").length, 0],
  ["Leere Suche", S.find(idx, "  ").length, 0],
];
let bad = 0;
for (const [name, got, want] of cases) if (got !== want) { bad++; console.log(`FAIL ${name}: ${got} statt ${want}`); }
console.log(`${cases.length - bad}/${cases.length} ok`);
process.exit(bad ? 1 : 0);
