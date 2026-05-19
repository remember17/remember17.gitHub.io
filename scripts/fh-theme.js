/**
 * FiveHow Theme — detect / persist / toggle dark ↔ light.
 * Shares localStorage key with the homepage so preference syncs.
 *
 * When opened from a native app, the URL parameter `appTheme` takes
 * highest priority and disables user toggle.
 *
 * Usage:
 *   <script src="/scripts/fh-theme.js"></script>
 *   window.__fhTheme.toggle();
 *   window.__fhTheme.current(); // 'dark' | 'light'
 */
(function () {
  var KEY = 'fivehow-home-theme';
  var root = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');

  // Check for native app theme override via URL parameter
  var appTheme = (function () {
    try {
      var params = new URLSearchParams(window.location.search);
      var val = params.get('appTheme');
      if (val === 'light' || val === 'dark') return val;
    } catch (_) { /* ignore */ }
    return null;
  })();

  function detect() {
    if (appTheme) return appTheme;
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (_) { /* private browsing */ }
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    if (!appTheme) {
      try { localStorage.setItem(KEY, theme); } catch (_) { /* private browsing */ }
    }
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#11100d' : '#ffffff');
    }
  }

  function toggle() {
    if (appTheme) return; // locked by native app
    apply(current() === 'dark' ? 'light' : 'dark');
  }

  function current() {
    return root.getAttribute('data-theme') || 'dark';
  }

  // Apply immediately to prevent flash
  apply(detect());

  window.__fhTheme = { apply: apply, toggle: toggle, current: current };
})();
