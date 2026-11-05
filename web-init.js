// Website edition: same app and data, own look. Runs synchronously in <head>, so document.write
// keeps the styles render-blocking and the phone look never flashes. An own file instead of an
// inline script, so the website's Content-Security-Policy (script-src 'self') lets it run.
if (location.pathname.includes("/werkzeuge/baulexikon/")) {
  document.documentElement.classList.add("web");
  document.querySelector('link[rel="manifest"]').remove();
  document.querySelector('meta[name="theme-color"]').content = "#0a0e13";
  document.title = "KE Baulexikon – Kellerer Engineering";
  document.write('<link rel="stylesheet" href="../../assets/site.css"><link rel="stylesheet" href="web.css">');
}
