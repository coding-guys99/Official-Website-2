// js/blog-index.js — Blog index renderer (multi-lang index.json)
// 需要的結構：/content/blog/index.json  (陣列，每篇含 slug、title{...}、description{...}、date、dateText{...}、tags{...}、cover、author...)

// ---------- tiny utils ----------
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

function curLang() {
  // 優先 URL ?lang= 其次 I18N.lang；最後 en
  const url = new URL(location.href);
  const q   = (url.searchParams.get('lang') || '').toLowerCase().replace('-', '_');
  if (q) return q;
  return (window.I18N?.lang || 'en').toLowerCase().replace('-', '_');
}

function pickLang(v) {
  // 保險版：String 直接回傳；物件依語言鍵取值；退回 en；最後退第一個值
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    const lang = curLang();
    if (v[lang]) return v[lang];
    if (v.en)    return v.en;
    const first = Object.values(v)[0];
    return (typeof first === 'string') ? first : JSON.stringify(first ?? '');
  }
  return String(v);
}

function pickTags(v) {
  // tag 也可能是依語言的物件
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'object') {
    const arr = v[curLang()] || v.en || Object.values(v)[0] || [];
    return Array.isArray(arr) ? arr : [];
  }
  return [];
}

async function fetchJSON(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}

// ---------- rendering helpers ----------
function cardTemplate(dict, item) {
  if (!item || !item.slug) return '';

  // 語言解析
  const title    = pickLang(item.title);
  const excerpt  = pickLang(item.description || item.excerpt);
  const dateISO  = item.date || '';
  const dateText = pickLang(item.dateText) || item.date || '';
  const tags     = pickTags(item.tags);

  // 圖片
  const coverSrc = item.cover?.src || '';
  const coverAlt = pickLang(item.cover?.alt) || '';
  const coverHTML = coverSrc
    ? `<img class="cover" src="${coverSrc}" alt="${coverAlt}" loading="lazy"/>`
    : '';

  const dateHTML = dateISO ? `<time datetime="${dateISO}">${dateText}</time>` : '';
  const href     = `post.html?slug=${encodeURIComponent(item.slug)}&lang=${curLang()}`;
  const readmore = dict?.readmore || 'Read more';

  // 偵錯：確認不會是 [object Object]
  // console.log('[blog] title raw=', item.title, 'resolved=', title);

  return `
    <article class="news-card" data-tags="${tags.join(',')}">
      ${coverHTML}
      <div class="news-meta">${dateHTML}</div>
      <h2>${title}</h2>
      ${excerpt ? `<p>${excerpt}</p>` : ''}
      <div class="actions"><a class="btn secondary" href="${href}">${readmore}</a></div>
    </article>
  `;
}

function uniqueTags(items) {
  const s = new Set();
  items.forEach(it => pickTags(it.tags).forEach(t => s.add(t)));
  return Array.from(s);
}

// ---------- main ----------
(function () {
  const $grid  = document.getElementById('blogGrid');
  const $chips = document.getElementById('blogTagChips');
  const $pager = document.getElementById('blogPager');

  const PAGE_SIZE = 8;
  let RAW = [];                    // 原始陣列
  let state = { tag: 'all', page: 1 };

  function dict() { return window.I18N?.t('blog') || {}; }

  async function load() {
    // 統一走 content/blog/index.json
    const list = await fetchJSON('content/blog/index.json');
    if (!Array.isArray(list)) throw new Error('index.json must be an array');
    // 只保留有 slug 的
    RAW = list.filter(it => it && typeof it.slug === 'string' && it.slug.trim());
  }

  function buildChips(items) {
    if (!$chips) return;
    const labels = dict().filters || { all: 'All' };
    const tags = uniqueTags(items);
    const allBtn = `<button class="chip ${state.tag === 'all' ? 'active' : ''}" data-tag="all" aria-pressed="${state.tag==='all'}">${labels.all || 'All'}</button>`;
    const tagBtns = tags.map(t =>
      `<button class="chip ${state.tag === t ? 'active' : ''}" data-tag="${t}" aria-pressed="${state.tag===t}">${t}</button>`
    ).join('');
    $chips.innerHTML = allBtn + tagBtns;

    $chips.onclick = (e) => {
      const btn = e.target.closest('.chip'); if (!btn) return;
      state.tag = btn.dataset.tag || 'all';
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
    if (!$grid) return;
    const d = dict();

    // 篩選
    const filtered = (state.tag === 'all')
      ? RAW
      : RAW.filter(it => pickTags(it.tags).includes(state.tag));

    // 依日期排序（新到舊）
    filtered.sort((a,b)=> String(b.date||'').localeCompare(String(a.date||'')));

    // 分頁
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    // 卡片
    const html = pageItems.map(it => cardTemplate(d, it)).join('');
    $grid.innerHTML = html || `<p style="opacity:.8">No posts yet.</p>`;

    // Chips / Pager
    buildChips(RAW);
    buildPager(totalPages);
  }

  async function boot() {
    try {
      await load();
      render();
    } catch (e) {
      console.error('[blog] failed to load index.json', e);
      if ($grid) $grid.innerHTML = `<p style="opacity:.8">Failed to load posts.</p>`;
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
  // 語言切換 -> 只重繪（不用重抓 index.json）
  document.addEventListener('i18n:changed', render);
})();