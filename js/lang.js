// ================================
// KeySearch i18n with auto BASE resolve
// ================================
(function(){
  const FALLBACK = 'en';

  const I18N = {
    lang: FALLBACK,
    dict: {},
    base: null, // 例如 '/Official-Website/i18n/' 或 './i18n/'

    // ---------- 0) 動態解析 i18n 目錄 ----------
    async resolveBase() {
      // 若先前已成功解析，直接用
      const cached = localStorage.getItem('i18n.base');
      if (cached) {
        this.base = cached;
        return;
      }

      const script = document.currentScript || (function(){
        // 找到包含 lang.js 的 <script>
        const arr = Array.from(document.scripts || []);
        return arr.find(s=>/\/js\/lang\.js(\?|#|$)/.test(s.src)) || arr[arr.length-1];
      })();

      const origin = location.origin;
      const path   = location.pathname; // 例如 /Official-Website/index.html
      const firstSeg = path.split('/').filter(Boolean)[0] || ''; // 例如 'Official-Website'

      // 由 script src 推導：.../js/lang.js -> .../i18n/
      let fromScript = '';
      if (script && script.src) {
        try {
          const u = new URL(script.src, origin);
          // 取出到 /js/ 之前的目錄
          const dir = u.pathname.replace(/\/js\/lang\.js.*$/,'/');
          fromScript = new URL('./i18n/', origin + dir).pathname; // 結果是一個絕對 path
        } catch(e){}
      }

      // 候選清單（依序嘗試）
      const candidates = [
        fromScript || '',                                 // 由 script 推導
        `/${firstSeg ? firstSeg + '/' : ''}i18n/`,       // /<repo>/i18n/（GitHub Pages 專案頁）
        '/i18n/',                                        // 網站根目錄
        './i18n/'                                        // 與 HTML 同層
      ].filter(Boolean);

      // 確保唯一
      const unique = [...new Set(candidates)];

      // 逐一嘗試抓 en.json，第一個成功的就用
      for (const base of unique) {
        try {
          const testUrl = new URL(base + 'en.json', origin);
          const res = await fetch(testUrl.href, { method:'GET', cache:'no-store' });
          if (res.ok) {
            this.base = base;
            localStorage.setItem('i18n.base', base);
            console.info('[i18n] base resolved =>', base);
            return;
          }
        } catch(e){}
      }

      // 都失敗，最後用相對路徑，可能 404，但至少不爆炸
      this.base = './i18n/';
      console.warn('[i18n] base fallback to ./i18n/ (may 404)');
    },

    async load(lang) {
      if (!this.base) await this.resolveBase();
      const origin = location.origin;
      const url = new URL(this.base + `${lang}.json`, origin).href;
      const res = await fetch(url, { cache:'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return res.json();
    },

    mergeFallback(primary, fallback) {
      if (!primary) return { ...fallback };
      const out = { ...fallback };
      for (const k in primary) {
        out[k] =
          primary[k] && typeof primary[k] === 'object' && !Array.isArray(primary[k])
            ? this.mergeFallback(primary[k], fallback?.[k] || {})
            : primary[k];
      }
      return out;
    },

    t(key) {
      return key.split('.').reduce((o, i) => (o ? o[i] : undefined), this.dict);
    },

    render() {
      // data-i18n（文字/HTML）
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        const val = this.t(k);
        if (typeof val === 'string') {
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            el.placeholder = val;
          } else {
            el.innerHTML = val;
          }
        }
      });

      // data-i18n-attr（屬性翻譯，如 title/aria-label 等）
      document.querySelectorAll('[data-i18n-attr]').forEach(el => {
        const baseKey = el.getAttribute('data-i18n');
        const attrs = (el.getAttribute('data-i18n-attr') || '')
          .split(',').map(s=>s.trim()).filter(Boolean);
        attrs.forEach(a=>{
          const v = this.t(`${baseKey}.${a}`) ?? this.t(baseKey);
          if (typeof v === 'string') el.setAttribute(a, v);
        });
      });

      const title = this.t('meta.title.home');
      if (typeof title === 'string' && title) document.title = title;
    },

    detect() {
      const nav = (navigator.languages && navigator.languages[0]) || navigator.language || FALLBACK;
      const code = nav.toLowerCase().replace('-', '_');
      if (code.startsWith('zh')) return code.includes('tw') || code.includes('hant') ? 'zh_tw' : 'zh_cn';
      return code.split('_')[0] || FALLBACK;
    },

    async setLang(input) {
      const lang = (input || FALLBACK).toLowerCase().replace('-', '_');

      // 先樂觀寫入，避免換頁倒回去
      localStorage.setItem('i18n.lang', lang);

      try {
        const [cur, fb] = await Promise.all([this.load(lang), this.load(FALLBACK)]);
        this.dict = this.mergeFallback(JSON.parse(JSON.stringify(cur)), fb);
        this.lang = lang;

        document.documentElement.lang = lang.replace('_','-');
        this.render();

        const title = this.t('meta.title.home');
        if (typeof title === 'string' && title) document.title = title;

        document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang } }));
        console.info('[i18n] switched to:', lang, 'base:', this.base);
      } catch (err) {
        console.error('[i18n] failed to load:', lang, err);
        // 回退
        localStorage.setItem('i18n.lang', FALLBACK);
        this.lang = FALLBACK;
        try {
          this.dict = await this.load(FALLBACK);
        } catch(e){ this.dict = {}; }
        document.documentElement.lang = FALLBACK;
        this.render();
      }
    }
  };

  // 暴露全域
  window.I18N = I18N;

  // ================================
  // 初始化：先解析 base，再用 saved->detect
  // ================================
  document.addEventListener('DOMContentLoaded', async () => {
    const saved = localStorage.getItem('i18n.lang') || I18N.detect();
    await I18N.resolveBase();
    I18N.setLang(saved);
    bindLangUI();
  });

  // ================================
  // 簡易語言選單（沿用 #langPortal）
  // ================================
  function bindLangUI(){
    const portal    = document.getElementById('langPortal');
    const btnMobile = document.getElementById('langBtnMobile');
    const footLink  = document.getElementById('footLangLink');
    const curMobile = document.getElementById('langCurrentMobile');

    const SUPPORTED = [
      ['en','English'],
      ['zh_cn','简体中文'],
      ['zh_tw','繁體中文'],
      ['ja','日本語'],
      ['ko','한국어']
    ];

    if (!portal) return;

    if (!portal.dataset.built) {
      portal.innerHTML = SUPPORTED
        .map(([c,l])=>`<button type="button" class="lang-item" data-lang="${c}">${l}</button>`)
        .join('');
      portal.dataset.built = '1';
    }

    function syncLabel(code){
      const label = SUPPORTED.find(([c])=>c===code)?.[1] || 'English';
      if (curMobile) curMobile.textContent = label;
      portal.querySelectorAll('[aria-current="true"]').forEach(b=>b.removeAttribute('aria-current'));
      portal.querySelector(`[data-lang="${code}"]`)?.setAttribute('aria-current','true');
    }
    document.addEventListener('i18n:changed', e => syncLabel(e.detail?.lang || 'en'));
    syncLabel(localStorage.getItem('i18n.lang') || 'en');

    function openPortal(anchor){
      portal.classList.add('open');
      portal.removeAttribute('aria-hidden');
      const r = anchor.getBoundingClientRect();
      const W = portal.offsetWidth, H = portal.offsetHeight, M = 12;
      let top  = r.bottom + 8 + window.scrollY;
      let left = r.left + window.scrollX;
      if (left + W + M > innerWidth + window.scrollX)  left = Math.max(M, innerWidth + window.scrollX - W - M);
      if (top  + H + M > innerHeight + window.scrollY) top  = Math.max(M, r.top + window.scrollY - H - 8);
      portal.style.position = 'absolute';
      portal.style.top  = Math.min(Math.max(M, top),  innerHeight + window.scrollY - H - M) + 'px';
      portal.style.left = Math.min(Math.max(M, left), innerWidth  + window.scrollX - W - M) + 'px';

      const onDoc = (e)=>{ if (!portal.contains(e.target) && !anchor.contains(e.target)) closePortal(); };
      const onEsc = (e)=>{ if (e.key==='Escape') closePortal(); };
      setTimeout(()=>{
        document.addEventListener('click', onDoc, { once:true });
        document.addEventListener('keydown', onEsc, { once:true });
      },0);
    }
    function closePortal(){
      portal.classList.remove('open');
      portal.setAttribute('aria-hidden','true');
    }

    [btnMobile, footLink].forEach(btn=>{
      if (!btn) return;
      btn.setAttribute('aria-haspopup','menu');
      btn.setAttribute('aria-expanded','false');
      btn.addEventListener('click', e=>{
        e.preventDefault();
        e.stopPropagation();
        if (portal.classList.contains('open')) {
          closePortal(); btn.setAttribute('aria-expanded','false');
        } else {
          openPortal(btn); btn.setAttribute('aria-expanded','true');
        }
      });
    });

    portal.addEventListener('click', async e=>{
      const item = e.target.closest('[data-lang]');
      if (!item) return;
      const code = item.dataset.lang;
      await I18N.setLang(code);
      syncLabel(code);
      closePortal();
    });
  }
})();