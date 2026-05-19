/**
 * FiveHow Site Nav runtime —
 *  - Detects native (Hybrid) container and toggles back arrow.
 *  - Wires theme + back button.
 *  - Writes --fh-site-nav-height for content layout.
 *
 * Loaded with `defer` after fh-theme.js / fh-i18n.js / iconify.
 */
(function () {
  var root = document.documentElement;

  function isNative() {
    try {
      return typeof window.FiveHowNativeBridge === 'object' &&
        window.FiveHowNativeBridge !== null &&
        typeof window.FiveHowNativeBridge.request === 'function';
    } catch (_) {
      return false;
    }
  }

  function applyHybridFlag() {
    if (isNative()) {
      root.setAttribute('data-fh-hybrid', '1');
    } else {
      root.removeAttribute('data-fh-hybrid');
    }
  }

  function sanitizeHomeHref(rawHref) {
    if (typeof rawHref !== 'string' || rawHref.trim() === '') {
      return '/';
    }

    try {
      var url = new URL(rawHref, window.location.origin);
      if (url.origin !== window.location.origin) {
        return '/';
      }
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return '/';
    }
  }

  function goBackOrFallback(homeHref) {
    if (isNative()) {
      try {
        window.FiveHowNativeBridge.request('app.goBackOrClose', null);
        return;
      } catch (_) { /* ignore and fallback to web behavior */ }
    }

    try {
      if (window.history && window.history.length > 1) {
        window.history.back();
        return;
      }
    } catch (_) { /* ignore */ }

    window.location.href = sanitizeHomeHref(homeHref);
  }

  function bindBackButton(nav) {
    var btn = nav.querySelector('[data-fh-back]');
    if (!btn || btn.__bound) return;
    btn.__bound = true;
    btn.addEventListener('click', function () {
      goBackOrFallback(btn.getAttribute('data-home-href'));
    });
  }

  function bindThemeButton(nav) {
    var btn = nav.querySelector('[data-fh-theme-toggle]');
    if (!btn || btn.__bound) return;
    btn.__bound = true;
    btn.addEventListener('click', function () {
      if (window.__fhTheme && typeof window.__fhTheme.toggle === 'function') {
        window.__fhTheme.toggle();
      }
    });
  }

  function measure(nav) {
    var h = nav.offsetHeight;
    if (h > 0) {
      root.style.setProperty('--fh-site-nav-height', h + 'px');
      // Also keep AppTopNav offset compatible so legacy layouts still align.
      root.style.setProperty('--fh-top-nav-offset', h + 'px');
    }
  }

  function init() {
    applyHybridFlag();
    var nav = document.querySelector('[data-fh-site-nav]');
    if (!nav) return;
    bindBackButton(nav);
    bindThemeButton(nav);
    measure(nav);

    window.addEventListener('resize', function () { measure(nav); });
    window.addEventListener('orientationchange', function () { measure(nav); });
    // Re-check native bridge shortly after load (some bridges inject async).
    window.setTimeout(applyHybridFlag, 200);
    window.setTimeout(function () { measure(nav); }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
