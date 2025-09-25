// js/lang.js — 穩定 i18n + 語言選單（支援 mobile 觸發 #langBtnMobile）
// 若未來加桌機按鈕（#langBtn），此檔也會自動支援。

(function () {
  /* ========== 基本設定 ========== */
  const BASE = './i18n/'; // 你的 JSON 路徑：在子資料夾請用相對路徑 ./i18n/
  const FALLBACK = 'en';
  const SUPPORTED = [
    ['en','English'],
    ['zh_tw','繁體中文'],
    ['zh_cn','简体中文'],
    ['ja','日本語'],
    ['ko','한국어']
  ];

  /* ========== i18n 核心 ========== */
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
      // 只把缺的鍵補上
      for (const k in fallback) {
        if (fallback[k] && typeof fallback[k] === 'object' && !Array.isArray(fallback[k])) {
          if (!(k in primary)) primary[k] = {};
          this.mergeFallback(primary[k], fallback[k]);
        } else if (!(k in primary)) {
          primary[k] = fallback[k];
        }
      }
      return primary;
    },
    render(root=document) {
      // 文字內容
      root.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = this.t(key);
        if (typeof val === 'string') el.textContent = val;
      });
      // 屬性（可選）：data-i18n-attr="title,aria-label"
      root.querySelectorAll('[data-i18n-attr]').forEach(el => {
        const baseKey = el.getAttribute('data-i18n');
        const attrs = (el.getAttribute('data-i18n-attr') || '')
          .split(',').map(s=>s.trim()).filter(Boolean);
        attrs.forEach(attr => {
          const key = `${baseKey}.${attr}`;
          const val = this.t(key) ?? this.t(baseKey);
          if (typeof val === 'string') el.setAttribute(attr, val);
        });
      });
    },
    async setLang(input) {
      let lang = (input || FALLBACK).toLowerCase().replace('-', '_'); // zh-tw -> zh_tw
      // 載入當前語言與備援
      const [cur, fb] = await Promise.all([
        this.load(lang),
        this.load(FALLBACK)
      ]);
      // 補齊缺字
      this.dict = this.mergeFallback(JSON.parse(JSON.stringify(cur)), fb);
      this.lang = lang;
      // 設定 <html lang="">
      document.documentElement.lang = lang.replace('_','-');
      // 記憶選擇
      localStorage.setItem('i18n.lang', lang);
      // 渲染
      this.render();
      // 事件（給其他模組用）
      document.dispatchEvent(new CustomEvent('i18n:changed', { detail:{ lang } }));
      console.info('[i18n] switch to:', lang);
    },
    detect() {
      const saved = localStorage.getItem('i18n.lang');
      if (saved) return saved;
      const nav = (navigator.language || 'en').toLowerCase();
      if (nav.startsWith('zh-tw') || nav.startsWith('zh-hant')) return 'zh_tw';
      if (nav.startsWith('zh-cn') || nav.startsWith('zh-hans')) return 'zh_cn';
      if (nav.startsWith('ja')) return 'ja';
      if (nav.startsWith('ko')) return 'ko';
      return 'en';
    },
    async init() {
      await this.setLang(this.detect());
    }
  };
  window.I18N = I18N;

  /* ========== 語言選單（使用共用 Portal：#langPortal） ========== */
  const TRIGGERS = ['#langBtnMobile', '#langBtn']; // 目前你的 HTML 只有 #langBtnMobile
  const portal = document.getElementById('langPortal');

  function ensurePortal() {
    if (!portal) return null;
    // 不用 aria-hidden，改用 hidden 以免出現「focused descendant」錯誤
    portal.hidden = true;
    portal.removeAttribute('aria-hidden');
    portal.setAttribute('tabindex', '-1');
    portal.setAttribute('role', 'menu');
    if (!portal.dataset.built) {
      portal.innerHTML = `
        <ul class="lang-list" role="none">
          ${SUPPORTED.map(([code,label]) =>
            `<li role="none">
               <button type="button" role="menuitem" class="lang-item" data-lang="${code}">${label}</button>
             </li>`).join('')}
        </ul>`;
      portal.dataset.built = '1';
    }
    return portal;
  }

  let lastTrigger = null;

  function openMenu(trigger) {
    const p = ensurePortal();
    if (!p) return;
    lastTrigger = trigger;

    // 位置貼近觸發鈕（可改成 Drawer 效果）
    const r = trigger.getBoundingClientRect();
    p.style.position = 'fixed';
    p.style.top = `${r.bottom + 8}px`;
    p.style.left = `${Math.max(12, r.left)}px`;

    p.hidden = false;

    // 鎖其他區塊焦點（支援 inert 的瀏覽器）
    setInertExcept(p);

    // 焦點到第一個項目
    const first = p.querySelector('.lang-item');
    (first || p).focus();

    document.addEventListener('pointerdown', onDocPointer, true);
    document.addEventListener('keydown', onKeyNav, true);
  }

  function closeMenu() {
    if (!portal || portal.hidden) return;
    portal.hidden = true;
    clearInert();
    if (lastTrigger) lastTrigger.focus();
    document.removeEventListener('pointerdown', onDocPointer, true);
    document.removeEventListener('keydown', onKeyNav, true);
  }

  function onDocPointer(e) {
    if (!portal.contains(e.target) && !TRIGGERS.some(sel => {
      const t = document.querySelector(sel); return t && t.contains(e.target);
    })) closeMenu();
  }

  function onKeyNav(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
    const items = [...portal.querySelectorAll('.lang-item')];
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i+1+items.length)%items.length].focus(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); items[(i-1+items.length)%items.length].focus(); }
  }

  function setInertExcept(node) {
    ['header','main','footer'].forEach(sel=>{
      const el = document.querySelector(sel);
      if (el && !node.contains(el)) el.inert = true;
    });
  }
  function clearInert() {
    ['header','main','footer'].forEach(sel=>{
      const el = document.querySelector(sel);
      if (el) el.inert = false;
    });
  }

  function bindTriggers() {
    TRIGGERS.forEach(sel => {
      const btn = document.querySelector(sel);
      if (!btn) return;
      // aria 屬性
      btn.setAttribute('aria-haspopup', 'menu');
      btn.setAttribute('aria-expanded', 'false');

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (portal.hidden) {
          btn.setAttribute('aria-expanded', 'true');
          openMenu(btn);
        } else {
          btn.setAttribute('aria-expanded', 'false');
          closeMenu();
        }
      });
    });

    // 選單點擊 → 切換語言
    if (portal) {
      portal.addEventListener('click', async (e) => {
        const item = e.target.closest('.lang-item[data-lang]');
        if (!item) return;
        const codeRaw = item.dataset.lang;
        const code = codeRaw.toLowerCase().replace('-', '_');
        await I18N.setLang(code);

        // 更新按鈕當前文字（優先更新你給的 mobile span）
        const curMobile = document.getElementById('langCurrentMobile');
        if (curMobile) curMobile.textContent = item.textContent.trim();

        closeMenu();
      });
    }
  }

  /* ========== 啟動 ========== */
  document.addEventListener('DOMContentLoaded', async () => {
    // 先初始化 i18n（會渲染一次）
    await I18N.init();

    // 若使用者之前切過語言，更新 UI 顯示
    const cur = localStorage.getItem('i18n.lang') || FALLBACK;
    const label = (SUPPORTED.find(([c])=>c===cur)?.[1]) || 'English';
    const curMobile = document.getElementById('langCurrentMobile');
    if (curMobile) curMobile.textContent = label;

    // 初始化選單
    ensurePortal();
    bindTriggers();
  });

})();