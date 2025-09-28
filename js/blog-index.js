// js/blog-index.js — Blog index renderer (i18n-aware, overlay current lang on EN master)
(function () {
  const $grid  = document.getElementById('blogGrid');
  const $chips = document.getElementById('blogTagChips');
  const $pager = document.getElementById('blogPager');

  const PAGE_SIZE = 8;
  let state = { tag: 'all', page: 1 };

  function getDict(lang='en') { return I18N.t('blog', I18N.cacheDict?.[lang] || I18N.dict) || {}; }

  // 讀 EN 與目前語言兩份字典：我們在 lang.js 之外再保一份快取引用
  function getENandCurrent() {
    const curLang = I18N.lang || 'en';
    // I18N 沒直接暴露每語言 dict，所以用目前已合併後的 dict 與 fallback 策略：
    const cur = I18N.t('blog') || {};
    // 盡力從 cache 抓 en；抓不到就用目前字典充當
    const en = (I18N.cache?.has?.('en') ? I18N.t('blog', I18N.cache.get('en')._resolved || {}) : null) || {};
    return { en, cur, curLang };
  }

  // 將 cur.items 用 slug 對應覆蓋到 en.items（只覆蓋有提供的欄位）
  function buildItems() {
    const { en, cur } = getENandCurrent();
    const base = Array.isArray(en.items) ? en.items : [];
    const overlay = Array.isArray(cur.items) ? cur.items : [];

    const map = new Map();
    base.forEach(it => map.set(it.slug, { ...it }));

    overlay.forEach(ov => {
      if (!ov || !ov.slug) return;
      const t = map.get(ov.slug) || { slug: ov.slug };
      // 只覆蓋可本地化的欄位；沒提供就保留英文
      if (ov.title)   t.title   = ov.title;
      if (ov.excerpt) t.excerpt = ov.excerpt;
      if (ov.dateText) t.dateText = ov.dateText;
      if (Array.isArray(ov.tags) && ov.tags.length) t.tags = ov.tags;
      if (ov.version) t.version = ov.version;
      if (ov.date)    t.date    = ov.date;
      map.set(ov.slug, t);
    });

    return Array.from(map.values()).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
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
    const href = `post.html?slug=${encodeURIComponent(item.slug)}`;
    const readmore = dict.readmore || 'Read more';
    const dateText = item.dateText || item.date || '';
    return `
      <article class="news-card" data-tags="${(item.tags||[]).join(',')}">
        <div class="news-meta">
          ${item.version ? `<span class="badge">${item.version}</span>` : ''}
          ${dateText ? `<time datetime="${item.date || ''}">${dateText}</time>` : ''}
        </div>
        <h2>${item.title || item.slug}</h2>
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
    const dict = I18N.t('blog') || {};
    const allItems = buildItems(); // EN master + 現語言覆蓋
    const list = (state.tag === 'all') ? allItems : allItems.filter(it => (it.tags||[]).includes(state.tag));

    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = list.slice(start, start + PAGE_SIZE);

    $grid.innerHTML = pageItems.map(it => cardTemplate(dict, it)).join('') || `<p style="opacity:.8">No posts yet.</p>`;
    buildChips(dict, allItems);
    buildPager(totalPages);
  }

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('i18n:changed', render);
})();