// js/lang.js
(function () {
  /* ---------- i18n 核心 ---------- */
  const BASE = './i18n/';   // 語言檔路徑
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
      return key.split('.').reduce((o,k)=> (o && k in o) ? o[k] : undefined, dict);
    },

    mergeFallback(primary, fallback) {
      for (const k in fallback) {
        if (fallback[k] && typeof fallback[k]==='object' && !Array.isArray(fallback[k])) {
          if (!(k in primary)) primary[k] = {};
          this.mergeFallback(primary[k], fallback[k]);
        } else if (!(k in primary)) {
          primary[k] = fallback[k];
        }
      }
      return primary;
    },

    render(root=document) {
      root.querySelectorAll('[data-i18n]').forEach(el=>{
        const key = el.getAttribute('data-i18n');
        const val = this.t(key);
        if (typeof val === 'string') el.textContent = val;
      });
      root.querySelectorAll('[data-i18n-attr]').forEach(el=>{
        const baseKey = el.getAttribute('data-i18n');
        const attrs = (el.getAttribute('data-i18n-attr')||'').split(',').map(s=>s.trim()).filter(Boolean);
        attrs.forEach(attr=>{
          const key = `${baseKey}.${attr}`;
          const val = this.t(key) ?? this.t(baseKey);
          if (typeof val === 'string') el.setAttribute(attr, val);
        });
      });
    },

    async setLang(input) {
      const lang = (input||FALLBACK).toLowerCase().replace('-', '_'); // zh-tw -> zh_tw
      const [cur, fb] = await Promise.all([ this.load(lang), this.load(FALLBACK) ]);
      this.dict = this.mergeFallback(JSON.parse(JSON.stringify(cur)), fb);
      this.lang = lang;

      document.documentElement.lang = lang.replace('_','-');
      localStorage.setItem('i18n.lang', lang);

      this.render();
      document.dispatchEvent(new CustomEvent('i18n:changed', { detail:{ lang } }));
      console.info('[i18n] switch to:', lang);
    },

    detect() {
      const saved = localStorage.getItem('i18n.lang'); if (saved) return saved;
      const nav = (navigator.language||'en').toLowerCase();
      if (nav.startsWith('zh-tw')||nav.startsWith('zh-hant')) return 'zh_tw';
      if (nav.startsWith('zh-cn')||nav.startsWith('zh-hans')) return 'zh_cn';
      if (nav.startsWith('ja')) return 'ja';
      if (nav.startsWith('ko')) return 'ko';
      return 'en';
    },

    async init(){ await this.setLang(this.detect()); }
  };

  window.I18N = I18N;
  document.addEventListener('DOMContentLoaded', ()=>I18N.init());

  /* ---------- 語言選單 UI ---------- */
  const portal    = document.getElementById('langPortal');
  const btnMobile = document.getElementById('langBtnMobile');
  const footLink  = document.getElementById('footLangLink');
  const curMobile = document.getElementById('langCurrentMobile');

  if (!portal) return;

  // 初始化 portal
  portal.hidden = true;
  portal.removeAttribute('aria-hidden');
  portal.setAttribute('role','menu');
  portal.setAttribute('tabindex','-1');

  const SUPPORTED = [
    ['en','English'],
    ['zh_tw','繁體中文'],
    ['zh_cn','简体中文'],
    ['ja','日本語'],
    ['ko','한국어']
  ];

  if (!portal.dataset.built){
    portal.innerHTML = SUPPORTED.map(([code,label]) =>
      `<button type="button" class="lang-item" role="menuitem" data-lang="${code}">${label}</button>`
    ).join('');
    portal.dataset.built = '1';
  }

  const getCur = ()=> (window.I18N?.lang) || localStorage.getItem('i18n.lang') || 'en';
  const setCurLabel = (lang)=>{
    const label = SUPPORTED.find(([c])=>c===lang)?.[1] || 'English';
    if (curMobile) curMobile.textContent = label;
    portal.querySelectorAll('[aria-current="true"]').forEach(b => b.removeAttribute('aria-current'));
    portal.querySelector(`[data-lang="${lang}"]`)?.setAttribute('aria-current','true');
  };
  setCurLabel(getCur());

  let lastTrigger = null;

  function openMenu(anchor){
    lastTrigger = anchor;
    portal.hidden = false;

    const r = anchor.getBoundingClientRect();
    const W = portal.offsetWidth, H = portal.offsetHeight, M = 12;
    let top  = r.bottom + 8, left = r.left;
    if (left + W + M > innerWidth)  left = Math.max(M, innerWidth - W - M);
    if (top  + H + M > innerHeight) top  = Math.max(M, r.top - H - 8);
    portal.style.position = 'fixed';
    portal.style.top  = Math.min(Math.max(M, top),  innerHeight - H - M) + 'px';
    portal.style.left = Math.min(Math.max(M, left), innerWidth  - W - M) + 'px';

    lastTrigger.setAttribute('aria-expanded','true');
    (portal.querySelector('.lang-item') || portal).focus();

    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDocPointer, true);
  }

  function closeMenu(){
    if (portal.hidden) return;
    portal.hidden = true;
    lastTrigger?.setAttribute('aria-expanded','false');
    lastTrigger?.focus();
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerdown', onDocPointer, true);
  }

  function onKey(e){
    if (e.key === 'Escape'){ e.preventDefault(); closeMenu(); return; }
    const items = [...portal.querySelectorAll('.lang-item')];
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown'){ e.preventDefault(); items[(i+1+items.length)%items.length].focus(); }
    if (e.key === 'ArrowUp'){   e.preventDefault(); items[(i-1+items.length)%items.length].focus(); }
  }
  function onDocPointer(e){
    if (!portal.contains(e.target) && !lastTrigger?.contains(e.target)) closeMenu();
  }

  [btnMobile, footLink].forEach(btn=>{
    if (!btn) return;
    btn.setAttribute('aria-haspopup','menu');
    btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click', (e)=>{
      e.preventDefault(); e.stopPropagation();
      portal.hidden ? openMenu(btn) : closeMenu();
    });
  });

  portal.addEventListener('click', async (e)=>{
    const item = e.target.closest('.lang-item[data-lang]');
    if (!item) return;
    const code = item.dataset.lang.toLowerCase().replace('-', '_');
    if (window.I18N?.setLang) await I18N.setLang(code);
    localStorage.setItem('i18n.lang', code);
    setCurLabel(code);
    closeMenu();
  });

  document.addEventListener('i18n:changed', ev => setCurLabel(ev.detail?.lang || getCur()));
  window.addEventListener('resize', ()=>{ if (!portal.hidden) closeMenu(); }, { passive:true });
})();