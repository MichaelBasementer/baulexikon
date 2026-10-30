// Search over all entries. No DOM here, so test-search.js can run it in Node.
const Search = (() => {
  const fold = s => String(s).toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[*.,()/\-]/g, " ").replace(/\s+/g, " ").trim();
  const compact = s => fold(s).replace(/ /g, "");

  // entries: { titel, sub, stichworte, route }
  const build = entries => entries.map(e => ({
    ...e,
    t: compact(e.titel),
    h: compact([e.titel, e.sub, e.stichworte].filter(Boolean).join(" ")),
  }));

  // "170605" and "17 06 05*" must meet, so the whole query is tried without spaces first,
  // then word by word for queries like "holz decke".
  function find(index, query, limit = 30) {
    const whole = compact(query);
    if (!whole) return [];
    const terms = fold(query).split(" ").filter(Boolean);
    return index
      .map(e => {
        let score = 0;
        if (e.t === whole) score = 4;
        else if (e.t.startsWith(whole)) score = 3;
        else if (e.t.includes(whole)) score = 2;
        else if (e.h.includes(whole) || terms.every(w => e.h.includes(w))) score = 1;
        return { e, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || a.e.titel.localeCompare(b.e.titel, "de"))
      .slice(0, limit)
      .map(x => x.e);
  }

  return { fold, compact, build, find };
})();
if (typeof module !== "undefined") module.exports = Search;
