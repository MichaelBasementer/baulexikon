// Downloads the atlas photos from Wikimedia Commons and writes data/bilder.json with author and licence.
// Run with: node tools/fetch-fotos.js
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const UA = "Baulexikon/1.0 (offline reference web app)";
const API = "https://commons.wikimedia.org/w/api.php";

// id, shown title, Commons file name as far as the atlas credits print it (a name without extension is a prefix)
// Not used on purpose: Kernbohrung 2011-Q2-by-RaBoe-*. The author adds own terms with fee and legal threats.
const LIST = [
  ["ortbeton", "Deckenschalung mit Bewehrung vor dem Betonieren", "Suspended-slab-blockwork.jpg"],
  ["filigran", "Filigranplatten mit Gitterträgern", "Elementdecke 1.jpg"],
  ["hohldiele", "Verlegte Hohldielen, Hohlkanäle an der Stirnseite", "Hollow core slabs.jpg"],
  ["bimsdecke", "Träger-Füllkörperdecke im Bau", "Beam & block floor, Meadows View"],
  ["ziegeldecke", "Deckenziegel für Einhängedecken", "Wienerberger POROTHERM brick ceiling"],
  ["holzbalken", "Holzbalkendecke mit Einschubbrettern", "Holzbalkendecke mit Einschubbrettern im"],
  ["kappe", "Preußische Kappendecke (Werkstatt, 1890)", "Preußische Kappendecke"],
  ["trapez", "Stahlblech-Deck vor dem Betonieren", "Deck steel in place before concrete"],
  ["bsp", "Brettsperrholz, kreuzweise verleimte Lagen", "Cross-laminated timber (detail).jpg"],
  ["schwimmend", "Frischer schwimmender Estrich, Randdämmstreifen", "Frischer schwimmender Estrich"],
  ["heizestrich", "Estrichaufbau mit Fußbodenheizung", "Estrichaufbau mit Fußbodenheizung.jpg"],
  ["gussasphalt", "Parkdeck mit 40 mm Gussasphalt", "Покрытие многоярусного паркинга"],
  ["dielen", "Breite Eichendielen", "16 inch wide oak flooring.jpeg"],
  ["bodenplatte", "Bewehrung einer Bodenplatte", "Bewehrung einer Bodenplatte.jpg"],
  ["mauerwand", "Kalksandstein-Mauerwerk", "Cegła silikatowa (murowana ściana).jpg"],
  ["metallstaender", "Metallständerwerk vor dem Beplanken", "Light gage metal framing.JPG"],
  ["holzstaender", "Holzständerwand (Zimmerei)", "Holzständerwand.JPG"],
  ["leichtbau", "Alte Holzwolle-Leichtbauplatte", "Sauerkrautplatte80 2022.jpg"],
  ["stbwand", "Wandschalung mit Schalungsanker und Bewehrung", "Schalungsanker.jpg"],
  ["monolith", "Hochlochziegel mit Perlitfüllung", "Poroton-S9 mit Perlitfüllung.jpg"],
  ["wdvs", "WDVS, teilweise auf Altbau aufgebracht", "Wärmedämmverbundsystem (WDVS) teilweise"],
  ["zweischalig", "Zweischaliges Mauerwerk mit Dämmung", "Zweischaliges Mauerwerk mit Dämmung.jpg"],
  ["vhf", "Montage VHF: Dämmung und Unterkonstruktion", "Монтаж вентилируемых фасадных систем"],
  ["sandwich", "Waschbeton-Fassadenplatten", "Waschbeton-Fassadenplatten vor der Sanie"],
  ["holzrahmen", "Holzrahmen mit Windschutzplatte", "Timber frame 0857.jpg"],
  ["fachwerk", "Freigelegtes Fachwerk mit Flechtwerk", "Fachwerk-meiningen002-2.jpg"],
  ["keller", "Kellerwand vor dem Abdichten", "Verputzte Kellerwand aus Naturstein"],
  ["flex", "Vinyl-Asbest-Platten", "Dunloplan Pastell-Polyflex.jpg"],
  ["parkett", "Mosaikparkett, netzverklebt", "21 Parkett3.jpg"],
  ["fliesen", "Fliesenverlegung", "Verlegen von Fliesen mit einem Nivellier"],
  ["linoleum", "Historischer Linoleumboden", "VillaRotLinoleum.jpg"],
  ["teppich", "Teppich und Unterlage, aufgenommen", "Wall to wall carpet and carpet pad.jpg"],
  ["laminat", "Laminat, Nahaufnahme", "Quick-step-laminat-eiche-dunkel-geoelt"],
  ["kunstharz", "Epoxidharz-Beschichtung", "Pavimento in resina.jpg"],
  ["m-beton", "Sichtbeton", "Bauhaus Museum Weimar, Neubau 2018, Sich"],
  ["m-estrich", "Estrich, geglättet", "Estrichglaettung 5.jpg"],
  ["m-mauerwerk", "Hochlochziegel", "Porotherm style clay block bricks angle"],
  ["m-mineralwolle", "Mineralwolle", "Arrangement Mineralwolle.jpeg"],
  ["m-eps", "EPS-Hartschaum", "EPS insulation board.jpg"],
  ["m-holz", "Kantholz", "Uso Fiume.jpg"],
  ["m-gips", "Gipskartonwand, verspachtelt", "Drywall.jpg"],
  ["m-putz", "Kalkputz", "Blue window on white lime plaster wall"],
  ["m-bims", "Naturbims (Neuwieder Becken)", "Bims.jpeg"],
  ["m-lehm", "Lehmputz", "Mud plaster over straw bales wall.jpg"],
  ["m-schlacke", "Granulierte Hochofenschlacke", "Granulated slag"],
  ["m-kies", "Splitt", "10mm-crushed-pebbles.jpg"],
  ["m-asphalt", "Gussasphalt im Schnitt", "Внутренняя структура составов литой"],
  ["m-erde", "Bodenprofil", "2014-07-06 Bodenprofil Postluch"],
  ["holzbalken-2", "Offener Fehlboden mit Schüttung", "Aufgeschütteter Fehlboden.jpg"],
  ["kappe-2", "Gemauerte Kappendecken", "Gemauerte Kappendecken.jpg"],
  ["kappe-3", "Stahlträger und Kappen im Keller", "Gesundbrunnen Luisenhaus Keller.jpg"],
  ["hohldiele-2", "Verlegte Hohldielen von oben", "Hollow core slab.JPG"],
  ["bsp-2", "Deckenaufbau im Holz-Hybrid-Bau", "LCT ONE 02 - ceiling structure.jpg"],
  ["ortbeton-kern", "Bohrkern aus Beton", "Carotte de béton \"ultra bas carbone\" - SOLIDEO.jpg"],
  ["stbwand-kern", "Bohrkerne am Hochbunker Heußweg, Hamburg", "Hochbunker Heußweg 114, Hamburg-Eimsbüttel (10).jpg"],
  ["kern-poller", "Bohrkern und Bohrloch im Belag", "Kernbohrung für Betonpoller.jpg"],
  ["kern-geraet", "Kernbohrgerät mit Zubehör", "Kernbohrgeraet.jpg"],
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const clean = s => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
async function api(params) {
  const u = `${API}?format=json&${new URLSearchParams(params)}`;
  return (await polite(u)).json();
}
// Commons rate-limits with 429: honour Retry-After and try again instead of pressing on.
async function polite(url) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.status !== 429) { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r; }
    await sleep((+r.headers.get("retry-after") || 30) * 1000);
  }
  throw new Error("429");
}
async function resolve(name) {
  if (/\.(jpe?g|png)$/i.test(name)) return name;
  const j = await api({ action: "query", list: "allimages", aiprefix: name.replace(/ /g, "_"), ailimit: 1 });
  const hit = j.query.allimages[0]?.name.replace(/_/g, " ");
  if (hit) return hit;
  const s = await api({ action: "query", list: "search", srnamespace: 6, srsearch: name, srlimit: 1 });
  return s.query.search[0]?.title.replace(/^File:/, "");
}

(async () => {
  const out = [], missing = [];
  const old = fs.existsSync(path.join(ROOT, "data/bilder.json")) ? JSON.parse(fs.readFileSync(path.join(ROOT, "data/bilder.json"))) : [];
  for (const [id, titel, name] of LIST) {
    const known = old.find(b => b.id === id);
    if (known && fs.existsSync(path.join(ROOT, "img/fotos", known.datei))) { out.push(known); continue; }
    try {
      const file = await resolve(name);
      if (!file) throw new Error("nicht gefunden");
      const j = await api({ action: "query", titles: `File:${file}`, prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: 480, iiextmetadatafilter: "Artist|LicenseShortName" });
      const info = Object.values(j.query.pages)[0].imageinfo?.[0];
      if (!info) throw new Error("keine Bildinfo");
      const img = await polite(info.thumburl);
      const datei = `${id}.jpg`;
      fs.writeFileSync(path.join(ROOT, "img/fotos", datei), Buffer.from(await img.arrayBuffer()));
      out.push({ id, datei, titel, urheber: clean(info.extmetadata?.Artist?.value) || "unbekannt", lizenz: clean(info.extmetadata?.LicenseShortName?.value) || "siehe Quelle", url: info.descriptionurl });
    } catch (e) { missing.push(`${id}: ${e.message}`); }
    await sleep(3000);
  }
  fs.writeFileSync(path.join(ROOT, "data/bilder.json"), JSON.stringify(out, null, 1) + "\n");
  console.log(`${out.length} Fotos, ${missing.length} fehlen`);
  missing.forEach(m => console.log("  " + m));
})();
