// js/meta.js — SEO injector (v2)
// 用 data-page 決定載入哪個頁面的 SEO 設定，資料來自 i18n/seo.config.json
(function () {
  const SCRIPT  = document.currentScript;
  const PAGE_ID = (SCRIPT?.dataset.page || 'home').trim();

  const CANDIDATES = [
    new URL('../i18n/seo.config.json', SCRIPT.src).toString(),
    new URL('./i18n/seo.config.json', location.href).toString(),
    new URL('/i18n/seo.config.json', location.origin).toString(),
    new URL('../seo.config.json', SCRIPT.src).toString(),
    new URL('./seo.config.json', location.href).toString(),
    new URL('/seo.config.json', location.origin).toString()
  ];

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

  async function loadConfig() {
    for (const url of CANDIDATES) {
      try {
        const r = await fetch(url, { cache: 'no-cache' });
        if (r.ok) return await r.json();
      } catch {}
    }
    throw new Error('seo.config.json not found');
  }

  function setArrayOG(name, arr) {
    if (!Array.isArray(arr)) return;
    arr.forEach(v => { if (v) addMeta({ property: `og:${name}`, content: v }); });
  }
  function setArrayTwitter(name, arr) {
    if (!Array.isArray(arr)) return;
    arr.forEach(v => { if (v) addMeta({ name: `twitter:${name}`, content: v }); });
  }

  function applySEO(cfg) {
    const page = cfg[PAGE_ID];
    if (!page) { console.warn('[SEO] page key missing:', PAGE_ID); return; }

    // title
    if (page.title) {
      document.title = page.title;
      setMetaProp('og:title', page.og?.title || page.title);
      setMetaName('twitter:title', page.twitter?.title || page.title);
    }

    // description / keywords
    if (page.description) {
      setMetaName('description', page.description);
      setMetaProp('og:description', page.og?.description || page.description);
      setMetaName('twitter:description', page.twitter?.description || page.description);
    }
    if (page.keywords) setMetaName('keywords', page.keywords);

    // canonical
    const canonical = page.canonical || page.og?.url;
    if (canonical) setLinkRel('canonical', canonical);

    // alternates hreflang
    if (page.alternates?.hreflang && typeof page.alternates.hreflang === 'object') {
      Object.entries(page.alternates.hreflang).forEach(([hl, url])=>{
        if (url) setLinkRel('alternate', url, { hreflang: hl });
      });
    }

    // Open Graph
    const og = page.og || {};
    setMetaProp('og:type', og.type || 'website');
    setMetaProp('og:url',  og.url  || canonical || location.href);
    if (og.image) setMetaProp('og:image', og.image);
    setArrayOG('image', og.images);
    setMetaProp('og:site_name', og.site_name || 'KeySearch');
    const htmlLang = document.documentElement.lang || 'en';
    setMetaProp('og:locale', og.locale || htmlLang.replace('-', '_'));
    if (og.updated_time) setMetaProp('og:updated_time', og.updated_time);

    // Twitter
    const tw = page.twitter || {};
    setMetaName('twitter:card', tw.card || 'summary');
    setMetaName('twitter:site', tw.site || '@keysearch');
    setMetaName('twitter:creator', tw.creator || '@keysearch');
    if (og.image) setMetaName('twitter:image', og.image);
    setArrayTwitter('image', tw.images);

    // link extras
    if (Array.isArray(page.links)) {
      page.links.forEach(link => {
        if (!link || !link.rel || !link.href) return;
        setLinkRel(link.rel, link.href, link);
      });
    }

    // meta extras（驗證碼 / robots 擴充等）
    if (Array.isArray(page.metaExtra)) {
      page.metaExtra.forEach(m => addMeta(m));
    }
    if (page.themeColor) setMetaName('theme-color', page.themeColor);
    if (page.robots)     setMetaName('robots', page.robots);

    // JSON-LD（可陣列）
    let blocks = page.jsonld;
    if (!blocks) return;
    if (!Array.isArray(blocks)) blocks = [blocks];
    blocks.forEach(obj => {
      if (!obj || typeof obj !== 'object') return;
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.textContent = JSON.stringify(obj);
      head.appendChild(s);
    });

    console.info('[SEO] applied+', PAGE_ID);
  }

  loadConfig().then(applySEO).catch(e=>console.error('[SEO] failed', e));
})();