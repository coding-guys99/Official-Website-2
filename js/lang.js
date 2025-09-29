// js/lang.js — i18n 核心 + 語言切換 (Header + Footer Apple-style)
(function () {
  const FALLBACK = 'en';
  const BASE_URL = new URL('./i18n/', location.href).toString();
  const STORE_KEY = 'i18n.lang';

  const SUPPORTED = [
    ['en','English'],
    ['zh_tw','繁體中文'],
    ['zh_cn','简体中文'],
    ['ja','日本語'],
    ['ko','한국어'],
    ['th','ไทย'],
    ['ms','Bahasa Melayu'],
    ['vi','Tiếng Việt'],
    ['es','Español'],
    ['id','Bahasa Indonesia'],
    ['de','Deutsch'],
    ['fr','Français'],
    ['pt','Português'],
    ['ru','Русский'],
    ['ar','العربية'],
    ['hi','हिन्दी']
  ];

  const I18N = {
    lang: FALLBACK,
    dict: {},
    cache: new Map(),

    async load(lang) {
      const url = new URL(`${lang}.json`, BASE_URL).toString();
      if (!this.cache.has(lang)) {
        this.cache.set(
          lang,
          fetch(url).then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
            return r.json();
          })
        );
      }
      return this.cache.get(lang);
    },

    t(key, dict = this.dict) {
      return key.split('.').reduce((o, k) => (o && k in o) ? o[k] : undefined, dict);
    },

    mergeFallback(primary, fallback) {
      for (const k in fallback) {
        const v = fallback[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          if (!(k in primary)) primary[k] = {};
          this.mergeFallback(primary[k], v);
        } else if (!(k in primary)) {
          primary[k] = v;
        }
      }
      return primary;
    },

    async setLang(input) {
      const lang = (input || FALLBACK).toLowerCase().replace('-', '_');
      try {
        const [cur, fb] = await Promise.all([this.load(lang), this.load(FALLBACK)]);
        this.dict = this.mergeFallback(JSON.parse(JSON.stringify(cur)), fb);
        this.lang = lang;

        document.documentElement.lang = lang.replace('_','-');
        localStorage.setItem(STORE_KEY, lang);

        this.render();

        const title = this.t('meta.title.home');
        if (typeof title === 'string' && title) document.title = title;

        document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang } }));
        console.info('[i18n] switched to:', lang, 'base:', BASE_URL);
      } catch (err) {
        console.error('[i18n] failed to load:', lang, err);
        if (lang !== FALLBACK) {
          localStorage.setItem(STORE_KEY, FALLBACK);
          return this.setLang(FALLBACK);
        }
      }
    },

    detect() {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) return saved;
      const nav = (navigator.language || 'en').toLowerCase();
      if (nav.startsWith('zh-tw') || nav.startsWith('zh-hant')) return 'zh_tw';
      if (nav.startsWith('zh-cn') || nav.startsWith('zh-hans')) return 'zh_cn';
      return 'en';
    }
  };
  window.I18N = I18N;

  // ====== 快速索引 ======
  const I18NIndex = { text: [], attrs: [] };

  function indexI18nNodes(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      if (el.hasAttribute('data-i18n-attr')) return;
      const key  = el.getAttribute('data-i18n');
      const html = el.hasAttribute('data-i18n-html');
      I18NIndex.text.push({ el, key, html, last: undefined });
    });
    root.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const baseKey = el.getAttribute('data-i18n');
      const attrs = (el.getAttribute('data-i18n-attr') || '')
        .split(',').map(s => s.trim()).filter(Boolean);
      I18NIndex.attrs.push({ el, baseKey, attrs, last: Object.create(null) });
    });
  }

  I18N.render = function renderFast() {
    for (let n of I18NIndex.text) {
      if (!n.el.isConnected) continue;
      let val = this.t(n.key);
      if (val && typeof val === 'object') val = val.title || val.label || val._;
      if (typeof val === 'string' && val !== n.last) {
        if (n.el.tagName === 'TITLE') {
          document.title = val;
        } else if (n.html) {
          n.el.innerHTML = val;
        } else {
          n.el.textContent = val;
        }
        n.last = val;
      }
    }
    for (let n of I18NIndex.attrs) {
      if (!n.el.isConnected) continue;
      for (let attr of n.attrs) {
        const key = `${n.baseKey}.${attr}`;
        let val = this.t(key);
        if (val === undefined) val = this.t(n.baseKey);
        if (val && typeof val === 'object') val = val.title || val.label || val._;
        if (typeof val === 'string' && val !== n.last[attr]) {
          n.el.setAttribute(attr, val);
          n.last[attr] = val;
        }
      }
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    indexI18nNodes(document);
    I18N.setLang(I18N.detect());
  });

  const mo = new MutationObserver(muts => {
    let needRender = false;
    for (const m of muts) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(n => {
          if (n.nodeType !== 1) return;
          if (
            n.matches?.('[data-i18n],[data-i18n-attr]') ||
            n.querySelector?.('[data-i18n],[data-i18n-attr]')
          ) {
            indexI18nNodes(n);
            needRender = true;
          }
        });
      }
      if (m.type === 'attributes' &&
          (m.attributeName === 'data-i18n' || m.attributeName === 'data-i18n-attr' || m.attributeName === 'data-i18n-html')) {
        indexI18nNodes(m.target);
        needRender = true;
      }
    }
    if (needRender) requestAnimationFrame(() => I18N.render());
  });
  document.addEventListener('DOMContentLoaded', () => {
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-i18n', 'data-i18n-attr', 'data-i18n-html']
    });
  });

  // ====== Footer 語言選單 ======
  document.addEventListener('DOMContentLoaded', () => {
    const footerSel = document.getElementById("footerLocale");
    if (footerSel) {
      footerSel.innerHTML = SUPPORTED.map(([code,label]) =>
        `<option value="${code}">${label}</option>`
      ).join('');
      footerSel.value = I18N.lang || 'en';

      footerSel.addEventListener("change", async (e) => {
        const lang = e.target.value;
        await I18N.setLang(lang);
      });

      document.addEventListener("i18n:changed", (ev) => {
        const lang = ev.detail?.lang || I18N.lang;
        footerSel.value = lang;
      });
    }
  });
})();