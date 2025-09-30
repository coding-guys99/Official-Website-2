// js/blog-index.js — Blog index (i18n-aware, uses /content/blog/index.json)
(function () {
  const $grid  = document.getElementById('blogGrid');
  const $chips = document.getElementById('blogTagChips');
  const $pager = document.getElementById('blogPager');

  if (!$grid) return;

  const PAGE_SIZE = 8;
  let RAW = [];                // 原始資料（index.json）
  let state = { tag: 'all', page: 1 };

  /* ---------- helpers ---------- */
  const getLang = () => (window.I18N?.lang || 'en').toLowerCase().replace('-', '_');

  // 從多語欄位挑字串：可以是「字串」或「{en, zh_tw, …}」
  function pickL(val, lang = getLang(), fallback = 'en') {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      return val[lang] ?? val[lang.replace('_','-')] ?? val[fallback] ?? '';
    }
    return String(val ?? '');
  }

  function parseDateISO(s) {
    // 安全 parse：回傳 Date 或 null
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function unique(arr) { return Array.from(new Set(arr)); }

  // 產出目前語言版本的 item（展開多語欄位）
  function toLocalizedItem(raw) {
    const lang = getLang();
    return {
      slug: raw.slug,
      title: pickL(raw.title, lang),
      desc:  pickL(raw.description, lang),
      date:  raw.date || '',
      dateText: pickL(raw.dateText, lang) || raw.date || '',
      readingMinutes: raw.readingMinutes ?? '',
      tags: (function(){
        const t = raw.tags;
        // tags 可能是陣列(已本地化字串) 或 多語物件
        if (Array.isArray(t)) return t;
        if (t && typeof t === 'object') return Array.isArray(t[lang]) ? t[lang] : (t.en || []);
        return [];
      })(),
      cover: {
        src: raw.cover?.src || '',
        alt: pickL(raw.cover?.alt || '', lang)
      },
      author: {
        name: raw.author?.name || '',
        role: pickL(raw.author?.role || '', lang),
        avatar: raw.author?.avatar || ''
      },
      _dateObj: parseDateISO(raw.date) // for sort
    };
  }

  function getDict() {
    // 從 i18n 取 blog 節點（拿 labels）
    return (window.I18N?.t?.('blog')) || {};
  }

  function hrefFor(slug) {
    const lang = getLang();
    const url = new URL('post.html', location.href);
    url.searchParams.set('slug', slug);
    url.searchParams.set('lang', lang);
    return url.pathname + url.search;
  }

  /* ---------- rendering ---------- */
  function buildChips(items) {
    if (!$chips) return;
    const dict = getDict();
    const labels = dict.filters || { all: 'All' };

    // 蒐集本地化後的所有 tag（注意：不同語言，同一篇.tags 已換成對應文字）
    const allTags = unique(items.flatMap(it => it.tags || [])).filter(Boolean);

    const chip = (value, text, active) =>
      `<button class="chip ${active?'active':''}" data-tag="${escapeHTML(value)}" aria-pressed="${active?'true':'false'}">${escapeHTML(text)}</button>`;

    let html = chip('all', labels.all || 'All', state.tag === 'all');
    html += allTags.map(t => chip(t, (labels[t] || t), state.tag === t)).join('');
    $chips.innerHTML = html;

    $chips.onclick = (e)=>{
      const btn = e.target.closest('.chip'); if (!btn) return;
      state.tag = btn.dataset.tag || 'all';
      state.page = 1;
      render();
    };
  }

  function cardTemplate(dict, item) {
    const readmore = dict.readmore || 'Read more';
    const date = item.dateText || item.date || '';
    const href = hrefFor(item.slug);
    const tags = (item.tags || []).map(t => `<span class="tag">${escapeHTML(dict.filters?.[t] || t)}</span>`).join(' ');

    return `
      <article class="news-card" data-tags="${escapeHTML((item.tags||[]).join(','))}">
        <div class="news-meta">
          ${date ? `<time datetime="${escapeHTML(item.date)}">${escapeHTML(date)}</time>` : ''}
          ${item.readingMinutes ? `<span class="dot">${escapeHTML(String(item.readingMinutes))} min</span>` : ''}
        </div>
        <h2>${escapeHTML(item.title || 'Untitled')}</h2>
        ${item.desc ? `<p>${escapeHTML(item.desc)}</p>` : ''}
        ${tags ? `<div class="tags">${tags}</div>` : ''}
        <div class="actions"><a class="btn secondary" href="${href}">${escapeHTML(readmore)}</a></div>
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

  function escapeHTML(s){
    return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  function render() {
    const dict = getDict();

    // 本地化投影 & 排序（新→舊）
    const L = RAW.map(toLocalizedItem).sort((a,b)=>{
      if (a._dateObj && b._dateObj) return b._dateObj - a._dateObj;
      return (b.date||'').localeCompare(a.date||'');
    });

    // 篩選
    const list = (state.tag === 'all') ? L : L.filter(it => (it.tags||[]).includes(state.tag));

    // 分頁
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = list.slice(start, start + PAGE_SIZE);

    // 卡片
    $grid.innerHTML = pageItems.map(it => cardTemplate(dict, it)).join('') || `<p style="opacity:.8">No posts yet.</p>`;

    // 篩選籤
    buildChips(L);
    // 分頁
    buildPager(totalPages);
  }

  /* ---------- data load ---------- */
  async function fetchJSON(url) {
    const r = await fetch(url, { cache:'no-cache' });
    if (!r.ok) throw new Error(r.status + ' ' + url);
    return r.json();
  }

  async function loadIndex() {
    // 固定路徑：/content/blog/index.json
    const url = new URL('content/blog/index.json', location.href).toString();
    RAW = await fetchJSON(url);
  }

  async function boot() {
    try {
      await loadIndex();
    } catch (e) {
      console.error('[blog] failed to load index.json', e);
      $grid.innerHTML = `<p style="opacity:.8">Blog index not found.</p>`;
      return;
    }
    render();
  }

  document.addEventListener('DOMContentLoaded', boot);
  // 語言切換時重繪（不重抓）
  document.addEventListener('i18n:changed', ()=>{ state.page = 1; render(); });
})();
