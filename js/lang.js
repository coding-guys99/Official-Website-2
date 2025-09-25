// js/lang.js — 不修改你的 HTML/CSS；只提供 i18n + 與現有語言選單的橋接
(function () {
  /* ========== i18n 核心 ========== */
  const BASE = './i18n/';        // 語言檔目錄（相對路徑最穩）
  const FALLBACK = 'en';

  const I18N = {
    lang: FALLBACK,
    dict: {},
    cache: new Map(),

    async load(lang) {
      const url = `${BASE}${lang}.json`;
      if (!this.cache.has(lang)) {
        this.cache.set(lang, fetch(url).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
          return r.json();
        }));
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

    render(root = document) {
      // 文字
      root.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = this.t(key);
        if (typeof val === 'string') el.textContent = val;
      });
      // 屬性（可選）
      root.querySelectorAll('[data-i18n-attr]').forEach(el => {
        const baseKey = el.getAttribute('data-i18n');
        const attrs = (el.getAttribute('data-i18n-attr') || '')
          .split(',').map(s => s.trim()).filter(Boolean);
        attrs.forEach(attr => {
          const key = `${baseKey}.${attr}`;
          const val = this.t(key) ?? this.t(baseKey);
          if (typeof val === 'string') el.setAttribute(attr, val);
        });
      });
    },

    async setLang(input) {
      const lang = (input || FALLBACK).toLowerCase().replace('-', '_'); // zh-tw -> zh_tw
      const [cur, fb] = await Promise.all([ this.load(lang), this.load(FALLBACK) ]);
      this.dict = this.mergeFallback(JSON.parse(JSON.stringify(cur)), fb);
      this.lang = lang;

      document.documentElement.lang = lang.replace('_', '-');
      localStorage.setItem('i18n.lang', lang);

      this.render();
      document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang } }));
      console.info('[i18n] switch to:', lang);
    },

    detect() {
      const saved = localStorage.getItem('i18n.lang');
      if (saved) return saved;
      const nav = (navigator.language || 'en').toLowerCase();
      if (nav.startsWith('zh-tw') || nav.startsWith('zh-hant')) return 'zh_tw';
      if (nav.startsWith('zh-cn') || nav.startsWith('zh-hans')) return 'zh_cn';
      return 'en';
    }
  };
  window.I18N = I18N;

  // 初始語言
  document.addEventListener('DOMContentLoaded', () => I18N.setLang(I18N.detect()));

  /* ========== 與你現有語言選單的「橋接」 ========== */
  const portal    = document.getElementById('langPortal');          // 你已有
  const curMobile = document.getElementById('langCurrentMobile');   // 你已有
  const langName  = { en:'English', zh_tw:'繁體中文', zh_cn:'简体中文', ja:'日本語', ko:'한국어' };

  if (portal) {
    // 1) 監聽點擊：你的 app.js 會自動建立 data-lang 的項目
    portal.addEventListener('click', async (e) => {
      const el = e.target.closest('[data-lang]');
      if (!el) return;
      const code = (el.dataset.lang || '').toLowerCase().replace('-', '_');
      await I18N.setLang(code);
      if (curMobile) {
        // 以選項文字或內建對照更新顯示
        curMobile.textContent = (el.textContent || langName[code] || code).trim();
      }
      // 不處理開關/樣式，交由你現有的程式與 CSS
    });

    // 2) 若別處（如 footer）也觸發切換，同步行動版顯示
    document.addEventListener('i18n:changed', (ev) => {
      const code = ev.detail?.lang;
      if (curMobile && code) curMobile.textContent = langName[code] || code;
      // 高亮目前選項（若你的清單使用 aria-current）
      portal.querySelectorAll('[aria-current="true"]').forEach(b => b.removeAttribute('aria-current'));
      portal.querySelector(`[data-lang="${code}"]`)?.setAttribute('aria-current', 'true');
    });

    // 3) 自動處理 aria-hidden（不改你的 CSS，但避免 A11y 警告）
    //    你的程式會在打開時加 .open / 移除 aria-hidden；若沒移除，這裡幫忙處理。
    const mo = new MutationObserver(() => {
      const isOpen = portal.classList.contains('open');
      if (isOpen) {
        portal.removeAttribute('aria-hidden');     // 開啟時不要隱藏給 AT
      } else {
        // 關閉時再加回，維持你的結構
        portal.setAttribute('aria-hidden', 'true');
      }
    });
    mo.observe(portal, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });

    // 預設根據當前語言更新顯示
    document.addEventListener('DOMContentLoaded', () => {
      const code = localStorage.getItem('i18n.lang') || 'en';
      if (curMobile) curMobile.textContent = langName[code] || 'English';
    });
  }
})();

// ===== [補丁] 自動重渲染 + 標題同步 + 缺字偵測 =====

// 1) 頁面完全載入後再渲染一次（避免其他腳本晚於 i18n）
window.addEventListener('load', () => {
  try {
    I18N.render();
    const t = I18N.t('meta.title');
    if (typeof t === 'string' && t) document.title = t; // 同步 <title>
  } catch (e) { console.warn('[i18n] late render failed', e); }
}, { once: true });

// 2) 監看 DOM 有沒有新增/替換含 data-i18n 的節點，有就重渲染（只渲染一次即可）
const i18nMO = new MutationObserver((list) => {
  const need = list.some(m =>
    [...m.addedNodes].some(n =>
      n.nodeType === 1 && (n.matches?.('[data-i18n],[data-i18n-attr]') ||
      n.querySelector?.('[data-i18n],[data-i18n-attr]'))
    )
    || (m.type === 'attributes' && (m.target.matches?.('[data-i18n],[data-i18n-attr]')))
  );
  if (need) {
    I18N.render();
    // 同步 <title>
    const t = I18N.t('meta.title');
    if (typeof t === 'string' && t) document.title = t;
  }
});
i18nMO.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-i18n','data-i18n-attr'] });

// 3) 方便除錯：列出頁面上對不到的 key（只在開發時看 Console）
(function debugMissingKeys(){
  const els = document.querySelectorAll('[data-i18n]');
  const missing = [];
  els.forEach(el => {
    const k = el.getAttribute('data-i18n');
    const v = I18N.t(k);
    if (typeof v !== 'string') missing.push(k);
  });
  if (missing.length) {
    console.warn('[i18n] missing keys (check your JSON):', Array.from(new Set(missing)));
  }
})();