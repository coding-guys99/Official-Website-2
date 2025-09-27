// js/seo.js — Global SEO injector from /seo/seo.json (v3)
(function () {
  const SCRIPT  = document.currentScript;
  const PAGE_ID = (SCRIPT?.dataset.page || 'home').trim();
  const CANDIDATES = [
    new URL('../seo/seo.json', SCRIPT.src).toString(),
    new URL('./seo/seo.json',  location.href).toString(),
    new URL('/seo/seo.json',   location.origin).toString()
  ];
  const head = document.head;

  function upsert(selector, create) {
    let el = head.querySelector(selector);
    if (!el) { el = create(); head.appendChild(el); }
    return el;
  }
  function metaByName(name, content){
    if (!content) return;
    const el = upsert(`meta[name="${CSS.escape(name)}"]`, ()=>{ const m=document.createElement('meta'); m.setAttribute('name',name); return m; });
    el.setAttribute('content', content);
  }
  function metaByProp(prop, content){
    if (!content) return;
    const el = upsert(`meta[property="${CSS.escape(prop)}"]`, ()=>{ const m=document.createElement('meta'); m.setAttribute('property',prop); return m; });
    el.setAttribute('content', content);
  }
  function addMeta(m){
    if (!m || (!m.name && !m.property) || !m.content) return;
    const el = document.createElement('meta');
    if (m.name) el.setAttribute('name', m.name);
    if (m.property) el.setAttribute('property', m.property);
    el.setAttribute('content', m.content);
    head.appendChild(el);
  }
  function linkRel(rel, href, extra={}){
    if (!href) return;
    const selector = `link[rel="${CSS.escape(rel)}"]` + (extra.hreflang?`[hreflang="${CSS.escape(extra.hreflang)}"]`:'');
    const el = upsert(selector, ()=>{ const l=document.createElement('link'); l.setAttribute('rel',rel); if(extra.hreflang) l.setAttribute('hreflang', extra.hreflang); return l; });
    el.setAttribute('href', href);
    if (extra.sizes) el.setAttribute('sizes', extra.sizes);
    if (extra.type)  el.setAttribute('type',  extra.type);
    if (extra.as)    el.setAttribute('as',    extra.as);
    if (extra.crossorigin) el.setAttribute('crossorigin', extra.crossorigin);
  }
  function addJsonLd(obj){
    if (!obj || typeof obj !== 'object') return;
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(obj);
    head.appendChild(s);
  }

  async function loadCfg() {
    for (const u of CANDIDATES) {
      try { const r = await fetch(u, {cache:'no-cache'}); if (r.ok) return r.json(); } catch {}
    }
    throw new Error('seo.json not found');
  }

  function apply(cfg){
    const site = cfg.site || {};
    const page = (cfg.pages && cfg.pages[PAGE_ID]) || {};

    // ---- Canonical / alternates
    const canonical = page.canonical || site.canonicalBase && (site.canonicalBase.replace(/\/+$/,'') + `/${PAGE_ID}.html`);
    if (canonical) linkRel('canonical', canonical);

    if (cfg.alternates && typeof cfg.alternates === 'object') {
      Object.entries(cfg.alternates).forEach(([hl, url]) => linkRel('alternate', url, { hreflang: hl }));
    }

    // ---- Icons / manifest / preconnect / dns-prefetch
    (cfg.links || []).forEach(l => linkRel(l.rel, l.href, l));

    // ---- robots / theme-color / site-verifications
    if (cfg.robots)     metaByName('robots', cfg.robots);
    if (cfg.themeColor) metaByName('theme-color', cfg.themeColor);
    (cfg.verifications || []).forEach(v => addMeta(v)); // [{name:'google-site-verification',content:'...'}]

    // ---- Open Graph (基本：由 meta.js 寫入 og:title / og:description，這裡補其餘)
    const pageUrl = canonical || location.href;
    metaByProp('og:type', page.og?.type || site.og?.type || 'website');
    metaByProp('og:url',  page.og?.url  || pageUrl);
    metaByProp('og:site_name', site.og?.site_name || site.siteName || 'KeySearch');
    metaByProp('og:image', page.og?.image || site.og?.image);
    (page.og?.images || site.og?.images || []).forEach(img => addMeta({property:'og:image', content: img}));

    // ---- Twitter
    const tw = { ...(site.twitter||{}), ...(page.twitter||{}) };
    metaByName('twitter:card',   tw.card   || 'summary');
    metaByName('twitter:site',   tw.site   || '@keysearch');
    metaByName('twitter:creator',tw.creator|| '@keysearch');
    if (page.og?.image || site.og?.image) metaByName('twitter:image', page.og?.image || site.og?.image);
    (tw.images || []).forEach(img => addMeta({name:'twitter:image', content: img}));

    // ---- JSON-LD：全站 + 每頁（可多段 / 陣列）
    const blocks = []
      .concat(cfg.jsonld || [])
      .concat(page.jsonld || []);
    blocks.forEach(addJsonLd);

    // ---- 其他額外 meta
    (cfg.metaExtra || []).forEach(addMeta);
    (page.metaExtra || []).forEach(addMeta);

    console.info('[SEO] applied', PAGE_ID);
  }

  loadCfg().then(apply).catch(e=>console.error('[SEO] failed', e));
})();