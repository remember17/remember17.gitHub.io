(function () {
  'use strict';

  var script = document.currentScript;
  var configuredApiBase = script && script.dataset ? script.dataset.apiBase : '';
  var configuredPagePath = script && script.dataset ? script.dataset.pageViewPath : '';
  var visitorIdKey = 'fh.visitor.id';

  function send(path, params) {
    if (!configuredApiBase) return;

    var endpoint = new URL(
      path,
      String(configuredApiBase).replace(/\/+$/, ''),
    );
    Object.keys(params).forEach(function (key) {
      if (params[key]) {
        endpoint.searchParams.set(key, params[key]);
      }
    });

    fetch(endpoint.toString(), {
      method: 'POST',
      credentials: 'omit',
      cache: 'no-store',
      keepalive: true,
    }).catch(function () {
      // Analytics must never interfere with the page experience.
    });
  }

  // Random id persisted in localStorage. Server-side it only feeds a
  // HyperLogLog cardinality estimate, so individual ids are never stored.
  function getVisitorId() {
    try {
      var stored = window.localStorage.getItem(visitorIdKey);
      if (stored && /^[A-Za-z0-9-]{8,64}$/.test(stored)) {
        return stored;
      }
      var created = createVisitorId();
      window.localStorage.setItem(visitorIdKey, created);
      return created;
    } catch (error) {
      return '';
    }
  }

  function createVisitorId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    var id = '';
    for (var index = 0; index < 32; index += 1) {
      id += Math.floor(Math.random() * 16).toString(16);
    }
    return id;
  }

  function recordPageView() {
    send('/v1/analytics/page-view', {
      path: configuredPagePath || location.pathname || '/',
      vid: getVisitorId(),
    });
  }

  function recordDownloadClick(event) {
    if (!configuredApiBase) return;
    var target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    var link = target.closest('a[data-download-product]');
    if (!link || !link.dataset.downloadTarget || !link.dataset.downloadSource) return;

    try {
      var endpoint = new URL('/v1/analytics/downloads', configuredApiBase);
      fetch(endpoint.toString(), {
        method: 'POST',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 1,
          productId: link.dataset.downloadProduct,
          targetId: link.dataset.downloadTarget,
          source: link.dataset.downloadSource,
          visitorId: getVisitorId() || undefined,
        }),
      }).catch(function () {
        // A failed report must never block or retry a download.
      });
    } catch (error) {
      // Invalid configuration and unavailable browser APIs cannot block links.
    }
  }

  if (typeof document.addEventListener === 'function') {
    document.addEventListener(
      'click',
      function (event) {
        if (typeof event.button === 'number' && event.button !== 0) return;
        recordDownloadClick(event);
        var target = event.target;
        if (!target || typeof target.closest !== 'function') return;

        var element = target.closest('[data-analytics-event]');
        var eventKey = element && element.dataset.analyticsEvent;
        if (!eventKey) {
          return;
        }

        send('/v1/analytics/event', { eventKey: eventKey });
      },
      { capture: true },
    );

    document.addEventListener('auxclick', function (event) {
      if (event.button === 1) recordDownloadClick(event);
    }, { capture: true });

    document.addEventListener('fh:analytics', function (event) {
      var eventKey = event && event.detail && event.detail.eventKey;
      if (typeof eventKey === 'string' && eventKey) {
        send('/v1/analytics/event', { eventKey: eventKey });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', recordPageView, { once: true });
  } else {
    setTimeout(recordPageView, 0);
  }
})();
