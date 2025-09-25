// ================================
// KeySearch 多語系控制
// ================================
const I18N = (() => {
  const FALLBACK = 'en';
  const BASE = '/i18n/'; // 建議放在網站根目錄 /i18n/*.json

  return {
    lang: FALLBACK,
    dict: {},

    // 載入 JSON
    async load(lang) {
      const res = await fetch(`${BASE}${lang}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.url}`);
      return res.json();
    },

    // 合併 fallback 字典
    mergeFallback(primary, fallback) {
      if (!primary) return { ...fallback };
      const out = { ...fallback };
      for (const k in primary) {
        out[k] =
          primary[k] && typeof primary[k] === 'object'
            ? this.mergeFallback(primary[k], fallback?.[k] || {})
            : primary[k];
      }
      return out;
    },

    // 翻譯函式
    t(key) {
      return key.split('.').reduce((o, i) => (o ? o[i] : undefined), this.dict) ?? key;
    },

    // 套用翻譯
    render() {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        const txt = this.t(k);
        if (typeof txt === 'string') {
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = txt;
          } else {
            el.innerHTML = txt;
          }
        }
      });
    },

    // 偵測瀏覽器語言
    detect() {
      const nav = navigator.languages ? navigator.languages[0] : navigator.language || FALLBACK;
      const code = nav.toLowerCase().replace('-', '_');
      return code.startsWith('zh') ? (code.includes('tw') ? 'zh_tw' : 'zh_cn') : code.split('_')[0];
    },

    // 切換語言
    async setLang(input) {
      const lang = (input || FALLBACK).toLowerCase().replace('-', '_');

      // 1) 樂觀寫入 localStorage（避免切頁掉回去）
      localStorage.setItem('i18n.lang', lang);

      try {
        // 2) 載入目標 & 後援
        const [cur, fb] = await Promise.all([this.load(lang), this.load(FALLBACK)]);

        // 3) 合併 & 設定
        this.dict = this.mergeFallback(JSON.parse(JSON.stringify(cur)), fb);
        this.lang = lang;

        // 4) HTML lang 屬性
        document.documentElement.lang = lang.replace('_', '-');

        // 5) 渲染
        this.render();

        // 6) 頁面標題（如果 JSON 有）
        const title = this.t('meta.title.home');
        if (typeof title === 'string' && title) document.title = title;

        // 7) 發出事件
        document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang } }));
        console.info('[i18n] switched to:', lang);
      } catch (err) {
        console.error('[i18n] failed to load:', lang, err);

        // 回退到 fallback
        localStorage.setItem('i18n.lang', FALLBACK);
        this.lang = FALLBACK;
        this.dict = await this.load(FALLBACK).catch(() => ({}));
        document.documentElement.lang = FALLBACK;
        this.render();
      }
    },
  };
})();

// ================================
// 初始化
// ================================
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('i18n.lang');
  I18N.setLang(saved || I18N.detect());

  // 綁定語言按鈕
  const langPortal = document.getElementById('langPortal');

  function openLangMenu(trigger) {
    if (!langPortal) return;
    langPortal.innerHTML = `
      <div class="lang-option" data-lang="en">English</div>
      <div class="lang-option" data-lang="zh_cn">简体中文</div>
      <div class="lang-option" data-lang="zh_tw">繁體中文</div>
      <div class="lang-option" data-lang="ja">日本語</div>
      <div class="lang-option" data-lang="ko">한국어</div>
    `;
    langPortal.style.display = 'block';
    langPortal.style.top = `${trigger.getBoundingClientRect().bottom + window.scrollY}px`;
    langPortal.style.left = `${trigger.getBoundingClientRect().left}px`;
    langPortal.setAttribute('aria-hidden', 'false');
  }

  // 點擊事件（桌機/行動版共用）
  document.addEventListener('click', e => {
    const btn = e.target.closest('.lang-btn, #footLangLink');
    if (btn) {
      e.preventDefault();
      openLangMenu(btn);
    } else if (e.target.dataset.lang) {
      I18N.setLang(e.target.dataset.lang);
      langPortal.setAttribute('aria-hidden', 'true');
      langPortal.style.display = 'none';
    } else {
      if (langPortal) {
        langPortal.setAttribute('aria-hidden', 'true');
        langPortal.style.display = 'none';
      }
    }
  });
});