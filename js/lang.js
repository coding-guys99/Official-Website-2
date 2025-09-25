// js/lang.js — 簡化快速版 i18n
(function () {
  const BASE = './i18n/';
  const FALLBACK = 'en';

  const I18N = {
    lang: FALLBACK,
    dict: {},

    async load(lang) {
      const url = `${BASE}${lang}.json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return res.json();
    },

    async setLang(lang) {
      this.lang = lang;
      localStorage.setItem('i18n.lang', lang);
      this.dict = await this.load(lang);
      this.render();

      document.documentElement.lang = lang.replace('_', '-');
      console.info('[i18n] switched to:', lang);
    },

    detect() {
      return localStorage.getItem('i18n.lang') ||
             (navigator.language || 'en').toLowerCase().startsWith('zh')
             ? 'zh_tw'
             : 'en';
    },

    t(key) {
      return key.split('.').reduce((o, k) => (o && k in o) ? o[k] : undefined, this.dict);
    },

    render() {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = this.t(key);
        if (typeof val === 'string') el.textContent = val;
      });
      document.querySelectorAll('[data-i18n-attr]').forEach(el => {
        const base = el.getAttribute('data-i18n');
        const attrs = el.getAttribute('data-i18n-attr').split(',');
        attrs.forEach(attr => {
          const val = this.t(`${base}.${attr}`) || this.t(base);
          if (typeof val === 'string') el.setAttribute(attr.trim(), val);
        });
      });
    }
  };
  window.I18N = I18N;

  // === 語言選單 ===
  const portal    = document.getElementById('langPortal');
  const btnMobile = document.getElementById('langBtnMobile');
  const footLink  = document.getElementById('footLangLink');
  const curMobile = document.getElementById('langCurrentMobile');

  const SUPPORTED = [
    ['en','English'],
    ['zh_tw','繁體中文'],
    ['zh_cn','简体中文'],
    ['ja','日本語'],
    ['ko','한국어']
  ];

  if (portal && !portal.dataset.built) {
    portal.innerHTML = SUPPORTED.map(
      ([code,label]) => `<button type="button" data-lang="${code}">${label}</button>`
    ).join('');
    portal.dataset.built = '1';
  }

  function syncLabel(code) {
    const label = SUPPORTED.find(([c]) => c === code)?.[1] || 'English';
    if (curMobile) curMobile.textContent = label;
  }

  function openPortal(anchor) {
    portal.classList.add('open');
    portal.removeAttribute('aria-hidden');
    const r = anchor.getBoundingClientRect();
    portal.style.top  = r.bottom + 8 + 'px';
    portal.style.left = r.left + 'px';
    document.addEventListener('click', closePortal, { once: true });
  }
  function closePortal() {
  // 移除焦點，避免 aria-hidden 警告
  if (portal.contains(document.activeElement)) {
    document.activeElement.blur();
  }

  portal.classList.remove('open');
  portal.setAttribute('aria-hidden','true');
}

  [btnMobile, footLink].forEach(btn=>{
    if (!btn) return;
    btn.addEventListener('click',(e)=>{
      e.preventDefault();
      e.stopPropagation();
      portal.classList.contains('open') ? closePortal() : openPortal(btn);
    });
  });

  portal?.addEventListener('click', async (e)=>{
    const item = e.target.closest('[data-lang]');
    if (!item) return;
    const code = item.dataset.lang;
    await I18N.setLang(code);
    syncLabel(code);
    closePortal();
  });

  // === 初始化 ===
  document.addEventListener('DOMContentLoaded', ()=>{
    const lang = I18N.detect();
    I18N.setLang(lang);
    syncLabel(lang);
  });
})();