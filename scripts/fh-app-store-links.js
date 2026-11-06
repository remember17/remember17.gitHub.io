(function () {
  if (!/MicroMessenger/i.test(navigator.userAgent)) return;

  document.addEventListener(
    'click',
    function (event) {
      var target = event.target;
      if (!target || typeof target.closest !== 'function') return;

      var link = target.closest('a[href]');
      if (!link) return;

      try {
        var storeUrl = new URL(link.href, window.location.href);
        if (storeUrl.protocol !== 'https:' || storeUrl.hostname !== 'apps.apple.com') return;

        link.href = '/helper/wechat-redirect?target=' + encodeURIComponent(storeUrl.href);
      } catch (error) {
        // Leave malformed and non-HTTP links to the browser.
      }
    },
    true
  );
})();
