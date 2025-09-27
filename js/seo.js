/* js/seo.js — SEO injector (i18n-aware) */
(function () {
  const SCRIPT  = document.currentScript;
  const PAGE_ID = (SCRIPT?.dataset.page || 'home').trim();
  const SEO_URL = new URL('../seo/seo.json', SCRIPT.src).toString();
  const head = document.head;

  function upsertTag(selector, create) {
    let el = head.querySelector(selector);
    if (!el) { el = create(); head.appendChild(el); }
    return el;
  }
  function addTag(el){ head.appendChild(el); return el; }

  function setMetaName(name, content) {
    if (content == null || content === '') return;
    const el = upsertTag(`meta[name="${CSS.escape(name)}"]`, () => {
      const m = document.createElement('meta'); m.setAttribute('name', name); return m;
    });
    el.setAttribute('content', content);
  }
  function setMetaProp(prop, content) {
    if (content == null || content === '') return;
    const el = upsertTag(`meta[property="${CSS.escape(prop)}"]`, () => {
      const m = document.createElement('meta'); m.setAttribute('property', prop); return m;
    });
    el.setAttribute('content', content);
  }
  function addMeta({name, property, content}) {
    if (!content) return;
    const m = document.createElement('meta');
    if (name) m.setAttribute('name', name);
    if (property) m.setAttribute('property', property);
    m.setAttribute('content', content);
    addTag(m);
  }
  function setLinkRel(rel, href, extra={}) {
    if (!href) return;
    const selector =
      `link[rel="${CSS.escape(rel)}"]` +
      (extra.hreflang ? `[hreflang="${CSS.escape(extra.hreflang)}"]` : '');
    const el = upsertTag(selector, () => {
      const l = document.createElement('link'); l.setAttribute('rel', rel);
      if (extra.hreflang) l.setAttribute('hreflang', extra.hreflang);
      return l;
    });
    el.setAttribute('href', href);
    if (extra.sizes) el.setAttribute('sizes', extra.sizes);
    if (extra.type)  el.setAttribute('type',  extra.type);
  }

  async function loadSEO() {
    const r = await fetch(SEO_URL, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`SEO JSON not found: ${SEO_URL}`);
    return r.json();
  }

  // 從 i18n 取本頁面 title / description（若有）
  function pickI18nTitleDesc() {
    try {
      const I18N = window.I18N;
      if (!I18N || !I18N.t) return {};
      const tKey = `meta.title.${PAGE_ID}`;
      const dKey = `meta.description.${PAGE_ID}`;
      const t = I18N.t(tKey);
      const d = I18N.t(dKey);
      return {
        title: typeof t === 'string' ? t : undefined,
        desc:  typeof d === 'string' ? d : undefined
      };
    } catch { return {}; }
  }

  function applySEO(cfg, langAware=true) {
    const site = cfg.site || {};
    const page = (cfg.pages && cfg.pages[PAGE_ID]) || {};
    const base = (cfg.site && cfg.site.canonicalBase) || location.origin;

    // —— 全站 link：icons / manifest / preconnect…（只插一次）——
    if (!head.querySelector('link[rel="icon"]')) {
      (cfg.links || []).forEach(l => setLinkRel(l.rel, l.href, l));
    }

    // —— 基本 robots / theme-color / 驗證碼 —— 
    if (cfg.robots)     setMetaName('robots', cfg.robots);
    if (cfg.themeColor) setMetaName('theme-color', cfg.themeColor);
    (cfg.verifications || []).forEach(v => addMeta({ name: v.name, content: v.content }));

    // —— alternates (hreflang) —— 
    if (cfg.alternates && typeof cfg.alternates === 'object') {
      Object.entries(cfg.alternates).forEach(([hl, url])=>{
        setLinkRel('alternate', url, { hreflang: hl });
      });
    }

    // —— JSON-LD（全站 + 頁面）——
    function injectJSONLD(blocks){
      if (!blocks) return;
      const arr = Array.isArray(blocks) ? blocks : [blocks];
      arr.forEach(obj=>{
        if (!obj) return;
        const s = document.createElement('script');
        s.type = 'application/ld+json';
        s.textContent = JSON.stringify(obj);
        head.appendChild(s);
      });
    }
    injectJSONLD(cfg.jsonld);
    injectJSONLD(page.jsonld);

    // —— Canonical —— 
    const canonical = page.canonical || (base + location.pathname.replace(/^\//,'/'));
    setLinkRel('canonical', canonical);

    // —— Title / Description（可與 i18n 合併）——
    const i18nTD = langAware ? pickI18nTitleDesc() : {};
    const title = i18nTD.title || document.title || site.og?.site_name || 'KeySearch';
    const description = i18nTD.desc || ''; // 若 i18n 沒提供就留空或由 seo.json 補
    if (title) document.title = title;

    // 若 seo.json 有對應描述，補上預設
    const pageDescFromSeo = (cfg.descriptions && cfg.descriptions[PAGE_ID]) || cfg.defaultDescription;
    const finalDesc = description || pageDescFromSeo || '';
    if (finalDesc) {
      setMetaName('description', finalDesc);
      setMetaProp('og:description', finalDesc);
      setMetaName('twitter:description', finalDesc);
    }

    // —— Open Graph / Twitter —— 
    const ogPage = page.og || {};
    const ogSite = site.og || {};
    setMetaProp('og:type',      ogPage.type || ogSite.type || 'website');
    setMetaProp('og:url',       ogPage.url  || canonical);
    setMetaProp('og:image',     ogPage.image || ogSite.image);
    setMetaProp('og:site_name', ogPage.site_name || ogSite.site_name || 'KeySearch');
    const htmlLang = document.documentElement.lang || 'en';
    setMetaProp('og:locale',    (ogPage.locale || htmlLang).replace('-', '_'));
    setMetaProp('og:title',     ogPage.title || title);

    const twSite = site.twitter || {};
    const twPage = page.twitter || {};
    setMetaName('twitter:card',   twPage.card || twSite.card || 'summary');
    setMetaName('twitter:site',   twPage.site || twSite.site || '@keysearch');
    setMetaName('twitter:creator',twPage.creator || twSite.creator || '@keysearch');
    if (ogPage.image || ogSite.image) setMetaName('twitter:image', ogPage.image || ogSite.image);

    console.info('[SEO] applied+', PAGE_ID);
  }

  // 初次套用
  loadSEO().then(cfg => {
    applySEO(cfg, true);

    // 若語言切換，更新 og:locale / title / description
    document.addEventListener('i18n:changed', () => applySEO(cfg, true));
  }).catch(e => console.error('[SEO] failed', e));
})();