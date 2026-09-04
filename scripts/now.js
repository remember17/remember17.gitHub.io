(function () {
  var videoShell = document.querySelector('[data-now-video]');
  var video = videoShell && videoShell.querySelector('video');
  var playButton = document.querySelector('[data-now-video-play]');

  if (videoShell && video && playButton) {
    function syncState() {
      videoShell.classList.toggle('is-playing', !video.paused && !video.ended);
    }

    video.addEventListener('loadedmetadata', function () {
      videoShell.classList.add('is-ready');
    });
    video.addEventListener('play', syncState);
    video.addEventListener('pause', syncState);
    video.addEventListener('ended', syncState);

    playButton.addEventListener('click', function () {
      var playRequest = video.play();
      if (playRequest && typeof playRequest.catch === 'function') {
        playRequest.catch(function () {
          videoShell.classList.remove('is-playing');
        });
      }
    });
  }

  var popover = document.querySelector('[data-now-store-popover]');
  var popoverLink = document.querySelector('[data-now-store-popover-link]');
  var popoverQr = document.querySelector('[data-now-store-popover-qr]');
  var storeLinks = document.querySelectorAll('[data-now-store-link]');
  var hideTimer = null;
  var closeTimer = null;
  var pinned = false;

  if (!popover || !popoverLink || !popoverQr || !storeLinks.length) return;

  function positionPopover(anchor) {
    var rect = anchor.getBoundingClientRect();
    var width = Math.min(220, window.innerWidth - 24);
    var estimatedHeight = 320;
    var gap = 10;
    var showAbove = window.innerHeight - rect.bottom < estimatedHeight + 16 && rect.top > estimatedHeight + 16;
    var left = rect.left + rect.width / 2 - width / 2;

    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    popover.classList.toggle('is-above', showAbove);
    popover.style.width = width + 'px';
    popover.style.left = left + 'px';

    if (showAbove) {
      popover.style.top = '';
      popover.style.bottom = window.innerHeight - rect.top + gap + 'px';
    } else {
      popover.style.top = rect.bottom + gap + 'px';
      popover.style.bottom = '';
    }
  }

  function showPopover(anchor, shouldPin) {
    clearTimeout(hideTimer);
    clearTimeout(closeTimer);
    pinned = Boolean(shouldPin);
    popoverLink.href = anchor.getAttribute('data-now-store-href') || anchor.href || '#';
    popoverQr.src = anchor.getAttribute('data-now-qr-src') || '';
    positionPopover(anchor);
    popover.removeAttribute('hidden');
    void popover.offsetHeight;
    popover.classList.add('is-visible');
  }

  function hidePopover() {
    pinned = false;
    popover.classList.remove('is-visible');
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      popover.setAttribute('hidden', '');
    }, 260);
  }

  function scheduleHide() {
    if (pinned) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hidePopover, 200);
  }

  Array.prototype.forEach.call(storeLinks, function (link) {
    link.addEventListener('mouseenter', function () {
      showPopover(link, false);
    });
    link.addEventListener('mouseleave', scheduleHide);
    link.addEventListener('focus', function () {
      showPopover(link, false);
    });
    link.addEventListener('blur', scheduleHide);
    link.addEventListener('click', function () {
      showPopover(link, true);
    });
  });

  popover.addEventListener('mouseenter', function () {
    clearTimeout(hideTimer);
  });
  popover.addEventListener('mouseleave', scheduleHide);

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (target && typeof target.closest === 'function' && (target.closest('[data-now-store-link]') || target.closest('[data-now-store-popover]'))) return;
    hidePopover();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') hidePopover();
  });

  window.addEventListener('resize', hidePopover);
  window.addEventListener('scroll', hidePopover, { passive: true });
})();
