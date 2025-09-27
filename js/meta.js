// js/meta.js — Per-page title/description from i18n (v3)
(function () {
  const FALLBACK_LANG = 'en';
  const PAGE_ID = (document.currentScript?.dataset.page || 'home').trim();

  // 和 lang.js 一致：當前語系（localStorage/i18n.lang），否則偵測
  function detectLang() {
    const saved = localStorage.getItem('i18n.lang');
    if (saved) return saved;
    const nav = (navigator.language || 'en').toLowerCase();
    if (nav.startsWith('zh-tw') || nav.startsWith('zh-hant')) return 'zh_tw';
    if (nav.startsWith('zh-cn') || nav.startsWith('zh-hans')) return 'zh_cn';
    return 'en';
  }

  function i18nUrl(code) {
    return new URL(`../i18n/${code}.json`, document.currentScript.src).toString();
  }

  async function loadDict(lang) {
    const urls = [
      i18nUrl(lang),
      new URL(`./i18n/${lang}.json`, location.href).toString(),
      new URL(`/i18n/${lang}.json`, location.origin).toString()
    ];
    for (const u of urls) {
      try { const r = await fetch(u, { cache: 'no-cache' }); if (r.ok) return r.json(); } catch {}
    }
    throw new Error(`i18n not found for ${lang}`);
  }

  function pick(obj, path) {
    return path.split('.').reduce((o,k)=> (o && k in o) ? o[k] : undefined, obj);
  }

  // 依頁面提供 description 回退邏輯（你現在的 en.json 沒有 meta.description.*，就用各頁 lead/desc）
  function getPageDescription(dict, page) {
    const map = {
      home:     ['meta.description.home',     'home.hero.sub'],
      features: ['meta.description.features', 'features.lead'],
      download: ['meta.description.download', 'download.lead'],
      pricing:  ['meta.description.pricing',  'pricing.lead'],
      about:    ['meta.description.about',    'about.desc'],
      support:  ['meta.description.support',  'support.lead'],
      news:     ['meta.description.news',     'news.lead'],
      donate:   ['meta.description.donate',   'donate.desc']
    }[page] || [];
    for (const key of map) {
      const v = pick(dict, key);
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return ''; // 找不到就不寫入，保留原 meta
  }

  function setMetaName(name, content) {
    if (!content) return;
    let el = document.head.querySelector(`meta[name="${CSS.escape(name)}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
    el.setAttribute('content', content);
  }

  (async function run(){
    const lang = (localStorage.getItem('i18n.lang') || detectLang()).toLowerCase().replace('-','_');
    let dict;
    try {
      const [cur, fb] = await Promise.all([ loadDict(lang), loadDict(FALLBACK_LANG) ]);
      // 簡單回退合併（只補缺）
      dict = JSON.parse(JSON.stringify(cur));
      (function merge(a,b){ for(const k in b){ if(!(k in a)) a[k]=b[k]; else if(a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k])) merge(a[k], b[k]); } })(dict, fb);
    } catch(e) {
      console.warn('[meta] i18n load failed, fallback to en', e);
      dict = await loadDict(FALLBACK_LANG);
    }

    // title
    const tKey = `meta.title.${PAGE_ID}`;
    const title = pick(dict, tKey);
    if (typeof title === 'string' && title.trim()) {
      document.title = title.trim();
    }

    // description
    const desc = getPageDescription(dict, PAGE_ID);
    if (desc) setMetaName('description', desc);

    // 同步 og/twitter（僅標題/描述，完整 OG 交給 seo.js）
    let elOgTitle = document.querySelector('meta[property="og:title"]');
    if (title && !elOgTitle) { elOgTitle = document.createElement('meta'); elOgTitle.setAttribute('property','og:title'); elOgTitle.content = title; document.head.appendChild(elOgTitle); }
    let elOgDesc = document.querySelector('meta[property="og:description"]');
    if (desc && !elOgDesc) { elOgDesc = document.createElement('meta'); elOgDesc.setAttribute('property','og:description'); elOgDesc.content = desc; document.head.appendChild(elOgDesc); }
    if (title) setMetaName('twitter:title', title);
    if (desc)  setMetaName('twitter:description', desc);
  })();
})();