// js/lang.js — i18n 核心 + 快速渲染(支援 data-i18n-html) + 語言選單 UI
(function () {
  // ====== 基本設定 ======
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

  // ====== I18N 物件 ======
  const I18N = {
    lang: FALLBACK,
    dict: {},
    cache: new Map(),

    async load(lang) {
      const url = new URL(`${lang}.json`, BASE_URL).toString();
      if (!this.cache.has(lang)) {
        this.cache.set(
          lang,
          fetch(url, { cache: 'no-cache' }).then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
            return r.json();
          })
        );
      }
      return this.cache.get(lang);
    },

    // 取值（支援 a.b.c）
    t(key, dict = this.dict) {
      return key.split('.').reduce((o, k) => (o && k in o) ? o[k] : undefined, dict);
    },

    // 將 fallback 內容補到 primary 缺漏處（不覆蓋已存在鍵）
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

    // 設定語言 + 觸發渲染
    async setLang(input) {
      const lang = (input || FALLBACK).toLowerCase().replace('-', '_');
      try {
        const [cur, fb] = await Promise.all([this.load(lang), this.load(FALLBACK)]);
        // 深拷貝後補齊 fallback
        this.dict = this.mergeFallback(JSON.parse(JSON.stringify(cur)), fb);
        this.lang = lang;

        document.documentElement.lang = lang.replace('_', '-');
        localStorage.setItem(STORE_KEY, lang);

        this.render(); // 立即渲染

        // 兜底：如果頁面 <title> 沒 data-i18n，仍更新為 meta.title.home
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
    // 純文字/HTML 節點（支援 data-i18n-html）
    root.querySelectorAll('[data-i18n]').forEach(el => {
      if (el.hasAttribute('data-i18n-attr')) return; // 屬性翻譯交給 attrs 流程
      const key  = el.getAttribute('data-i18n');
      const html = el.hasAttribute('data-i18n-html'); // 若有就用 innerHTML
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

  // ====== 渲染（含物件→字串回退：title/label/_ + data-i18n-html） ======
  I18N.render = function renderFast() {
    // 文字 / 內文
    for (let n of I18NIndex.text) {
      if (!n.el.isConnected) continue;
      let val = this.t(n.key);
      if (val && typeof val === 'object') {
        val = val.title || val.label || val._; // 物件回退
      }
      if (typeof val === 'string' && val !== n.last) {
        if (n.el.tagName === 'TITLE') {
          document.title = val; // <title> 特殊處理
        } else if (n.html) {
          n.el.innerHTML = val; // 允許 <br> 等 HTML
        } else {
          n.el.textContent = val; // 預設：純文字安全
        }
        n.last = val;
      }
    }
    // 屬性內容
    for (let n of I18NIndex.attrs) {
      if (!n.el.isConnected) continue;
      for (let attr of n.attrs) {
        const key = `${n.baseKey}.${attr}`;
        let val = this.t(key);
        if (val === undefined) val = this.t(n.baseKey);
        if (val && typeof val === 'object') {
          val = val.title || val.label || val._;
        }
        if (typeof val === 'string' && val !== n.last[attr]) {
          n.el.setAttribute(attr, val);
          n.last[attr] = val;
        }
      }
    }
  };

  // ====== 啟動 & 監控新增節點 ======
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

  // ====== 語言選單 UI（共用 #langPortal） ======
  const portal    = document.getElementById('langPortal');
  const btnMobile = document.getElementById('langBtnMobile'); // 行動版
  const footLink  = document.getElementById('footLangLink');  // Footer
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

    // 定位
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
    // 把焦點移回觸發鈕，避免「aria-hidden 包住 focus」警告
    if (anchor && document.activeElement && portal.contains(document.activeElement)) {
      anchor.focus();
    }
    portal.classList.remove('open');
    portal.setAttribute('aria-hidden','true');
    anchor?.setAttribute('aria-expanded','false');
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildMenu();
    syncCurrentLabel(localStorage.getItem(STORE_KEY) || 'en');

    [btnMobile, footLink].forEach(btn=>{
      if (!btn) return;
      btn.setAttribute('aria-haspopup','menu');
      btn.setAttribute('aria-expanded','false');
      btn.addEventListener('click',(e)=>{
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
      // 關閉選單（找出剛剛的 opener）
      const opener = (btnMobile?.getAttribute('aria-expanded')==='true') ? btnMobile
                    : (footLink?.getAttribute('aria-expanded')==='true') ? footLink
                    : null;
      closePortal(opener);
    });
  });

})();

// === (safe) one-shot: 首次進入 post.html 且沒有 ?lang 時補一次參數（避免循環重整） ===
(function () {
  const KEY = 'post.lang.synced.once';
  document.addEventListener('DOMContentLoaded', () => {
    if (!/\/post\.html$/i.test(location.pathname)) return;
    if (sessionStorage.getItem(KEY) === '1') return;

    const url = new URL(location.href);
    if (!url.searchParams.get('lang')) {
      const lang = (window.I18N?.lang || 'en').toLowerCase().replace('-', '_');
      url.searchParams.set('lang', lang);
      sessionStorage.setItem(KEY, '1');
      location.replace(url.toString());
    }
  });
})();