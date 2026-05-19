/**
 * FiveHow i18n runtime — minimal zh/en switcher.
 *
 * Usage in markup:
 *   <span data-fh-text='{"zh":"中文","en":"English"}'>中文</span>
 *   <input data-fh-placeholder='{"zh":"...","en":"..."}'>
 *   <a data-fh-aria-label='{"zh":"...","en":"..."}'>
 *
 * Toggle button:
 *   <button data-fh-lang-toggle data-fh-text='{"zh":"EN","en":"中"}'>EN</button>
 *
 * Persists choice in localStorage. URL `?lang=zh|en` overrides.
 *
 * Companion to /scripts/fh-theme.js. Both should be loaded as
 * `is:inline` in <head> to avoid flash.
 */
(function () {
  var KEY = 'fivehow-home-lang';
  var root = document.documentElement;

  function detect() {
    try {
      var p = new URLSearchParams(window.location.search).get('lang');
      if (p === 'zh' || p === 'en') return p;
    } catch (_) { /* ignore */ }
    try {
      var saved = localStorage.getItem(KEY);
      if (saved === 'zh' || saved === 'en') return saved;
    } catch (_) { /* ignore */ }
    return 'zh';
  }

  function current() {
    return root.getAttribute('data-lang') === 'en' ? 'en' : 'zh';
  }

  function parse(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
  }

  function pick(map, lang) {
    if (!map) return '';
    return map[lang] != null ? map[lang] : (map.zh != null ? map.zh : (map.en != null ? map.en : ''));
  }

  function applyAll(lang) {
    // New canonical attributes.
    document.querySelectorAll('[data-fh-text]').forEach(function (n) {
      var v = pick(parse(n.getAttribute('data-fh-text')), lang);
      if (v != null) n.textContent = v;
    });
    document.querySelectorAll('[data-fh-placeholder]').forEach(function (n) {
      var v = pick(parse(n.getAttribute('data-fh-placeholder')), lang);
      if (v != null) n.setAttribute('placeholder', v);
    });
    document.querySelectorAll('[data-fh-aria-label]').forEach(function (n) {
      var v = pick(parse(n.getAttribute('data-fh-aria-label')), lang);
      if (v != null) n.setAttribute('aria-label', v);
    });
    document.querySelectorAll('[data-fh-title]').forEach(function (n) {
      var v = pick(parse(n.getAttribute('data-fh-title')), lang);
      if (v != null) n.setAttribute('title', v);
    });
    document.querySelectorAll('[data-fh-src]').forEach(function (n) {
      var v = pick(parse(n.getAttribute('data-fh-src')), lang);
      if (v) n.setAttribute('src', v);
    });

    // Legacy attributes used by the home page (keeps existing
    // translations working without rewriting every node).
    document.querySelectorAll('[data-lang-copy]').forEach(function (n) {
      // Skip nodes whose data-lang-copy is intended as a key for other
      // attribute lookups (e.g. status-key) rather than direct text.
      if (n.hasAttribute('data-fh-text')) return;
      var v = pick(parse(n.getAttribute('data-lang-copy')), lang);
      if (v != null) n.textContent = v;
    });
    document.querySelectorAll('[data-lang-placeholder]').forEach(function (n) {
      var v = pick(parse(n.getAttribute('data-lang-placeholder')), lang);
      if (v != null) n.setAttribute('placeholder', v);
    });
    document.querySelectorAll('[data-lang-aria-label]').forEach(function (n) {
      var v = pick(parse(n.getAttribute('data-lang-aria-label')), lang);
      if (v != null) n.setAttribute('aria-label', v);
    });
    document.querySelectorAll('[data-lang-src]').forEach(function (n) {
      var v = pick(parse(n.getAttribute('data-lang-src')), lang);
      if (v) n.setAttribute('src', v);
    });
  }

  function apply(lang) {
    if (lang !== 'zh' && lang !== 'en') lang = 'zh';
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');
    try { localStorage.setItem(KEY, lang); } catch (_) { /* ignore */ }
    applyAll(lang);
    document.dispatchEvent(new CustomEvent('fh:lang-change', { detail: { lang: lang } }));
  }

  function toggle() {
    apply(current() === 'zh' ? 'en' : 'zh');
  }

  // Apply immediately so initial paint matches saved language.
  apply(detect());

  // Re-apply once DOM is fully ready (in case nodes weren't yet present).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      applyAll(current());
      bindToggles();
    });
  } else {
    bindToggles();
  }

  function bindToggles() {
    document.querySelectorAll('[data-fh-lang-toggle]').forEach(function (btn) {
      if (btn.__fhLangBound) return;
      btn.__fhLangBound = true;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        toggle();
      });
    });
  }

  window.__fhI18n = { apply: apply, toggle: toggle, current: current, refresh: function () { applyAll(current()); bindToggles(); } };
})();
