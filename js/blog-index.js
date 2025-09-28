// js/blog-index.js — Blog index renderer (i18n-aware, with lang in links)
(function () {
  const $grid  = document.getElementById('blogGrid');
  const $chips = document.getElementById('blogTagChips');
  const $pager = document.getElementById('blogPager');

  if (!$grid) return; // 沒有容器就不跑

  const PAGE_SIZE = 8;
  let state = { tag: 'all', page: 1 };

  const getLang = () => (window.I18N?.lang || 'en').toLowerCase().replace('-', '_');
  const getDict = () => (window.I18N?.t?.('blog')) || {};

  function uniqueTags(items) {
    const s = new Set();
    items.forEach(it => (it.tags || []).forEach(t => s.add(t)));
    return Array.from(s);
  }

  function buildChips(dict, items) {
    if (!$chips) return;
    const labels = dict.filters || { all: 'All' };
    const tags = uniqueTags(items);

    const chip = (key, label, active) =>
      `<button class="chip ${active ? 'active' : ''}" data-tag="${key}" aria-pressed="${active}">${label}</button>`;

    const html = [
      chip('all', labels.all || 'All', state.tag === 'all'),
      ...tags.map(t => chip(t, labels[t] || t, state.tag === t))
    ].join('');

    $chips.innerHTML = html;
    $chips.onclick = (e) => {
      const btn = e.target.closest('.chip'); if (!btn) return;
      state.tag = btn.dataset.tag || 'all';
      state.page = 1;
      render();
    };
  }

  function cardTemplate(dict, item) {
    const lang = getLang();
    const href = `post.html?slug=${encodeURIComponent(item.slug)}&lang=${encodeURIComponent(lang)}`;
    const readmore = dict.readmore || 'Read more';

    const dateHTML = item.date
      ? `<time datetime="${item.date}">${item.dateText || item.date}</time>`
      : '';

    return `
      <article class="news-card" data-tags="${(item.tags || []).join(',')}">
        <div class="news-meta">
          ${item.version ? `<span class="badge">${item.version}</span>` : ''}
          ${dateHTML}
        </div>
        <h2>${item.title}</h2>
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
      html += `<button class="page-btn ${p === state.page ? 'active' : ''}" data-page="${p}" aria-current="${p === state.page ? 'page' : 'false'}">${p}</button>`;
    }
    $pager.innerHTML = html;

    $pager.onclick = (e) => {
      const b = e.target.closest('.page-btn'); if (!b) return;
      state.page = parseInt(b.dataset.page, 10) || 1;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  function render() {
    const dict = getDict();
    const items = Array.isArray(dict.items) ? dict.items : [];

    // 篩選
    const list = (state.tag === 'all')
      ? items
      : items.filter(it => (it.tags || []).includes(state.tag));

    // 分頁
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = list.slice(start, start + PAGE_SIZE);

    // 卡片
    $grid.innerHTML =
      pageItems.map(it => cardTemplate(dict, it)).join('') ||
      `<p style="opacity:.8">No posts yet.</p>`;

    // 篩選籤 & 分頁
    buildChips(dict, items);
    buildPager(totalPages);
  }

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('i18n:changed', render);
})();