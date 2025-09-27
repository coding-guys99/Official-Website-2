// js/blog-index.js — Blog index renderer (i18n-aware)
(function () {
  const $grid  = document.getElementById('blogGrid');
  const $chips = document.getElementById('blogTagChips');
  const $pager = document.getElementById('blogPager');

  // 簡易分頁設定
  const PAGE_SIZE = 8;
  let state = { tag: 'all', page: 1 };

  function getDict() {
    // 直接從 I18N 取目前語言字典
    return I18N.t('blog') || {};
  }

  function uniqueTags(items) {
    const s = new Set();
    items.forEach(it => (it.tags || []).forEach(t => s.add(t)));
    return Array.from(s);
  }

  function buildChips(dict, items) {
    if (!$chips) return;
    const labels = dict.filters || { all: 'All' };
    const tags = uniqueTags(items);
    const allBtn = `<button class="chip ${state.tag === 'all' ? 'active' : ''}" data-tag="all" aria-pressed="${state.tag==='all'}">${labels.all || 'All'}</button>`;
    const tagBtns = tags.map(t =>
      `<button class="chip ${state.tag === t ? 'active' : ''}" data-tag="${t}" aria-pressed="${state.tag===t}">${labels[t] || t}</button>`
    ).join('');
    $chips.innerHTML = allBtn + tagBtns;

    $chips.onclick = (e)=>{
      const btn = e.target.closest('.chip'); if (!btn) return;
      state.tag = btn.dataset.tag || 'all';
      state.page = 1;
      render();
    };
  }

  function cardTemplate(dict, item) {
    // 連到單篇：用 post.html?slug=...；你也可以改成 /blog/<slug>.html
    const href = `post.html?slug=${encodeURIComponent(item.slug)}`;
    const readmore = dict.readmore || 'Read more';
    return `
      <article class="news-card" data-tags="${(item.tags||[]).join(',')}">
        <div class="news-meta">
          ${item.version ? `<span class="badge">${item.version}</span>` : ''}
          ${item.date ? `<time datetime="${item.date}">${item.date}</time>` : ''}
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
    const dict = getDict();
    const items = Array.isArray(dict.items) ? dict.items : [];
    // 篩選
    const list = (state.tag === 'all') ? items : items.filter(it => (it.tags||[]).includes(state.tag));
    // 分頁
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = list.slice(start, start + PAGE_SIZE);

    // 卡片
    $grid.innerHTML = pageItems.map(it => cardTemplate(dict, it)).join('') || `<p style="opacity:.8">No posts yet.</p>`;

    // 篩選籤
    buildChips(dict, items);
    // 分頁
    buildPager(totalPages);
  }

  document.addEventListener('DOMContentLoaded', render);
  // 語言切換時重繪
  document.addEventListener('i18n:changed', render);
})();