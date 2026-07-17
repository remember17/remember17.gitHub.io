(function () {
  'use strict';

  var script = document.currentScript;
  var configuredApiBase = script && script.dataset ? script.dataset.apiBase : '';
  var chooseByNeedEvent = 'home.choose_by_need.click';
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
      path: location.pathname || '/',
      vid: getVisitorId(),
    });
  }

  if (typeof document.addEventListener === 'function') {
    document.addEventListener(
      'click',
      function (event) {
        var target = event.target;
        if (!target || typeof target.closest !== 'function') return;

        var element = target.closest('[data-analytics-event]');
        if (
          !element ||
          element.dataset.analyticsEvent !== chooseByNeedEvent
        ) {
          return;
        }

        send('/v1/analytics/event', { eventKey: chooseByNeedEvent });
      },
      { capture: true },
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', recordPageView, { once: true });
  } else {
    setTimeout(recordPageView, 0);
  }
})();
