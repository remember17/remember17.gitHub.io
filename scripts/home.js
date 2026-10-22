(function () {
  const root = document.documentElement;
  const dialog = document.querySelector('[data-product-lightbox]');
  const fullImage = dialog?.querySelector('[data-product-lightbox-image]');
  let activeButton = null;
  let previousOverflow = '';

  function syncScreenshots() {
    const dark = root.dataset.theme === 'dark';
    const english = root.dataset.lang === 'en';
    document.querySelectorAll('img[data-screenshot-light]').forEach((image) => {
      const source = english
        ? (dark ? image.dataset.screenshotEnDark : image.dataset.screenshotEnLight)
        : (dark ? image.dataset.screenshotDark : image.dataset.screenshotLight);
      if (source && image.getAttribute('src') !== source) image.src = source;
    });
    if (dialog?.open && activeButton) syncFullImage();
  }

  function syncFullImage() {
    const thumbnail = activeButton?.querySelector('img');
    if (!thumbnail || !fullImage) return;
    // Use the source attribute so a theme/language change does not copy a stale
    // currentSrc while the newly selected image is still loading.
    fullImage.src = thumbnail.src;
    fullImage.alt = thumbnail.alt;
  }

  syncScreenshots();
  new MutationObserver(syncScreenshots).observe(root, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-lang'],
  });
  document.addEventListener('fh:lang-change', syncScreenshots);

  if (!dialog || !fullImage) return;

  document.querySelectorAll('[data-product-zoom]').forEach((button) => {
    button.addEventListener('click', () => {
      activeButton = button;
      syncFullImage();
      previousOverflow = root.style.overflow;
      dialog.showModal();
      root.style.overflow = 'hidden';
    });
  });

  dialog.querySelector('[data-product-lightbox-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  // Native dialog handles Escape and contains keyboard focus while open.
  dialog.addEventListener('close', () => {
    root.style.overflow = previousOverflow;
    activeButton?.focus({ preventScroll: true });
    activeButton = null;
  });
})();
