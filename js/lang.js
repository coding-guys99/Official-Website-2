// js/lang.js — i18n 核心 + 文字/屬性渲染 + Header/Footer 語言選單
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

    // 取值（a.b.c），若路上不是 object 就停止回傳 undefined（防呆）
    t(path, dict = this.dict) {
      if (!path) return undefined;
      const parts = path.split('.');
      let cur = dict;
      for (const k of parts) {
        if (cur && typeof cur === 'object' && (k in cur)) {
          cur = cur[k];
        } else {
          return undefined;
        }
      }
      return cur;
    },

    // 用 fallback 補上缺失鍵（不覆蓋已存在）
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
        // 深拷貝 + 補 fallback
        this.dict = this.mergeFallback(JSON.parse(JSON.stringify(cur)), fb);
        this.lang = lang;

        document.documentElement.lang = lang.replace('_','-');
        localStorage.setItem(STORE_KEY, lang);

        this.render();

        // 若 <title> 沒綁 data-i18n，就兜底用 meta.title.home
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
    // 文字/HTML 節點
    root.querySelectorAll('[data-i18n]').forEach(el => {
      if (el.hasAttribute('data-i18n-attr')) return; // 屬性另外處理
      const key  = el.getAttribute('data-i18n');
      const html = el.hasAttribute('data-i18n-html');
      I18NIndex.text.push({ el, key, html, last: undefined });
    });
    // 屬性翻譯（data-i18n-attr="title,aria-label"）
    root.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const baseKey = el.getAttribute('data-i18n');
      const attrs = (el.getAttribute('data-i18n-attr') || '')
        .split(',').map(s => s.trim()).filter(Boolean);
      I18NIndex.attrs.push({ el, baseKey, attrs, last: Object.create(null) });
    });
  }

  // ====== 渲染：支援字串/物件；物件可含 _ / title / label 與多個屬性 ======
  I18N.render = function renderFast() {
    // 1) 文字/內文
    for (let n of I18NIndex.text) {
      if (!n.el.isConnected) continue;
      let val = this.t(n.key);
      if (val && typeof val === 'object') {
        // 若是物件，文字優先順序：_.title.label
        val = val._ ?? val.title ?? val.label;
      }
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

    // 2) 屬性（含 aria-label 等）
    for (let n of I18NIndex.attrs) {
      if (!n.el.isConnected) continue;
      const base = this.t(n.baseKey);
      if (typeof base === 'string') {
        // 基底是「字串」：把字串應用到每個列出的屬性
        for (let attr of n.attrs) {
          if (n.last[attr] !== base) {
            n.el.setAttribute(attr, base);
            n.last[attr] = base;
          }
        }
      } else if (base && typeof base === 'object') {
        // 基底是「物件」：優先使用物件中的同名屬性；若沒有，用 _.title.label 作為回退
        for (let attr of n.attrs) {
          let v = base[attr];
          if (v === undefined) v = base._ ?? base.title ?? base.label;
          if (typeof v === 'string' && n.last[attr] !== v) {
            n.el.setAttribute(attr, v);
            n.last[attr] = v;
          }
        }
      }
    }
  };

  // ====== 啟動 & 監控 ======
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

  // ====== Header / Footer 語言選單（用同一個 #langPortal） ======
  document.addEventListener('DOMContentLoaded', () => {
    const portal    = document.getElementById('langPortal');
    const footBtn   = document.getElementById('footLangLink');   // Footer 按鈕
    const mobBtn    = document.getElementById('langBtnMobile');  // 行動版 Header
    const curMobile = document.getElementById('langCurrentMobile');

    function buildMenu() {
      if (!portal || portal.dataset.built) return;
      portal.innerHTML = SUPPORTED
        .map(([code,label]) => `<button type="button" role="menuitem" class="lang-item" data-lang="${code}">${label}</button>`)
        .join('');
      portal.dataset.built = '1';
    }

    function syncCurrentLabel(code) {
      const label = SUPPORTED.find(([c]) => c === code)?.[1] || 'English';
      if (curMobile) curMobile.textContent = label;
      portal?.querySelectorAll('[aria-current="true"]').forEach(b => b.removeAttribute('aria-current'));
      portal?.querySelector(`[data-lang="${code}"]`)?.setAttribute('aria-current','true');
    }

    function openPortal(anchor) {
      if (!portal) return;
      portal.classList.add('open');
      portal.removeAttribute('aria-hidden');

      const r = anchor.getBoundingClientRect();
      const W = portal.offsetWidth, H = portal.offsetHeight, M = 12;
      let top  = r.bottom + 8;
      let left = r.left;
      if (left + W + M > innerWidth)  left = Math.max(M, innerWidth - W - M);
      if (top  + H + M > innerHeight) top  = Math.max(M, r.top - H - 8);
      portal.style.position = 'fixed';
      portal.style.top  = Math.min(Math.max(M, top),  innerHeight - H - M) + 'px';
      portal.style.left = Math.min(Math.max(M, left), innerWidth  - W - M) + 'px';

      const onDoc = (e)=>{ if (!portal.contains(e.target) && !anchor.contains(e.target)) closePortal(anchor); };
      const onEsc = (e)=>{ if (e.key==='Escape') closePortal(anchor); };
      setTimeout(()=>{
        document.addEventListener('click', onDoc, { once:true });
        document.addEventListener('keydown', onEsc, { once:true });
      },0);
    }

    function closePortal(anchor) {
      if (!portal) return;
      if (anchor && document.activeElement && portal.contains(document.activeElement)) {
        anchor.focus();
      }
      portal.classList.remove('open');
      portal.setAttribute('aria-hidden','true');
      anchor?.setAttribute('aria-expanded','false');
    }

    // 初始化
    buildMenu();
    syncCurrentLabel(localStorage.getItem(STORE_KEY) || 'en');

    [footBtn, mobBtn].forEach(btn=>{
      if (!btn) return;
      btn.setAttribute('aria-haspopup','menu');
      btn.setAttribute('aria-expanded','false');
      btn.addEventListener('click', (e)=>{
        e.preventDefault();
        e.stopPropagation();
        if (portal?.classList.contains('open')) closePortal(btn);
        else { openPortal(btn); btn.setAttribute('aria-expanded','true'); }
      });
    });

    portal?.addEventListener('click', async (e)=>{
      const item = e.target.closest('[data-lang]');
      if (!item) return;
      const code = item.dataset.lang.toLowerCase().replace('-', '_');
      await I18N.setLang(code);
      syncCurrentLabel(code);
      const opener = (mobBtn?.getAttribute('aria-expanded')==='true') ? mobBtn
                   : (footBtn?.getAttribute('aria-expanded')==='true') ? footBtn
                   : null;
      closePortal(opener);
    });
  });

  // ======（可選）post.html 同步語言到 URL ?lang= ======
  (function () {
    function syncPostLangToURL(lang) {
      try {
        const url = new URL(location.href);
        const normalized = (lang || 'en').toLowerCase().replace('-', '_');
        const current = (url.searchParams.get('lang') || '').toLowerCase();
        if (current === normalized || current === normalized.replace('_','-')) return;
        url.searchParams.set('lang', normalized);
        location.replace(url.toString());
      } catch (_) {}
    }
    document.addEventListener('i18n:changed', (ev) => {
      if (/\/post\.html$/i.test(location.pathname)) {
        const lang = (ev.detail?.lang || window.I18N?.lang || 'en');
        syncPostLangToURL(lang);
      }
    });
    document.addEventListener('DOMContentLoaded', () => {
      if (/\/post\.html$/i.test(location.pathname)) {
        const lang = (window.I18N?.lang || 'en');
        syncPostLangToURL(lang);
      }
    });
  })();

})();
