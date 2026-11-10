// App icons of the KE app family (approved 2026-11-08, style "KE-Strich"): dark KE ground, light
// pictogram with one part in the app colour, accent bar from the KE "E" at the bottom.
// Used by the menu ("Alle KE-Apps") and by tools/icons-rendern.ps1 for the PNG files.
(function (root) {
  const BG = "#0a0e13", HELL = "#e9eef3";
  const ZEICHEN = {
    stempeluhr: a => `<circle cx="48" cy="48" r="25" fill="none" stroke="${HELL}" stroke-width="6"/><path d="M48 33V48L59 55" fill="none" stroke="${a}" stroke-width="6" stroke-linecap="square"/>`,
    baulexikon: a => `<g fill="none"><path d="M25 30H71" stroke="${HELL}" stroke-width="6"/><path d="M25 42H71" stroke="${HELL}" stroke-width="2.7" opacity=".7"/><path d="M25 53H71" stroke="${a}" stroke-width="8.1"/><path d="M25 66H71" stroke="${HELL}" stroke-width="6"/></g>`,
    asbestrechner: a => `<g fill="none"><circle cx="44" cy="44" r="18" stroke="${HELL}" stroke-width="6"/><path d="M57 57L71 71" stroke="${HELL}" stroke-width="7.8" stroke-linecap="square"/><path d="M34 52L54 36M36 44L50 38M38 54L52 46" stroke="${a}" stroke-width="2.6"/></g>`,
    abfallcheck: a => `<g fill="none"><path d="M21 40H75L67 68H29Z" stroke="${HELL}" stroke-width="6"/><path d="M17 40H21M75 40H79" stroke="${HELL}" stroke-width="6"/><path d="M38 53L45 60L58 47" stroke="${a}" stroke-width="6" stroke-linecap="square"/></g>`
  };
  // online: shown under "Alle KE-Apps" only once the subdomain is live.
  const APPS = {
    stempeluhr: { name: "Stempeluhr", farbe: "#b3a8ff", url: "https://stempeluhr.kellerer-engineering.de/", online: true },
    baulexikon: { name: "Baulexikon", farbe: "#8fd3ff", url: "https://baulexikon.kellerer-engineering.de/", online: true },
    asbestrechner: { name: "Asbestrechner", farbe: "#ffc24d", url: "https://asbestrechner.kellerer-engineering.de/", online: true },
    abfallcheck: { name: "AbfallCheck", farbe: "#7fdc9a", url: "https://abfallcheck.kellerer-engineering.de/", online: false }
  };
  function svg(id, groesse) {
    const a = APPS[id].farbe, g = groesse ? ` width="${groesse}" height="${groesse}"` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"${g} aria-hidden="true"><rect width="96" height="96" fill="${BG}"/>` +
      `<g transform="translate(0 -4)">${ZEICHEN[id](a)}</g><path d="M36 80H60" stroke="${a}" stroke-width="4"/></svg>`;
  }
  const KE_ICONS = { APPS, svg };
  if (typeof module !== "undefined") module.exports = KE_ICONS;
  else root.KE_ICONS = KE_ICONS;
})(this);
