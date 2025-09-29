// js/legal.js — 共用隱私 / 條款 / 免責聲明頁面渲染器
(function () {
  const $title = document.getElementById('legalTitle');
  const $body  = document.getElementById('legalBody');

  function getSlug() {
    const file = location.pathname.split('/').pop() || '';
    return file.replace(/\.html$/i, '').toLowerCase(); // privacy / terms / disclaimer
  }

  function normLang(code) {
    return (code || 'en').toLowerCase().replace('-', '_');
  }

  async function loadText(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.text();
  }

  async function loadJSON(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  }

  async function render() {
    const slug = getSlug();
    if (!slug) return;

    const base = `content/legal/${slug}/`;

    let meta = {};
    try {
      meta = await loadJSON(`${base}meta.json`);
    } catch (e) {
      console.error(`[legal] meta.json missing for ${slug}`, e);
    }

    if (meta.title) $title.textContent = meta.title;

    // 嘗試用目前語言 + fallback
    const lang = normLang(window.I18N?.lang || 'en');
    const candidates = [lang, 'en'];

    let md = '';
    for (const l of candidates) {
      try {
        md = await loadText(`${base}${l}.md`);
        break;
      } catch (e) {
        console.warn(`[legal] missing ${slug}/${l}.md`);
      }
    }

    if (md) {
      $body.innerHTML = marked.parse(md, { mangle: false, headerIds: true });
    } else {
      $body.innerHTML = `<p style="opacity:.8">Content not available.</p>`;
    }

    console.info('[legal] loaded', { slug, lang });
  }

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('i18n:changed', render);
})();