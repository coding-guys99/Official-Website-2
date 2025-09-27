// js/seo.js — 全站 SEO 注入（title/meta/link/OG/Twitter/JSON-LD）
(function () {
  const CONFIG_URL = new URL('../seo/seo.config.json', document.currentScript.src).toString();

  const HEAD = document.head;
  const removeOld = (sel) => HEAD.querySelectorAll(sel).forEach(n => n.remove());
  const add = (el) => HEAD.appendChild(el);

  function meta(name, content) {
    if (!content) return;
    const m = document.createElement('meta');
    if (name.startsWith('og:') || name.startsWith('twitter:')) m.setAttribute('property', name);
    else m.setAttribute('name', name);
    m.setAttribute('content', content);
    add(m);
  }

  function link(rel, href, extra = {}) {
    if (!href) return;
    const l = document.createElement('link');
    l.rel = rel; l.href = href;
    Object.entries(extra).forEach(([k, v]) => { if (v !== undefined) l.setAttribute(k, v === "" ? "" : v); });
    add(l);
  }

  function scriptJsonLD(obj) {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(obj);
    add(s);
  }

  function pageIdFromPath(path) {
    const p = path.toLowerCase();
    if (p.endsWith('/') || p.endsWith('/index.html')) return 'home';
    if (p.endsWith('/features.html')) return 'features';
    if (p.endsWith('/download.html')) return 'download';
    if (p.endsWith('/pricing.html'))  return 'pricing';
    if (p.endsWith('/about.html'))    return 'about';
    if (p.endsWith('/support.html'))  return 'support';
    if (p.endsWith('/news.html'))     return 'news';
    if (p.endsWith('/donate.html'))   return 'donate';
    // fallback
    return 'home';
  }

  async function boot() {
    let conf;
    try {
      const res = await fetch(CONFIG_URL, { cache: 'no-cache' });
      conf = await res.json();
    } catch (e) {
      console.warn('[seo] load config failed:', e);
      return;
    }

    const site = conf.site || {};
    const pid  = pageIdFromPath(location.pathname);
    const page = (conf.pages && conf.pages[pid]) || {};

    // 清理舊 SEO
    removeOld('meta[name="description"], link[rel="canonical"], meta[property^="og:"], meta[property^="twitter:"], meta[name="robots"], meta[name="google-site-verification"], meta[name="msvalidate.01"], meta[name="yandex-verification"], link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"], link[rel="preconnect"], script[type="application/ld+json"]');

    // Title（可用 i18n 覆蓋）
    const i18nTitleKey = `meta.title.${pid}`;
    const i18nTitle = window.I18N?.t(i18nTitleKey);
    const title = (typeof i18nTitle === 'string' && i18nTitle) || page.title || document.title || site.name;
    document.title = title;

    // Description（無 i18n 就用 config）
    const description = page.description || 'KeySearch — fast, local-first search across your work.';

    // Canonical
    const canonicalUrl = new URL(page.canonical || '/', site.baseUrl).toString();
    link('canonical', canonicalUrl);

    // 站台共用 <link>
    (site.links || []).forEach(l => link(l.rel, l.href, {
      sizes: l.sizes, type: l.type, crossorigin: l.crossorigin
    }));

    // 站台共用 metaExtra
    (site.metaExtra || []).forEach(m => meta(m.name, m.content));

    // 基礎 Meta
    meta('description', description);
    meta('theme-color', '#0d0d0d');

    // Open Graph
    const ogType  = page.type || 'website';
    const ogImage = new URL(page.image || site.socialImage || '/assets/social/og-default.png', site.baseUrl).toString();
    meta('og:type',        ogType);
    meta('og:site_name',   site.name || 'KeySearch');
    meta('og:title',       title);
    meta('og:description', description);
    meta('og:url',         canonicalUrl);
    meta('og:image',       ogImage);

    // Twitter
    meta('twitter:card',        'summary_large_image');
    if (site.twitter) meta('twitter:site', site.twitter);
    meta('twitter:title',       title);
    meta('twitter:description', description);
    meta('twitter:image',       ogImage);

    // JSON-LD：site 全域 + page 自訂（支援陣列）
    const siteJson = site.jsonld || [];
    const pageJson = page.jsonld || [];
    const packs = Array.isArray(siteJson) ? siteJson : [siteJson];
    packs.concat(Array.isArray(pageJson) ? pageJson : [pageJson]).forEach(scriptJsonLD);

    console.info('[seo] applied:', pid, { title, canonicalUrl });
  }

  // 等 lang.js 設好 title 再跑，降低「先英文再切換」的閃爍
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();