// Match Aster's auto-hide timing and per-scroller behavior without coupling builds.
(function () {
  const activeAttribute = 'data-scroll-active';
  const hideDelayMs = 900;
  const hideTimers = new Map();

  function handleScroll(event) {
    const target = event.target;
    const scroller = target === document || target === document.documentElement || target === document.body
      ? document.documentElement
      : target instanceof Element ? target : null;
    if (!scroller) return;

    if (!scroller.hasAttribute(activeAttribute)) scroller.setAttribute(activeAttribute, '');
    const pending = hideTimers.get(scroller);
    if (pending !== undefined) window.clearTimeout(pending);
    hideTimers.set(scroller, window.setTimeout(() => {
      hideTimers.delete(scroller);
      scroller.removeAttribute(activeAttribute);
    }, hideDelayMs));
  }

  // Scroll does not bubble; capture also observes dynamically added containers.
  document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
})();
