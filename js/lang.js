(function () {
  const BASE = './i18n/';  // 語言檔目錄
  const FALLBACK = 'en';

  const I18N = {
    lang: FALLBACK, dict:{}, cache:new Map(),

    async load(lang){
      const url = `${BASE}${lang}.json`;
      if (!this.cache.has(lang)){
        this.cache.set(lang, fetch(url).then(r=>r.json()));
      }
      return this.cache.get(lang);
    },

    t(key, dict=this.dict){
      return key.split('.').reduce((o,k)=>o?.[k], dict);
    },

    async setLang(input){
      const lang = input.toLowerCase().replace('-','_');
      const [cur, fb] = await Promise.all([ this.load(lang), this.load(FALLBACK) ]);
      this.dict = Object.assign({}, fb, cur);
      this.lang = lang;
      document.documentElement.lang = lang.replace('_','-');
      localStorage.setItem('i18n.lang', lang);

      document.querySelectorAll('[data-i18n]').forEach(el=>{
        const key = el.getAttribute('data-i18n');
        const val = this.t(key);
        if (val) el.textContent = val;
      });
      document.dispatchEvent(new CustomEvent('i18n:changed',{detail:{lang}}));
      console.log('[i18n] switch to:', lang);
    },

    detect(){
      return localStorage.getItem('i18n.lang') || 'en';
    }
  };
  window.I18N = I18N;

  document.addEventListener('DOMContentLoaded', ()=> I18N.setLang(I18N.detect()));

  // ===== 語言選單 UI =====
  const portal = document.getElementById('langPortal');
  const btn    = document.getElementById('langBtnMobile');
  const cur    = document.getElementById('langCurrentMobile');

  portal.hidden = true;
  portal.removeAttribute('aria-hidden');

  const SUPPORTED = [
    ['en','English'],
    ['zh_tw','繁體中文'],
    ['zh_cn','简体中文']
  ];

  if (!portal.dataset.built){
    portal.innerHTML = SUPPORTED.map(([c,l])=>
      `<button type="button" class="lang-item" data-lang="${c}">${l}</button>`
    ).join('');
    portal.dataset.built = '1';
  }

  const setCurLabel = (lang)=>{
    const label = SUPPORTED.find(([c])=>c===lang)?.[1] || 'English';
    cur.textContent = label;
    portal.querySelectorAll('[aria-current]').forEach(b=>b.removeAttribute('aria-current'));
    portal.querySelector(`[data-lang="${lang}"]`)?.setAttribute('aria-current','true');
  };
  document.addEventListener('i18n:changed', ev=> setCurLabel(ev.detail.lang));

  btn.addEventListener('click',(e)=>{
    e.stopPropagation();
    if (portal.hidden){
      const r = btn.getBoundingClientRect();
      portal.style.top = (r.bottom+6)+'px';
      portal.style.left = r.left+'px';
      portal.hidden = false;
    }else portal.hidden = true;
  });

  portal.addEventListener('click', async e=>{
    const b = e.target.closest('[data-lang]');
    if (!b) return;
    await I18N.setLang(b.dataset.lang);
    portal.hidden = true;
  });

  document.addEventListener('click', e=>{
    if (!portal.hidden && !portal.contains(e.target) && !btn.contains(e.target)){
      portal.hidden = true;
    }
  });
})();