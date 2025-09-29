// js/docs-index.js — Hybrid source: prefer /content/docs/*/meta.json, fallback to i18n.docs.items
(function () {
  const $grid  = document.getElementById('docsGrid');
  const $chips = document.getElementById('docsTagChips');
  const $pager = document.getElementById('docsPager');
  if (!$grid) return;

  const PAGE_SIZE = 12;
  let state = { tag: 'all', page: 1, items: [], ready: false };

  const getLang = () => (window.I18N?.lang || 'en').toLowerCase().replace('-', '_');
  const joinURL = (base, path) => new URL(path, base).toString();

  async function fetchJSON(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status + ' ' + url);
    return r.json();
  }

  async function loadFromContent() {
    const idx = await fetchJSON('content/docs/index.json'); // { slugs: [...] }
    const slugs = Array.isArray(idx.slugs) ? idx.slugs : [];

    const metas = await Promise.all(slugs.map(async slug => {
      const baseURL = `content/docs/${slug}/`;
      const meta = await fetchJSON(`${baseURL}meta.json`);
      return { slug, baseURL, meta };
    }));

    const lang = getLang();
    return metas.map(({ slug, baseURL, meta }) => {
      const i18 = meta.i18n?.[lang] || meta.i18n?.en || {};
      const title    = i18.title   ?? meta.title   ?? 'Untitled';
      const excerpt  = i18.excerpt ?? meta.excerpt ?? '';
      const date     = meta.date   ?? '';
      const dateText = i18.dateText ?? meta.dateText ?? meta.date ?? '';
      const tags     = Array.isArray(meta.tags) ? meta.tags : [];
      const cover    = meta.cover?.src || '';
      const coverAlt = meta.cover?.alt || '';
      return { source:'content', slug, baseURL, title, excerpt, date, dateText, tags, cover, coverAlt };
    });
  }

  function loadFromI18N() {
    const d = window.I18N?.t('docs') || {};
    const arr = Array.isArray(d.items) ? d.items : [];
    return arr.map(it => ({
      source:'i18n',
      slug: it.slug,
      baseURL:'',
      title: it.title || 'Untitled',
      excerpt: it.excerpt || '',
      date: it.date || '',
      dateText: it.dateText || it.date || '',
      tags: Array.isArray(it.tags) ? it.tags : [],
      cover: it.cover || '',
      coverAlt:''
    }));
  }

  function uniqueTags(items) {
    const s = new Set();
    items.forEach(it => (it.tags || []).forEach(t => s.add(t)));
    return Array.from(s).sort();
  }

  function uiDict() {
    const d = window.I18N?.t('docs') || {};
    return { readmore: d.readmore || 'Read', filters: d.filters || { all:'All' } };
  }

  function cardTemplate(ui, it) {
    const href = `post.html?slug=${encodeURIComponent(it.slug)}&type=docs&lang=${encodeURIComponent(getLang())}`;
    const banner = it.cover
      ? `<div class="news-card-cover"><img src="${it.source==='content' && !/^(https?:)?\//.test(it.cover) ? joinURL(it.baseURL, it.cover) : it.cover}" alt="${it.coverAlt || ''}"></div>`
      : '';
    return `
      <article class="news-card" data-tags="${(it.tags||[]).join(',')}">
        ${banner}
        <div class="news-meta">${it.dateText ? `<time datetime="${it.date}">${it.dateText}</time>` : ''}</div>
        <h2>${it.title}</h2>
        ${it.excerpt ? `<p>${it.excerpt}</p>` : ''}
        <div class="actions"><a class="btn secondary" href="${href}">${ui.readmore}</a></div>
      </article>
    `;
  }

  function buildChips(ui, items) {
    if (!$chips) return;
    const tags = uniqueTags(items);
    const mk = (tag, active) =>
      `<button class="chip ${active?'active':''}" data-tag="${tag}" aria-pressed="${active}">${tag==='all' ? (ui.filters.all||'All') : (ui.filters[tag]||tag)}</button>`;
    $chips.innerHTML = mk('all', state.tag==='all') + tags.map(t => mk(t, state.tag===t)).join('');
    $chips.onclick = (e)=>{
      const b = e.target.closest('.chip'); if (!b) return;
      state.tag = b.dataset.tag || 'all';
      state.page = 1;
      render();
    };
  }

  function buildPager(totalPages) {
    if (!$pager) return;
    if (totalPages <= 1) { $pager.innerHTML = ''; return; }
    let html = '';
    for (let p = 1; p <= totalPages; p++) {
      html += `<button class="page-btn ${p===state.page?'active':''}" data-page="${p}" aria-current="${p===state.page?'page':'false'}">${p}</button>`;
    }
    $pager.innerHTML = html;
    $pager.onclick = (e)=>{
      const b = e.target.closest('.page-btn'); if (!b) return;
      state.page = parseInt(b.dataset.page, 10) || 1;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  function render() {
    if (!state.ready) return;
    const ui = uiDict();

    const sorted = state.items.slice().sort((a,b)=> (b.date||'').localeCompare(a.date||''));
    const list = state.tag==='all' ? sorted : sorted.filter(it => (it.tags||[]).includes(state.tag));

    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = list.slice(start, start + PAGE_SIZE);

    $grid.innerHTML = pageItems.map(it => cardTemplate(ui, it)).join('') || `<p style="opacity:.8">No docs yet.</p>`;
    buildChips(ui, sorted);
    buildPager(totalPages);
  }

  async function boot() {
    try {
      let items = [];
      try {
        items = await loadFromContent();
      } catch (_) {
        items = loadFromI18N();
      }
      state.items = items;
      state.ready = true;
      render();
    } catch (e) {
      console.error('[docs] failed to load', e);
      $grid.innerHTML = `<p style="opacity:.8">Failed to load docs.</p>`;
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('i18n:changed', ()=>{ state.page = 1; boot(); });
})();