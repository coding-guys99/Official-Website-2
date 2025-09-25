// 極簡穩定版：I18N.setLang('en'|'zh_tw'...)
(() => {
  const I18N = {
    lang: 'en',
    base: '/i18n/',                // ← 你在 GitHub Pages 子路徑：改成相對 `./i18n/`
    dict: {},
    cache: new Map(),
    async load(lang){
      const url = `${this.base}${lang}.json`;
      if (!this.cache.has(lang)) this.cache.set(lang, fetch(url).then(r=>r.json()));
      return this.cache.get(lang);
    },
    t(key){
      return key.split('.').reduce((o,k)=> (o && k in o) ? o[k] : undefined, this.dict);
    },
    render(root=document){
      root.querySelectorAll('[data-i18n]').forEach(el=>{
        const k = el.getAttribute('data-i18n');
        const v = this.t(k);
        if (typeof v === 'string') el.textContent = v;
      });
    },
    async setLang(lang){
      // 正規化：zh-tw -> zh_tw
      lang = lang.toLowerCase().replace('-', '_');
      const cur = await this.load(lang);
      const fb  = await this.load('en');
      // 簡單回填缺字
      this.dict = structuredClone(cur);
      (function fill(a,b){
        for (const k in b) if (!(k in a)) a[k] = b[k]; else if (a[k]&&typeof a[k]==='object') fill(a[k], b[k]);
      })(this.dict, fb);

      this.lang = lang;
      localStorage.setItem('i18n.lang', lang);
      document.documentElement.lang = lang.replace('_','-');
      this.render();
      console.info('[i18n] switch to:', lang);
    },
    async init(){
      const saved = localStorage.getItem('i18n.lang') || 'en';
      await this.setLang(saved);
    }
  };
  window.I18N = I18N;
  document.addEventListener('DOMContentLoaded', ()=>I18N.init());
})();