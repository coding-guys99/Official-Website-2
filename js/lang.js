// js/lang.js — i18n 核心 + 快速渲染 + Apple-style Portal 語言選單（Header / Footer 共用）
(function () {
  // ========= 基本設定 =========
  const FALLBACK  = 'en';
  const BASE_URL  = new URL('./i18n/', location.href).toString();
  const STORE_KEY = 'i18n.lang';

  // 你的 16 種語言（顯示名稱可依需要調整）
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

  // ========= I18N 物件 =========
  const I18N = {
    lang: FALLBACK,
    dict: {},
    cache: new Map(),

    async load(lang) {
      const url = new URL(`${lang}.json`, BASE_URL).toString();
      if (!this.cache.has(lang)) {
        this.cache.set(lang, fetch(url).then(r=>{
          if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
          return r.json();
        }));
      }
      return this.cache.get(lang);
    },

    // 取值（支援 a.b.c）
    t(key, dict = this.dict) {
      return key.split('.').reduce((o,k)=> (o && k in o) ? o[k] : undefined, dict);
    },

    // 把 fallback 的缺漏鍵補上（不覆蓋已存在）
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

    // 設定語言 + 觸發渲染與事件
    async setLang(input) {
      const lang = (input || FALLBACK).toLowerCase().replace('-', '_');
      try {
        const [cur, fb] = await Promise.all([this.load(lang), this.load(FALLBACK)]);
        this.dict = this.mergeFallback(JSON.parse(JSON.stringify(cur)), fb);
        this.lang = lang;

        document.documentElement.lang = lang.replace('_','-');
        localStorage.setItem(STORE_KEY, lang);

        this.render();

        // 兜底：若 <title> 沒 data-i18n，更新成 meta.title.home
        const title = this.t('meta.title.home');
        if (typeof title === 'string' && title) document.title = title;

        document.dispatchEvent(new CustomEvent('i18n:changed', { detail:{ lang } }));
        console.info('[i18n] switched to:', lang, 'base:', BASE_URL);
      } catch (err) {
        console.error('[i18n] failed to load:', lang, err);
        if (lang !== FALLBACK) {
          localStorage.setItem(STORE_KEY, FALLBACK);
          return this.setLang(FALLBACK);
        }
      }
    },

    // 偵測預設語言
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

  // ========= 快速渲染索引（文字 / 屬性）=========
  const I18NIndex = { text: [], attrs: [] };

  function indexI18nNodes(root = document) {
    // data-i18n (含 data-i18n-html)
    root.querySelectorAll('[data-i18n]').forEach(el => {
      if (el.hasAttribute('data-i18n-attr')) return;  // 這類交給 attrs 流程
      const key  = el.getAttribute('data-i18n');
      const html = el.hasAttribute('data-i18n-html'); // 允許 innerHTML
      I18NIndex.text.push({ el, key, html, last: undefined });
    });

    // data-i18n-attr="title,aria-label"
    root.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const baseKey = el.getAttribute('data-i18n');
      const attrs = (el.getAttribute('data-i18n-attr') || '')
        .split(',').map(s=>s.trim()).filter(Boolean);
      I18NIndex.attrs.push({ el, baseKey, attrs, last: Object.create(null) });
    });
  }

  I18N.render = function renderFast() {
    // 文字 / HTML
    for (let n of I18NIndex.text) {
      if (!n.el.isConnected) continue;
      let val = this.t(n.key);
      if (val && typeof val === 'object') val = val.title || val.label || val._; // 物件回退
      if (typeof val === 'string' && val !== n.last) {
        if (n.el.tagName === 'TITLE')      document.title = val;
        else if (n.html)                    n.el.innerHTML = val;
        else                                n.el.textContent = val;
        n.last = val;
      }
    }
    // 屬性
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

  // 初始與動態監聽
  document.addEventListener('DOMContentLoaded', () => {
    indexI18nNodes(document);
    I18N.setLang(I18N.detect());
  });

  const mo = new MutationObserver(muts => {
    let need = false;
    for (const m of muts) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(n=>{
          if (n.nodeType !== 1) return;
          if (n.matches?.('[data-i18n],[data-i18n-attr]') ||
              n.querySelector?.('[data-i18n],[data-i18n-attr]')) {
            indexI18nNodes(n); need = true;
          }
        });
      }
      if (m.type === 'attributes' &&
          (m.attributeName === 'data-i18n' || m.attributeName === 'data-i18n-attr' || m.attributeName === 'data-i18n-html')) {
        indexI18nNodes(m.target); need = true;
      }
    }
    if (need) requestAnimationFrame(()=> I18N.render());
  });
  document.addEventListener('DOMContentLoaded', () => {
    mo.observe(document.documentElement, {
      childList: true, subtree: true,
      attributes: true,
      attributeFilter: ['data-i18n','data-i18n-attr','data-i18n-html']
    });
  });

  // ========= Apple-style Portal 語言選單（Header + Footer 共用）=========
  const portal    = document.getElementById('langPortal');
  const btnMobile = document.getElementById('langBtnMobile'); // 行動版頭部按鈕
  const footLink  = document.getElementById('footLangLink');  // Footer 連結
  const curMobile = document.getElementById('langCurrentMobile');

  function buildMenuOnce() {
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
    if (!portal || !anchor) return;
    buildMenuOnce();
    portal.classList.add('open');
    portal.removeAttribute('aria-hidden');
    anchor.setAttribute('aria-expanded','true');

    // 定位（避免溢出）
    const r = anchor.getBoundingClientRect();
    const W = portal.offsetWidth || 260;
    const H = portal.offsetHeight || 240;
    const M = 12;
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

  // 綁定 UI
  document.addEventListener('DOMContentLoaded', () => {
    // 行動版 Header 按鈕
    if (btnMobile) {
      btnMobile.setAttribute('aria-haspopup','menu');
      btnMobile.setAttribute('aria-expanded','false');
      btnMobile.addEventListener('click', (e)=>{
        e.preventDefault(); e.stopPropagation();
        if (portal?.classList.contains('open')) closePortal(btnMobile);
        else openPortal(btnMobile);
      });
    }

    // Footer 連結
    if (footLink) {
      footLink.setAttribute('aria-haspopup','menu');
      footLink.setAttribute('aria-expanded','false');
      footLink.addEventListener('click', (e)=>{
        e.preventDefault(); e.stopPropagation();
        if (portal?.classList.contains('open')) closePortal(footLink);
        else openPortal(footLink);
      });
    }

    // 點選語言
    portal?.addEventListener('click', async (e)=>{
      const item = e.target.closest('[data-lang]'); if (!item) return;
      const code = item.dataset.lang.toLowerCase().replace('-', '_');
      await I18N.setLang(code);
      syncCurrentLabel(code);
      // 關閉（找出開啟者）
      const opener =
        (btnMobile?.getAttribute('aria-expanded')==='true') ? btnMobile
      : (footLink?.getAttribute('aria-expanded')==='true')  ? footLink
      : null;
      closePortal(opener);
    });

    // 初始同步目前語言
    syncCurrentLabel(localStorage.getItem(STORE_KEY) || FALLBACK);
  });

  // 語言切換時同步標籤
  document.addEventListener('i18n:changed', (ev)=>{
    syncCurrentLabel(ev.detail?.lang || I18N.lang || FALLBACK);
  });

  // =========（可選）Post 頁：切換語言時同步 URL ?lang=xx，讓內容跟著換 =========
  (function syncPostLangParam(){
    function apply(lang){
      try{
        if (!/\/post\.html$/i.test(location.pathname)) return;
        const url = new URL(location.href);
        const normalized = (lang||'en').toLowerCase().replace('-', '_');
        const cur = (url.searchParams.get('lang')||'').toLowerCase();
        if (cur === normalized || cur === normalized.replace('_','-')) return;
        url.searchParams.set('lang', normalized);
        history.replaceState(null, '', url.toString()); // 不重整，只改 URL
        // 通知 post.js 自己重載內容（若 post.js 有監聽就會更新）
        document.dispatchEvent(new CustomEvent('post:lang-param-updated', { detail:{ lang: normalized } }));
      }catch{}
    }
    document.addEventListener('DOMContentLoaded', ()=> apply(I18N.lang));
    document.addEventListener('i18n:changed', (ev)=> apply(ev.detail?.lang));
  })();

})();