(function () {
  "use strict";

  const CONTACT_EMAIL = "carlesbadiaz@gmail.com";
  const LANG_KEY = "portfolio-lang";
  const SUPPORTED_LANGS = ["es", "ca", "en"];
  const ANALYTICS_KEY = "portfolio-analytics";
  let currentLang = "es";

  function detectDefaultLang() {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    const browserLang = (navigator.language || "es").slice(0, 2);
    return SUPPORTED_LANGS.includes(browserLang) ? browserLang : "es";
  }

  function applyLang(lang) {
    const dict = I18N[lang] || I18N.es;
    currentLang = SUPPORTED_LANGS.includes(lang) ? lang : "es";

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key] !== undefined) {
        el.innerHTML = dict[key];
      }
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");
      if (dict[key] !== undefined) {
        el.setAttribute("aria-label", dict[key]);
      }
    });

    document.documentElement.lang = lang;
    localStorage.setItem(LANG_KEY, lang);

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-lang") === lang);
    });

    updateContactLink(lang);
  }

  function updateContactLink(lang) {
    const dict = I18N[lang] || I18N.es;
    const subject = encodeURIComponent(dict["email.subject"]);
    const body = encodeURIComponent(dict["email.body"]);
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}&su=${subject}&body=${body}`;
    const btn = document.getElementById("contact-btn");
    if (btn) btn.setAttribute("href", url);
  }

  function getAnalytics() {
    try {
      const raw = JSON.parse(localStorage.getItem(ANALYTICS_KEY));
      return raw && typeof raw === "object" ? raw : {};
    } catch (e) {
      return {};
    }
  }

  function recordEvent(key) {
    // localStorage is an immediate, always-available fallback; the
    // Firestore write (shared across every visitor) is fire-and-forget
    // so a slow/offline connection never blocks the click itself.
    const data = getAnalytics();
    const entry = data[key] || { total: 0, es: 0, ca: 0, en: 0 };
    entry.total = (Number(entry.total) || 0) + 1;
    entry[currentLang] = (Number(entry[currentLang]) || 0) + 1;
    data[key] = entry;
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));

    if (typeof window.fbRecordEvent === "function") {
      window.fbRecordEvent(key, currentLang);
    }
  }

  function initLangSwitch() {
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => applyLang(btn.getAttribute("data-lang")));
    });
  }

  function initProjectAccordion() {
    const cards = document.querySelectorAll(".project-card");

    const closeCard = (card) => {
      card.classList.remove("is-open");
      const toggle = card.querySelector(".project-toggle");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      if (!document.querySelector(".project-card.is-open")) {
        document.body.classList.remove("modal-open");
      }
    };

    const openCard = (card, originEl) => {
      cards.forEach((other) => {
        if (other !== card && other.classList.contains("is-open")) closeCard(other);
      });
      const inner = card.querySelector(".project-panel-inner");
      if (inner && originEl) {
        // Scale in from the clicked card's own screen position rather
        // than the modal's center, so it visibly grows from that rectangle.
        const rect = originEl.getBoundingClientRect();
        const offsetX = rect.left + rect.width / 2 - window.innerWidth / 2;
        const offsetY = rect.top + rect.height / 2 - window.innerHeight / 2;
        inner.style.transformOrigin = `calc(50% + ${offsetX}px) calc(50% + ${offsetY}px)`;
      }
      card.classList.add("is-open");
      const toggle = card.querySelector(".project-toggle");
      if (toggle) toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("modal-open");
      if (card.dataset.project) recordEvent(card.dataset.project);
      const closeBtn = card.querySelector(".project-modal-close");
      if (closeBtn) closeBtn.focus();
    };

    // The backdrop blocks mouse clicks to whatever is behind an open
    // modal, but keyboard focus can still Tab past it into background
    // content unless we actively pull it back in.
    document.addEventListener("focusin", (e) => {
      const openCardEl = document.querySelector(".project-card.is-open");
      if (!openCardEl) return;
      const inner = openCardEl.querySelector(".project-panel-inner");
      if (inner && !inner.contains(e.target)) {
        const closeBtn = inner.querySelector(".project-modal-close");
        if (closeBtn) closeBtn.focus();
      }
    });

    cards.forEach((card) => {
      const toggle = card.querySelector(".project-toggle");
      const panel = card.querySelector(".project-panel");
      const closeBtn = card.querySelector(".project-modal-close");

      if (toggle) {
        toggle.addEventListener("click", () => {
          if (card.classList.contains("is-open")) {
            closeCard(card);
          } else {
            openCard(card, toggle);
          }
        });
      }
      if (closeBtn) {
        closeBtn.addEventListener("click", () => closeCard(card));
      }
      if (panel) {
        // Click on the backdrop (not the modal box itself) closes it.
        panel.addEventListener("click", (e) => {
          if (e.target === panel) closeCard(card);
        });
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const open = document.querySelector(".project-card.is-open");
      if (open) closeCard(open);
    });
  }

  function initLoader() {
    const loader = document.getElementById("loader");
    if (!loader) return;
    const cube = loader.querySelector(".cube-c");
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      loader.classList.add("loader-done");
      setTimeout(() => loader.remove(), 700);
    };
    // All three cubes share the same total duration, so any one of them
    // firing 'animationend' marks the moment all 4 jumps are done.
    if (cube) {
      cube.addEventListener("animationend", finish, { once: true });
    }
    // Safety net in case the animation never fires (e.g. element missing).
    setTimeout(finish, 8000);
  }

  function initYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  function initScrollReveal() {
    const targets = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || targets.length === 0) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
    targets.forEach((el) => observer.observe(el));
  }

  const ANALYTICS_LABELS = {
    pati: "El Pati d'Hivern",
    nova: "NOVA Construct",
    repx: "REPX Studio",
    pilates: "Pilates by Meri",
    contact: "Botón Contáctame",
  };

  async function renderAnalytics() {
    const list = document.getElementById("analytics-list");
    if (!list) return;
    let data = null;
    if (typeof window.fbGetAnalytics === "function") {
      try {
        data = await window.fbGetAnalytics();
      } catch (e) {
        data = null;
      }
    }
    if (!data) data = getAnalytics();
    list.innerHTML = Object.keys(ANALYTICS_LABELS).map((key) => {
      const entry = data[key] || { total: 0, es: 0, ca: 0, en: 0 };
      const total = Number(entry.total) || 0;
      const es = Number(entry.es) || 0;
      const ca = Number(entry.ca) || 0;
      const en = Number(entry.en) || 0;
      return `
        <div class="analytics-row">
          <div class="analytics-row-head">
            <span class="analytics-name">${ANALYTICS_LABELS[key]}</span>
            <span class="analytics-total">${total}</span>
          </div>
          <div class="analytics-breakdown">
            <span>ES: ${es}</span>
            <span>CA: ${ca}</span>
            <span>EN: ${en}</span>
          </div>
        </div>`;
    }).join("");
  }

  function initSecretGate() {
    const page = document.getElementById("secret-page");
    const lock = document.getElementById("secret-lock");
    const content = document.getElementById("secret-content");
    const form = document.getElementById("secret-form");
    const errorEl = document.getElementById("secret-error");
    const exitBtn = document.getElementById("secret-exit");
    if (!page || !form) return;

    function showContent() {
      lock.hidden = true;
      content.hidden = false;
      errorEl.hidden = true;
      renderAnalytics();
    }

    async function openGate() {
      page.hidden = false;
      document.body.classList.add("modal-open");
      // Real Firebase Auth session — wait for the SDK's initial check of
      // any already-signed-in session before deciding what to show.
      if (window.fbAuthReady) await window.fbAuthReady;
      if (typeof window.fbIsSignedIn === "function" && window.fbIsSignedIn()) {
        showContent();
      } else {
        lock.hidden = false;
        content.hidden = true;
        document.getElementById("secret-email")?.focus();
      }
    }

    function closeGate() {
      page.hidden = true;
      document.body.classList.remove("modal-open");
      form.reset();
      errorEl.hidden = true;
    }

    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "0" || e.code === "Digit0")) {
        e.preventDefault();
        openGate();
      } else if (e.key === "Escape" && !page.hidden) {
        closeGate();
      }
    });

    exitBtn.addEventListener("click", closeGate);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("secret-email").value.trim();
      const pass = document.getElementById("secret-pass").value;
      if (typeof window.fbSignIn !== "function") {
        errorEl.hidden = false;
        return;
      }
      try {
        await window.fbSignIn(email, pass);
        showContent();
      } catch (err) {
        errorEl.hidden = false;
        form.reset();
        document.getElementById("secret-email").focus();
      }
    });
  }

  function initContactTracking() {
    const btn = document.getElementById("contact-btn");
    if (btn) btn.addEventListener("click", () => recordEvent("contact"));
  }

  function initNavScroll() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    window.addEventListener("scroll", () => {
      nav.classList.toggle("nav-scrolled", window.scrollY > 20);
    }, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initLoader();
    initLangSwitch();
    initProjectAccordion();
    initScrollReveal();
    initSecretGate();
    initContactTracking();
    initNavScroll();
    initYear();
    applyLang(detectDefaultLang());
  });
})();
