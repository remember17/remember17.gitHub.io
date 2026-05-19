const root = document.documentElement;
const body = document.body;
const langToggle = document.querySelector('[data-lang-toggle]');
const themeToggle = document.querySelector('[data-theme-toggle]');
const langNodes = document.querySelectorAll('[data-lang-copy]');
const langSrcNodes = document.querySelectorAll('[data-lang-src]');
const langPlaceholderNodes = document.querySelectorAll('[data-lang-placeholder]');

const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const galleryCards = document.querySelectorAll('[data-gallery-card]');
const spotlightBoards = document.querySelectorAll('[data-product-spotlight]');
const contactFeedbackForm = document.querySelector('[data-contact-feedback-form]');
const contactFeedbackInput = document.querySelector('[data-contact-feedback-input]');
const contactFeedbackStatus = document.querySelector('[data-contact-feedback-status]');
const contactFeedbackSubmit = document.querySelector('[data-contact-feedback-submit]');
const galleryModal = document.querySelector('[data-gallery-modal]');
const galleryStage = document.querySelector('[data-gallery-modal-stage]');
const galleryTitle = document.querySelector('#gallery-modal-title');
const galleryCount = document.querySelector('#gallery-modal-count');
const galleryModalPrev = document.querySelector('[data-gallery-modal-prev]');
const galleryModalNext = document.querySelector('[data-gallery-modal-next]');
const galleryModalCloseButtons = document.querySelectorAll('[data-gallery-close]');

const LANG_KEY = 'fivehow-home-lang';
const THEME_KEY = 'fivehow-home-theme';
const LOCAL_API_PORT = 3100;
const DEFAULT_API_BASE = 'https://api.fivehow.com';

const modalState = {
  slides: [],
  index: 0,
};
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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

  if (langToggle) {
    const toggleCopy = parseCopy(langToggle);
    if (toggleCopy) {
      langToggle.textContent = toggleCopy[lang] ?? toggleCopy.zh ?? '';
    }
  }

  syncThemeButton();

  if (contactFeedbackStatus?.dataset.statusKey) {
    setFeedbackStatus(contactFeedbackStatus.dataset.statusKey);
  }

  if (!galleryModal?.hasAttribute('hidden')) {
    renderModal();
  }
}

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  syncThemeColor();
  syncThemeButton();
}

function createPlaceholder(tone, aspect, className) {
  const wrapper = document.createElement('div');
  wrapper.className = `${className} product-shot product-shot--${tone} product-shot--${aspect}`;

  const header = document.createElement('div');
  header.className = 'product-shot__header';

  const body = document.createElement('div');
  body.className = 'product-shot__body';

  for (let index = 0; index < 3; index += 1) {
    body.append(document.createElement('span'));
  }

  wrapper.append(header, body);
  return wrapper;
}

function applyRoundedPreviewImageStyles(scope) {
  var base = scope && typeof scope.querySelectorAll === 'function' ? scope : document;
  base.querySelectorAll('.product-gallery__slide img, .spotlight-preview img, .gallery-modal__img').forEach(function (img) {
    img.style.borderRadius = 'calc(var(--radius-xl) - 4px)';
    img.style.clipPath = 'inset(0 round calc(var(--radius-xl) - 4px))';
    img.style.overflow = 'hidden';
  });
}

function updateGalleryCard(card, index) {
  const slides = card.querySelectorAll('[data-gallery-trigger]');
  const dots = card.querySelectorAll('.product-gallery__dot');
  const normalizedIndex = (index + slides.length) % slides.length;

  card.dataset.activeIndex = String(normalizedIndex);

  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle('is-active', slideIndex === normalizedIndex);
  });

  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle('is-active', dotIndex === normalizedIndex);
  });
}

function bindSwipeNavigation(target, handlers) {
  if (!target) return;

  let startPoint = null;

  target.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    startPoint = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });

  target.addEventListener('touchend', (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch || !startPoint) return;

    const dx = touch.clientX - startPoint.x;
    const dy = touch.clientY - startPoint.y;
    startPoint = null;

    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) {
      return;
    }

    if (dx < 0) {
      handlers.onNext();
      return;
    }

    handlers.onPrev();
  }, { passive: true });
}

function collectSlides(card) {
  return Array.from(card.querySelectorAll('[data-gallery-trigger]')).map((slide) => ({
    src: slide.getAttribute('data-gallery-src') || '',
    tone: slide.getAttribute('data-gallery-tone') || 'today-soft',
    aspect: slide.getAttribute('data-gallery-aspect') || 'portrait',
    alt: slide.getAttribute('data-gallery-copy') || '',
    name: slide.getAttribute('data-gallery-name') || '',
  }));
}

var galleryTrack = document.querySelector('[data-gallery-modal-track]');

function buildTrackSlides() {
  if (!galleryTrack) return;
  galleryTrack.innerHTML = '';
  var lang = currentLang();
  modalState.slides.forEach(function (slide) {
    var div = document.createElement('div');
    div.className = 'gallery-modal__slide';
    var media = document.createElement('div');
    media.className = 'gallery-modal__media';
    var img = document.createElement('img');
    img.className = 'gallery-modal__img';
    img.src = resolveCopy(slide.src, lang) || '';
    img.alt = resolveCopy(slide.alt, lang) || '';
    img.draggable = false;
    img.style.borderRadius = 'calc(var(--radius-xl) - 4px)';
    img.style.clipPath = 'inset(0 round calc(var(--radius-xl) - 4px))';
    img.style.overflow = 'hidden';
    media.appendChild(img);
    div.appendChild(media);
    galleryTrack.appendChild(div);
  });

  applyRoundedPreviewImageStyles(galleryTrack);
}

function renderModal(skipTransition) {
  if (!galleryTrack || !galleryTitle || !galleryCount || modalState.slides.length === 0) return;

  var index = (modalState.index + modalState.slides.length) % modalState.slides.length;
  modalState.index = index;

  var slide = modalState.slides[index];
  var lang = currentLang();
  var slideAlt = resolveCopy(slide.alt, lang);
  var slideName = resolveCopy(slide.name, lang) || slideAlt || 'Preview';

  galleryTitle.textContent = slideName;
  galleryCount.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(modalState.slides.length).padStart(2, '0');

  if (galleryModalPrev) {
    galleryModalPrev.toggleAttribute('hidden', modalState.slides.length <= 1);
  }
  if (galleryModalNext) {
    galleryModalNext.toggleAttribute('hidden', modalState.slides.length <= 1);
  }

  if (skipTransition || prefersReducedMotion.matches) {
    galleryTrack.style.transition = 'none';
  } else {
    galleryTrack.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
  }
  galleryTrack.style.transform = 'translateX(-' + (index * 100) + '%)';
}

function openModal(card, index) {
  if (!galleryModal) return;
  modalState.slides = collectSlides(card);
  modalState.index = index;
  buildTrackSlides();
  galleryModal.removeAttribute('hidden');
  body.classList.add('is-modal-open');
  renderModal(true);
}

function closeModal() {
  if (!galleryModal) return;
  galleryModal.setAttribute('hidden', '');
  body.classList.remove('is-modal-open');
}

function setFeedbackStatus(key) {
  if (!contactFeedbackForm || !contactFeedbackStatus) return;
  contactFeedbackStatus.dataset.statusKey = key;
  contactFeedbackStatus.textContent = resolveCopy(contactFeedbackForm.getAttribute(key) || '', currentLang());

  var tone = 'neutral';
  if (key.indexOf('success') >= 0) {
    tone = 'success';
  } else if (key.indexOf('error') >= 0) {
    tone = 'error';
  } else if (key.indexOf('sending') >= 0) {
    tone = 'sending';
  }

  contactFeedbackStatus.dataset.statusTone = tone;
}

function resolveApiBase(rawBase) {
  const base = String(rawBase || '').trim();
  if (!base) return '';
  return base.replace(/\/+$/, '');
}

function isLocalHost(hostname) {
  const value = String(hostname || '').toLowerCase();
  return value === 'localhost' || value === '127.0.0.1';
}

function resolveHomeApiBase(rawBase) {
  if (isLocalHost(window.location.hostname)) {
    return `${window.location.protocol}//localhost:${LOCAL_API_PORT}`;
  }

  const resolved = resolveApiBase(rawBase);
  if (resolved) {
    return resolved;
  }

  return DEFAULT_API_BASE;
}

function buildFeedbackEndpoint() {
  if (!contactFeedbackForm) return '/v1/feedback';

  const apiBase = resolveHomeApiBase(contactFeedbackForm.getAttribute('data-feedback-api-base'));
  const endpoint = '/v1/feedback';

  return `${apiBase}${endpoint}`;
}

function detectFeedbackPlatform() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Macintosh/.test(ua)) return 'macos';
  return 'web';
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const raw = await response.text();

  let payload = {};
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      console.error('[home] Failed to parse feedback response', error);
    }
  }

  if (!response.ok) {
    const error = new Error('Request failed');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
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

function resetSpotlightTilt(shell) {
  shell.style.setProperty('--tilt-x', '0deg');
  shell.style.setProperty('--tilt-y', '0deg');
  shell.style.setProperty('--glow-x', '50%');
  shell.style.setProperty('--glow-y', '18%');
}

function updateSpotlightTilt(shell, event) {
  if (prefersReducedMotion.matches || event.pointerType !== 'mouse') {
    return;
  }

  const rect = shell.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return;
  }

  const ratioX = (event.clientX - rect.left) / rect.width;
  const ratioY = (event.clientY - rect.top) / rect.height;
  const tiltY = (ratioX - 0.5) * 10;
  const tiltX = (0.5 - ratioY) * 9;

  shell.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
  shell.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
  shell.style.setProperty('--glow-x', `${(ratioX * 100).toFixed(2)}%`);
  shell.style.setProperty('--glow-y', `${(ratioY * 100).toFixed(2)}%`);
}

const initialLang = localStorage.getItem(LANG_KEY) || 'zh';
const initialTheme = localStorage.getItem(THEME_KEY) || 'dark';

applyTheme(initialTheme);
applyLang(initialLang);
applyRoundedPreviewImageStyles(document);

spotlightBoards.forEach((board) => {
  const triggers = board.querySelectorAll('[data-spotlight-trigger]');
  const initialProductId =
    board.dataset.activeProduct || triggers[0]?.getAttribute('data-product-id') || '';

  activateSpotlightProduct(board, initialProductId);

  triggers.forEach((trigger) => {
    const productId = trigger.getAttribute('data-product-id') || '';
    const activate = () => activateSpotlightProduct(board, productId);

    trigger.addEventListener('focus', activate);
    trigger.addEventListener('click', activate);
    trigger.addEventListener('pointerenter', () => {
      if (window.matchMedia('(hover: hover)').matches) {
        activate();
      }
    });
  });
});

document.querySelectorAll('[data-product-preview-trigger]').forEach((button) => {
  button.addEventListener('click', () => {
    const panel = button.closest('[data-spotlight-panel]');
    const card = panel?.querySelector('[data-gallery-card]');

    if (!card) return;

    openModal(card, Number(button.getAttribute('data-product-preview-index') || 0));
  });
});

document.querySelectorAll('[data-scenario-preview-trigger]').forEach((button) => {
  button.addEventListener('click', () => {
    const productId = button.getAttribute('data-product-id') || '';
    if (!productId) return;

    const board = spotlightBoards[0];
    if (board) {
      activateSpotlightProduct(board, productId);
    }

    const panel = document.querySelector(`[data-spotlight-panel][data-product-id="${productId}"]`);
    const card = panel?.querySelector('[data-gallery-card]');

    if (!card) return;
    openModal(card, 0);
  });
});

contactFeedbackForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const message = String(contactFeedbackInput?.value || '').trim();
  if (!message) {
    setFeedbackStatus('data-feedback-status-empty');
    contactFeedbackInput?.focus();
    return;
  }

  if (contactFeedbackSubmit) {
    contactFeedbackSubmit.disabled = true;
  }

  setFeedbackStatus('data-feedback-status-sending');

  try {
    await requestJson(buildFeedbackEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedbackType: 'other',
        content: message,
        sourceProduct: 'web-home',
        sourcePlatform: detectFeedbackPlatform(),
        sourceScene: 'footer_feedback',
      }),
    });

    if (contactFeedbackInput) {
      contactFeedbackInput.value = '';
    }
    setFeedbackStatus('data-feedback-status-success');
  } catch (error) {
    console.error('[home] Failed to submit feedback', error);
    setFeedbackStatus('data-feedback-status-error');
  } finally {
    if (contactFeedbackSubmit) {
      contactFeedbackSubmit.disabled = false;
    }
  }
});

galleryCards.forEach((card) => {
  const slides = card.querySelectorAll('[data-gallery-trigger]');
  if (!slides.length) return;

  updateGalleryCard(card, Number(card.dataset.activeIndex || 0));

  slides.forEach((slide) => {
    slide.addEventListener('click', () => {
      const index = Number(slide.getAttribute('data-gallery-index') || 0);
      openModal(card, index);
    });
  });

  card.querySelector('[data-gallery-prev]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    updateGalleryCard(card, Number(card.dataset.activeIndex || 0) - 1);
  });

  card.querySelector('[data-gallery-next]')?.addEventListener('click', (event) => {
    event.stopPropagation();
    updateGalleryCard(card, Number(card.dataset.activeIndex || 0) + 1);
  });

  bindSwipeNavigation(card, {
    onPrev() {
      updateGalleryCard(card, Number(card.dataset.activeIndex || 0) - 1);
    },
    onNext() {
      updateGalleryCard(card, Number(card.dataset.activeIndex || 0) + 1);
    },
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

galleryModalPrev?.addEventListener('click', () => {
  modalState.index -= 1;
  renderModal();
});

galleryModalNext?.addEventListener('click', () => {
  modalState.index += 1;
  renderModal();
});

bindSwipeNavigation(galleryStage, {
  onPrev() {
    if (modalState.slides.length <= 1) return;
    modalState.index -= 1;
    renderModal();
  },
  onNext() {
    if (modalState.slides.length <= 1) return;
    modalState.index += 1;
    renderModal();
  },
});

galleryModalCloseButtons.forEach((button) => {
  button.addEventListener('click', closeModal);
});

document.addEventListener('keydown', (event) => {
  if (galleryModal?.hasAttribute('hidden')) return;

  if (event.key === 'Escape') {
    closeModal();
    return;
  }

  if (event.key === 'ArrowLeft' && modalState.slides.length > 1) {
    modalState.index -= 1;
    renderModal();
  }

  if (event.key === 'ArrowRight' && modalState.slides.length > 1) {
    modalState.index += 1;
    renderModal();
  }
});

// --- Product popover ---

const productPopover = document.querySelector('[data-product-popover]');
const productPopoverLink = document.querySelector('[data-product-popover-link]');
const productPopoverQr = document.querySelector('[data-product-popover-qr]');
const productLinks = document.querySelectorAll('[data-product-link]');
let popoverTimeout = null;

var productQrMap = {
  'https://apps.apple.com/app/id6446240226': '/assets/products/qr/today.png',
  'https://apps.apple.com/app/id6758816670': '/assets/products/qr/now-ios.png',
  'https://apps.apple.com/app/id6759785632': '/assets/products/qr/now-macos.png',
  'https://apps.apple.com/app/id1579304692': '/assets/products/qr/recordbox.png',
};

function positionPopover(anchor) {
  if (!productPopover) return;

  const rect = anchor.getBoundingClientRect();
  const popW = 216;
  const popEstH = 260;
  const spaceBelow = window.innerHeight - rect.bottom;
  const showAbove = spaceBelow < popEstH + 16 && rect.top > popEstH + 16;

  let left = rect.left + rect.width / 2 - popW / 2;
  if (left < 8) left = 8;
  if (left + popW > window.innerWidth - 8) left = window.innerWidth - 8 - popW;

  productPopover.classList.toggle('is-above', showAbove);

  if (showAbove) {
    productPopover.style.left = `${left}px`;
    productPopover.style.top = '';
    productPopover.style.bottom = `${window.innerHeight - rect.top + 8}px`;
  } else {
    productPopover.style.left = `${left}px`;
    productPopover.style.top = `${rect.bottom + 8}px`;
    productPopover.style.bottom = '';
  }
}

function showPopover(anchor) {
  if (!productPopover || !productPopoverLink) return;

  clearTimeout(popoverTimeout);

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

  productPopover.classList.remove('is-visible');

  clearTimeout(popoverTimeout);
  popoverTimeout = setTimeout(() => {
    productPopover.setAttribute('hidden', '');
  }, 300);

}

let popoverHideTimer = null;
let currentPopoverAnchor = null;

function scheduleHide() {
  clearTimeout(popoverHideTimer);
  popoverHideTimer = setTimeout(hidePopover, 200);
}

function cancelHide() {
  clearTimeout(popoverHideTimer);
}

productLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (currentPopoverAnchor === link && productPopover && !productPopover.hasAttribute('hidden')) {
      hidePopover();
      return;
    }

    cancelHide();
    currentPopoverAnchor = link;
    showPopover(link);
  });

  link.addEventListener('mouseenter', () => {
    if (!window.matchMedia('(hover: hover)').matches) return;
    cancelHide();
    currentPopoverAnchor = link;
    showPopover(link);
  });

  link.addEventListener('mouseleave', () => {
    scheduleHide();
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
