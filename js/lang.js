// js/lang.js — i18n 核心 + 語言選單 UI（不改你的 HTML/CSS）
(function () {
  /* ========== i18n 核心 ========== */
  const BASE = './i18n/';         // 語言檔相對路徑
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
    render(root = document) {
      // 文本
      root.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = this.t(key);
        if (typeof val === 'string') el.textContent = val;
      });
      // 屬性（可選）：data-i18n-attr="title,aria-label,placeholder"
      root.querySelectorAll('[data-i18n-attr]').forEach(el => {
        const baseKey = el.getAttribute('data-i18n');
        const attrs = (el.getAttribute('data-i18n-attr') || '')
          .split(',').map(s => s.trim()).filter(Boolean);
        attrs.forEach(attr => {
          const key = `${baseKey}.${attr}`;
          const val = this.t(key) ?? this.t(baseKey);
          if (typeof val === 'string') el.setAttribute(attr, val);
        });
      });
    },
    async setLang(input) {
      const lang = (input || FALLBACK).toLowerCase().replace('-', '_'); // zh-tw → zh_tw
      const [cur, fb] = await Promise.all([ this.load(lang), this.load(FALLBACK) ]);
      this.dict = this.mergeFallback(JSON.parse(JSON.stringify(cur)), fb);
      this.lang = lang;

      document.documentElement.lang = lang.replace('_', '-');
      localStorage.setItem('i18n.lang', lang);

      this.render();
      // 同步 <title>
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

  // 初始語言
  document.addEventListener('DOMContentLoaded', () => I18N.setLang(I18N.detect()));

  /* ========== 語言選單 UI（建立 + 開關） ========== */
  const portal    = document.getElementById('langPortal');          // 你的共用節點
  const btnMobile = document.getElementById('langBtnMobile');       // 行動版按鈕
  const footLink  = document.getElementById('footLangLink');        // Footer 入口（若有）
  const curMobile = document.getElementById('langCurrentMobile');   // 行動版顯示名稱

  if (!portal) return;

  // 用 aria-hidden 搭配 class="open"（相容你現有 CSS）
  portal.setAttribute('aria-hidden', 'true'); // 預設關閉

  // 支援語言（清單顯示文字）
  const SUPPORTED = [
    ['en',    'English'],
    ['zh_tw', '繁體中文'],
    ['zh_cn', '简体中文'],
    ['ja',    '日本語'],
    ['ko',    '한국어']
  ];

  // 只建立一次清單
  if (!portal.dataset.built) {
    portal.innerHTML = SUPPORTED
      .map(([code, label]) =>
        `<button type="button" role="menuitem" class="lang-item" data-lang="${code}">${label}</button>`
      ).join('');
    portal.dataset.built = '1';
  }

  // 顯示目前語言標籤 & aria-current
  function syncCurrentLabel(code) {
    const label = SUPPORTED.find(([c]) => c === code)?.[1] || 'English';
    if (curMobile) curMobile.textContent = label;
    portal.querySelectorAll('[aria-current="true"]').forEach(b => b.removeAttribute('aria-current'));
    portal.querySelector(`[data-lang="${code}"]`)?.setAttribute('aria-current', 'true');
  }
  document.addEventListener('i18n:changed', (ev) => syncCurrentLabel(ev.detail?.lang || 'en'));
  // 初次同步
  document.addEventListener('DOMContentLoaded', () => syncCurrentLabel(localStorage.getItem('i18n.lang') || 'en'));

  function openPortal(anchor) {
    portal.classList.add('open');
    portal.removeAttribute('aria-hidden');

    // 位置：貼著觸發按鈕左上角
    const r = anchor.getBoundingClientRect();
    const W = portal.offsetWidth, H = portal.offsetHeight, M = 12;
    let top  = r.bottom + 8;
    let left = r.left;
    if (left + W + M > innerWidth)  left = Math.max(M, innerWidth - W - M);
    if (top  + H + M > innerHeight) top  = Math.max(M, r.top - H - 8);

    portal.style.position = 'fixed';
    portal.style.top  = Math.min(Math.max(M, top),  innerHeight - H - M) + 'px';
    portal.style.left = Math.min(Math.max(M, left), innerWidth  - W - M) + 'px';

    // 關閉策略
    const onDoc = (e) => { if (!portal.contains(e.target) && !anchor.contains(e.target)) closePortal(); };
    const onEsc = (e) => { if (e.key === 'Escape') closePortal(); };
    setTimeout(() => {
      document.addEventListener('click', onDoc, { once: true });
      document.addEventListener('keydown', onEsc, { once: true });
    }, 0);
  }
  function closePortal() {
    portal.classList.remove('open');
    portal.setAttribute('aria-hidden', 'true');
  }

  // 綁定兩個觸發點（有就綁，沒有就略過）
  [btnMobile, footLink].forEach(btn => {
    if (!btn) return;
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (portal.classList.contains('open')) {
        closePortal(); btn.setAttribute('aria-expanded','false');
      } else {
        openPortal(btn); btn.setAttribute('aria-expanded','true');
      }
    });
  });

  // 點選語言 → 真的切換 + 更新顯示 + 關閉選單
  portal.addEventListener('click', async (e) => {
    const item = e.target.closest('.lang-item[data-lang], [data-lang]');
    if (!item) return;
    const raw  = item.dataset.lang || '';
    const code = raw.toLowerCase().replace('-', '_');
    await I18N.setLang(code);
    syncCurrentLabel(code);
    closePortal();
  });

  // 防止「aria-hidden 祖先遮蔽焦點」的警告：用 MutationObserver 維護
  const mo = new MutationObserver(() => {
    const isOpen = portal.classList.contains('open');
    if (isOpen) portal.removeAttribute('aria-hidden'); else portal.setAttribute('aria-hidden','true');
  });
  mo.observe(portal, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });

  // 保險：視窗尺寸變動就關閉，避免定位跑掉
  window.addEventListener('resize', () => { if (portal.classList.contains('open')) closePortal(); }, { passive: true });
})();