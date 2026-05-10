// Mark page as embedded when loaded with ?embed=1 — admin shell hides each
// subpage's own sidebar/header so content renders cleanly inside the iframe.
(function () {
  try {
    var p = new URLSearchParams(window.location.search);
    if (p.get('embed') === '1') {
      document.documentElement.setAttribute('data-embed', '1');
    }
  } catch (e) {}
})();
