// js/lang.js — i18n 核心 + 快速渲染 + 語言選單 UI
(function () {
  const BASE = './i18n/'; // 語言檔路徑
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
    async setLang(input) {
      const lang = (input || FALLBACK).toLowerCase().replace('-', '_');
      const [cur, fb] = await Promise.all([this.load(lang), this.load(FALLBACK)]);
      this.dict = this.mergeFallback(JSON.parse(JSON.stringify(cur)), fb);
      this.lang = lang;

      document.documentElement.lang = lang.replace('_', '-');
      localStorage.setItem('i18n.lang', lang);

      this.render();

      const title = this.t('meta.title.home');
      if (typeof title === 'string' && title) document.title = title;

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

  /* ======== 快速索引 ======== */
  const I18NIndex = { text: [], attrs: [] };

  function indexI18nNodes(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      if (el.hasAttribute('data-i18n-attr')) return;
      const key = el.getAttribute('data-i18n');
      I18NIndex.text.push({ el, key, last: undefined });
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
      const val = this.t(n.key);
      if (typeof val === 'string' && val !== n.last) {
        n.el.textContent = val;
        n.last = val;
      }
    }
    for (let n of I18NIndex.attrs) {
      if (!n.el.isConnected) continue;
      for (let attr of n.attrs) {
        const key = `${n.baseKey}.${attr}`;
        const val = this.t(key) ?? this.t(n.baseKey);
        if (typeof val === 'string' && val !== n.last[attr]) {
          n.el.setAttribute(attr, val);
          n.last[attr] = val;
        }
      }
    }
    const title = this.t('meta.title.home');
    if (typeof title === 'string' && title) document.title = title;
  };

  document.addEventListener('DOMContentLoaded', () => {
    indexI18nNodes(document);
    I18N.setLang(I18N.detect());
  });

  // 自動監聽 DOM 變化 → 增量索引
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
        (m.attributeName === 'data-i18n' || m.attributeName === 'data-i18n-attr')) {
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
      attributeFilter: ['data-i18n', 'data-i18n-attr']
    });
  });

  /* ======== 語言選單 UI ======== */
  const portal    = document.getElementById('langPortal');
  const btnMobile = document.getElementById('langBtnMobile');
  const footLink  = document.getElementById('footLangLink');
  const curMobile = document.getElementById('langCurrentMobile');

  if (portal) {
    const SUPPORTED = [
      ['en','English'],
      ['zh_tw','繁體中文'],
      ['zh_cn','简体中文'],
      ['ja','日本語'],
      ['ko','한국어']
    ];

    if (!portal.dataset.built) {
      portal.innerHTML = SUPPORTED
        .map(([code,label]) => `<button type="button" role="menuitem" class="lang-item" data-lang="${code}">${label}</button>`)
        .join('');
      portal.dataset.built = '1';
    }

    function syncCurrentLabel(code) {
      const label = SUPPORTED.find(([c]) => c === code)?.[1] || 'English';
      if (curMobile) curMobile.textContent = label;
      portal.querySelectorAll('[aria-current="true"]').forEach(b => b.removeAttribute('aria-current'));
      portal.querySelector(`[data-lang="${code}"]`)?.setAttribute('aria-current','true');
    }
    document.addEventListener('i18n:changed', (ev) => syncCurrentLabel(ev.detail?.lang || 'en'));
    document.addEventListener('DOMContentLoaded', () => syncCurrentLabel(localStorage.getItem('i18n.lang') || 'en'));

    function openPortal(anchor) {
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
      const onDoc = (e)=>{ if (!portal.contains(e.target) && !anchor.contains(e.target)) closePortal(); };
      const onEsc = (e)=>{ if (e.key==='Escape') closePortal(); };
      setTimeout(()=>{
        document.addEventListener('click', onDoc, { once:true });
        document.addEventListener('keydown', onEsc, { once:true });
      },0);
    }
    function closePortal() {
      portal.classList.remove('open');
      portal.setAttribute('aria-hidden','true');
    }

    [btnMobile, footLink].forEach(btn=>{
      if (!btn) return;
      btn.setAttribute('aria-haspopup','menu');
      btn.setAttribute('aria-expanded','false');
      btn.addEventListener('click',(e)=>{
        e.preventDefault();
        e.stopPropagation();
        if (portal.classList.contains('open')) {
          closePortal(); btn.setAttribute('aria-expanded','false');
        } else {
          openPortal(btn); btn.setAttribute('aria-expanded','true');
        }
      });
    });

    portal.addEventListener('click', async (e)=>{
      const item = e.target.closest('[data-lang]');
      if (!item) return;
      const code = item.dataset.lang.toLowerCase().replace('-','_');
      await I18N.setLang(code);
      syncCurrentLabel(code);
      closePortal();
    });

    const mo2 = new MutationObserver(()=>{
      const isOpen = portal.classList.contains('open');
      if (isOpen) portal.removeAttribute('aria-hidden');
      else portal.setAttribute('aria-hidden','true');
    });
    mo2.observe(portal, { attributes:true, attributeFilter:['class','aria-hidden'] });

    window.addEventListener('resize',()=>{ if (portal.classList.contains('open')) closePortal(); },{passive:true});
  }
})();