  const themeKey = "site-theme";
  const langKey = "site-lang";
  const root = document.documentElement;
  /** @type {HTMLButtonElement | null} */
  const themeButton = /** @type {HTMLButtonElement | null} */ (
    document.querySelector("[data-theme-toggle]")
  );
  /** @type {HTMLButtonElement | null} */
  const langButton = /** @type {HTMLButtonElement | null} */ (
    document.querySelector("[data-lang-toggle]")
  );
  /** @type {HTMLElement | null} */
  const productMenu = /** @type {HTMLElement | null} */ (
    document.querySelector("[data-product-menu]")
  );
  /** @type {HTMLElement | null} */
  const productToggle = /** @type {HTMLElement | null} */ (
    document.querySelector("[data-product-toggle]")
  );
  /** @type {NodeListOf<HTMLAnchorElement>} */
  const appstoreLinks = /** @type {NodeListOf<HTMLAnchorElement>} */ (
    document.querySelectorAll(".appstore-link")
  );
  /** @type {NodeListOf<HTMLElement>} */
  const i18nNodes = /** @type {NodeListOf<HTMLElement>} */ (
    document.querySelectorAll("[data-i18n]")
  );
  /** @type {NodeListOf<HTMLElement>} */
  const langVisibleNodes = /** @type {NodeListOf<HTMLElement>} */ (
    document.querySelectorAll("[data-lang-visible]")
  );
  const i18nUrl = "/assets/i18n.json";
  /** @type {Record<string, Record<string, string>>} */
  const translations = {};
  const isWeChat = /MicroMessenger/i.test(navigator.userAgent || "");

  /** @type {(theme: string) => void} */
  const applyTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    localStorage.setItem(themeKey, theme);
  };

  /** @type {(lang: string) => void} */
  const applyLang = (lang) => {
    root.setAttribute("data-lang", lang);
    if (!translations[lang]) {
      return;
    }
    i18nNodes.forEach((node) => {
      const el = /** @type {HTMLElement} */ (node);
      const key = node.getAttribute("data-i18n");
      if (!key) return;
      el.textContent = translations[lang][key] || "";
    });
    langVisibleNodes.forEach((node) => {
      const el = /** @type {HTMLElement} */ (node);
      const visible = node.getAttribute("data-lang-visible");
      el.style.display = visible === "all" || visible === lang ? "" : "none";
    });
    if (langButton) {
      langButton.textContent = lang === "en" ? "中" : "EN";
    }
  };

  const storedLang = localStorage.getItem(langKey);
  const storedTheme = localStorage.getItem(themeKey);
  let currentLang = storedLang || "en";

  applyTheme(storedTheme || "light");
  if (themeButton) {
    themeButton.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  }

  if (productMenu && productToggle) {
    productToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      productMenu.classList.toggle("open");
    });

    productMenu.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    document.addEventListener("click", () => {
      productMenu.classList.remove("open");
    });
  }

  const init = async () => {
    try {
      const response = await fetch(i18nUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load i18n");
      }
      const data = await response.json();
      Object.assign(translations, data);
      applyLang(currentLang);
    } catch (error) {
      if (langButton) {
        langButton.textContent = currentLang === "en" ? "中" : "EN";
      }
      return;
    }

    if (langButton) {
      langButton.addEventListener("click", () => {
        currentLang = currentLang === "en" ? "zh" : "en";
        localStorage.setItem(langKey, currentLang);
        applyLang(currentLang);
      });
    }
  };

  init();

  if (isWeChat && appstoreLinks.length) {
    const redirectBase = "/helper/wechat-redirect.html";
    appstoreLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        if (href && href.includes("apps.apple.com")) {
          event.preventDefault();
          const target = encodeURIComponent(href);
          window.location.href = `${redirectBase}?target=${target}`;
        }
      });
    });
  }
