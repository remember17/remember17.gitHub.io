const root = document.documentElement;
const langToggle = document.querySelector('[data-lang-toggle]');
const themeToggle = document.querySelector('[data-theme-toggle]');
const langNodes = document.querySelectorAll('[data-lang-copy]');
const langSrcNodes = document.querySelectorAll('[data-lang-src]');
const langAriaLabelNodes = document.querySelectorAll('[data-lang-aria-label]');
const langPlaceholderNodes = document.querySelectorAll('[data-lang-placeholder]');

const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const spotlightBoards = document.querySelectorAll('[data-product-spotlight]');

const LANG_KEY = 'fivehow-home-lang';
const THEME_KEY = 'fivehow-home-theme';

function parseCopyValue(raw) {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('[home] Failed to parse copy', error);
    return null;
  }
}

function parseCopy(node) {
  return parseCopyValue(node.getAttribute('data-lang-copy'));
}

function resolveCopy(raw, lang) {
  const parsed = parseCopyValue(raw);
  if (!parsed) return '';
  return parsed?.[lang] ?? parsed?.zh ?? parsed?.en ?? '';
}

function currentLang() {
  return root.getAttribute('data-lang') || 'zh';
}

function currentTheme() {
  return root.getAttribute('data-theme') || 'dark';
}

function syncThemeButton() {
  if (!themeToggle) return;

  const lang = currentLang();
  const key = currentTheme() === 'dark' ? 'data-theme-label-light' : 'data-theme-label-dark';
  const label = resolveCopy(themeToggle.getAttribute(key) || '', lang);
  themeToggle.setAttribute('aria-label', label);
}

function syncThemeColor() {
  if (!themeColorMeta) return;
  themeColorMeta.setAttribute('content', currentTheme() === 'dark' ? '#11100d' : '#ffffff');
}

function applyLang(lang) {
  root.setAttribute('data-lang', lang);
  localStorage.setItem(LANG_KEY, lang);

  langNodes.forEach((node) => {
    const copy = parseCopy(node);
    if (!copy) return;
    node.textContent = copy[lang] ?? copy.zh ?? '';
  });

  // Segmented mixed-script labels (e.g. "记录Box"): rebuild CJK/Latin spans
  // so each script keeps its optically matched face.
  document.querySelectorAll('[data-lang-segments]').forEach((node) => {
    const raw = node.getAttribute('data-lang-segments');
    const parsed = parseCopyValue(raw);
    if (!parsed) return;
    const segments = parsed[lang] ?? parsed.zh ?? [];
    node.textContent = '';
    segments.forEach((seg) => {
      const span = document.createElement('span');
      const isCjk = /[\u3400-\u9FFF\uF900-\uFAFF]/.test(seg.t);
      span.className = isCjk ? 'is-cjk' : 'is-latin';
      span.textContent = seg.t;
      node.appendChild(span);
    });
  });

  langPlaceholderNodes.forEach((node) => {
    const copy = parseCopyValue(node.getAttribute('data-lang-placeholder'));
    if (!copy) return;
    node.setAttribute('placeholder', copy[lang] ?? copy.zh ?? '');
  });

  langSrcNodes.forEach((node) => {
    const copy = parseCopyValue(node.getAttribute('data-lang-src'));
    if (!copy) return;
    const resolved = copy[lang] ?? copy.zh ?? '';
    if (resolved) {
      node.setAttribute('src', resolved);
    }
  });

  langAriaLabelNodes.forEach((node) => {
    const copy = parseCopyValue(node.getAttribute('data-lang-aria-label'));
    if (!copy) return;
    node.setAttribute('aria-label', copy[lang] ?? copy.zh ?? '');
  });

  if (langToggle) {
    const toggleCopy = parseCopy(langToggle);
    if (toggleCopy) {
      langToggle.textContent = toggleCopy[lang] ?? toggleCopy.zh ?? '';
    }
  }

  syncThemeButton();
}

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  syncThemeColor();
  syncThemeButton();
}

function activateSpotlightProduct(board, productId) {
  const triggers = board.querySelectorAll('[data-spotlight-trigger]');
  const panels = board.querySelectorAll('[data-spotlight-panel]');
  const activeTrigger = Array.from(triggers).find((trigger) => trigger.getAttribute('data-product-id') === productId);
  const hasMatch = Array.from(panels).some((panel) => panel.getAttribute('data-product-id') === productId);

  if (!hasMatch || !activeTrigger) return;

  board.dataset.activeProduct = productId;

  triggers.forEach((trigger) => {
    const isActive = trigger.getAttribute('data-product-id') === productId;
    trigger.classList.toggle('is-active', isActive);
    trigger.setAttribute('aria-pressed', String(isActive));
  });

  panels.forEach((panel) => {
    panel.classList.toggle('is-active', panel.getAttribute('data-product-id') === productId);
  });
}

const initialLang = localStorage.getItem(LANG_KEY) || 'zh';
const initialTheme = localStorage.getItem(THEME_KEY) || 'dark';

applyTheme(initialTheme);
applyLang(initialLang);

spotlightBoards.forEach((board) => {
  const triggers = board.querySelectorAll('[data-spotlight-trigger]');
  const initialProductId =
    board.dataset.activeProduct || triggers[0]?.getAttribute('data-product-id') || '';

  activateSpotlightProduct(board, initialProductId);

  triggers.forEach((trigger) => {
    const productId = trigger.getAttribute('data-product-id') || '';

    // Click only — hover must not auto-switch the active product.
    trigger.addEventListener('click', () => activateSpotlightProduct(board, productId));
  });
});

langToggle?.addEventListener('click', () => {
  applyLang(currentLang() === 'zh' ? 'en' : 'zh');
});

themeToggle?.addEventListener('click', () => {
  applyTheme(currentTheme() === 'light' ? 'dark' : 'light');
});

// Sync with the global SiteNav language toggle (fh-i18n.js).
document.addEventListener('fh:lang-change', (event) => {
  const next = event?.detail?.lang;
  if (next === 'zh' || next === 'en') {
    if (currentLang() !== next) {
      applyLang(next);
    }
  }
});

// --- Product popover ---

const productPopover = document.querySelector('[data-product-popover]');
const productPopoverLink = document.querySelector('[data-product-popover-link]');
const productPopoverQr = document.querySelector('[data-product-popover-qr]');
const productLinks = document.querySelectorAll('[data-product-link]');
let popoverTimeout = null;
// Click-open pins the popover so restricted browsers still leave a scannable
// QR on screen; hover-only opens still auto-dismiss.
let popoverPinned = false;

var productQrMap = {
  'https://apps.apple.com/app/id6446240226': '/assets/products/qr/today.png',
  'https://apps.apple.com/app/id6758816670': '/assets/products/qr/now-ios.png',
  'https://apps.apple.com/app/id6759785632': '/assets/products/qr/now-macos.png',
  'https://apps.apple.com/app/id1579304692': '/assets/products/qr/recordbox.png',
};

function positionPopover(anchor) {
  if (!productPopover) return;

  const rect = anchor.getBoundingClientRect();
  const popW = Math.min(220, window.innerWidth - 24);
  const popEstH = 320;
  const gap = 10;
  const spaceBelow = window.innerHeight - rect.bottom;
  const showAbove = spaceBelow < popEstH + 16 && rect.top > popEstH + 16;

  let left = rect.left + rect.width / 2 - popW / 2;
  if (left < 12) left = 12;
  if (left + popW > window.innerWidth - 12) left = window.innerWidth - 12 - popW;

  productPopover.classList.toggle('is-above', showAbove);
  productPopover.style.width = `${popW}px`;

  if (showAbove) {
    productPopover.style.left = `${left}px`;
    productPopover.style.top = '';
    productPopover.style.bottom = `${window.innerHeight - rect.top + gap}px`;
  } else {
    productPopover.style.left = `${left}px`;
    productPopover.style.top = `${rect.bottom + gap}px`;
    productPopover.style.bottom = '';
  }
}

function showPopover(anchor, options) {
  if (!productPopover || !productPopoverLink) return;

  clearTimeout(popoverTimeout);
  popoverPinned = Boolean(options && options.pin);

  const href = anchor.getAttribute('data-product-href') || anchor.href || '#';
  productPopoverLink.href = href;

  if (productPopoverQr && productQrMap[href]) {
    productPopoverQr.src = productQrMap[href];
  }

  positionPopover(anchor);
  productPopover.removeAttribute('hidden');

  void productPopover.offsetHeight;
  productPopover.classList.add('is-visible');

}

function hidePopover() {
  if (!productPopover) return;

  popoverPinned = false;
  productPopover.classList.remove('is-visible');

  clearTimeout(popoverTimeout);
  // Match --store-popover-duration (220ms) + small buffer for exit
  popoverTimeout = setTimeout(() => {
    productPopover.setAttribute('hidden', '');
  }, 260);
}

let popoverHideTimer = null;

function scheduleHide() {
  if (popoverPinned) return;
  clearTimeout(popoverHideTimer);
  popoverHideTimer = setTimeout(hidePopover, 200);
}

function cancelHide() {
  clearTimeout(popoverHideTimer);
}

productLinks.forEach((link) => {
  link.addEventListener('mouseenter', () => {
    if (!window.matchMedia('(hover: hover)').matches) return;
    cancelHide();
    // Hover previews stay soft-dismissible.
    showPopover(link, { pin: false });
  });

  link.addEventListener('mouseleave', () => {
    scheduleHide();
  });

  // Preserve link navigation while also leaving a QR fallback on screen.
  // The shared App Store handler routes WeChat clicks through the helper page.
  link.addEventListener('click', () => {
    cancelHide();
    showPopover(link, { pin: true });
  });
});

if (productPopover) {
  productPopover.addEventListener('mouseenter', cancelHide);
  productPopover.addEventListener('mouseleave', scheduleHide);
}

document.addEventListener('click', (event) => {
  if (!productPopover || productPopover.hasAttribute('hidden')) return;
  if (productPopover.contains(event.target)) return;
  var isProductLink = event.target.closest && event.target.closest('[data-product-link]');
  if (isProductLink) return;
  hidePopover();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && productPopover && !productPopover.hasAttribute('hidden')) {
    hidePopover();
  }
});

window.addEventListener('scroll', hidePopover, { passive: true });
