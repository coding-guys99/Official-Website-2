// js/blog-index.js — resilient blog index loader
(function () {
  const $grid  = document.getElementById('blogGrid');
  const $chips = document.getElementById('blogTagChips');
  const $pager = document.getElementById('blogPager');

  const PAGE_SIZE = 8;
  let state = { tag: 'all', page: 1, items: [] };

  async function fetchJSON(url) {
    try {
      const r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  async function loadFromContent() {
    return await fetchJSON('content/blog/index.json');
  }

  function loadFromI18N() {
    const dict = window.I18N?.t('blog') || {};
    const items = Array.isArray(dict.items) ? dict.items : [];
    return items.map(it => ({
      slug: it.slug,
      title: it.title,
      excerpt: it.excerpt || '',
      date: it.date || '',
      tags: it.tags || [],
    }));
  }

  function uniqueTags(items) {
    const s = new Set();
    items.forEach(it => (it.tags||[]).forEach(t => s.add(t)));
    return Array.from(s);
  }

  function buildChips(items) {
    if (!$chips) return;
    const labels = (window.I18N?.t('blog.filters') || { all:'All' });
    const tags = uniqueTags(items);
    const html = [
      `<button class="chip ${state.tag==='all'?'active':''}" data-tag="all" aria-pressed="${state.tag==='all'}">${labels.all || 'All'}</button>`,
      ...tags.map(t => `<button class="chip ${state.tag===t?'active':''}" data-tag="${t}" aria-pressed="${state.tag===t}">${labels[t] || t}</button>`)
    ].join('');
    $chips.innerHTML = html;
    $chips.onclick = (e)=>{
      const btn = e.target.closest('.chip'); if (!btn) return;
      state.tag = btn.dataset.tag || 'all';
      state.page = 1;
      render();
    };
  }

  function cardTemplate(item) {
    const readmore = (window.I18N?.t('blog.readmore') || 'Read more');
    const href = `post.html?slug=${encodeURIComponent(item.slug)}`;
    return `
      <article class="news-card" data-tags="${(item.tags||[]).join(',')}">
        <div class="news-meta">
          ${item.date ? `<time datetime="${item.date}">${item.date}</time>` : ''}
        </div>
        <h2>${item.title || ''}</h2>
        ${item.excerpt ? `<p>${item.excerpt}</p>` : ''}
        <div class="actions"><a class="btn secondary" href="${href}">${readmore}</a></div>
      </article>
    `;
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
    const dict = window.I18N?.t('blog') || {};
    const list = (state.tag === 'all')
      ? state.items
      : state.items.filter(it => (it.tags||[]).includes(state.tag));

    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = list.slice(start, start + PAGE_SIZE);

    $grid.innerHTML = pageItems.length
      ? pageItems.map(cardTemplate).join('')
      : `<p style="opacity:.8">${dict.empty || 'No posts yet.'}</p>`;

    buildChips(state.items);
    buildPager(totalPages);
  }

  async function boot() {
    const content = await loadFromContent();
    if (Array.isArray(content) && content.length) {
      state.items = content;
    } else {
      state.items = loadFromI18N();
    }
    render();
  }

  document.addEventListener('DOMContentLoaded', boot);

  document.addEventListener('i18n:changed', ()=>{
    const i18nItems = loadFromI18N();
    const bySlug = new Map(i18nItems.map(i => [i.slug, i]));
    state.items = state.items.map(old => ({ ...old, ...(bySlug.get(old.slug)||{}) }));
    if (!state.items.length) state.items = i18nItems;
    render();
  });
})();
