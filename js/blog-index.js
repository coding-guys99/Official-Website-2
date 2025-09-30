// js/blog-index.js — Blog index renderer (uses content/blog/index.json)
(function () {
  const $grid  = document.getElementById('blogGrid');
  const $chips = document.getElementById('blogTagChips');
  const $pager = document.getElementById('blogPager');
  if (!$grid) return;

  const PAGE_SIZE = 12;
  let RAW = [];
  let state = { tag: 'all', page: 1 };
  const lang = () => (window.I18N?.lang || 'en').replace('-', '_');

  async function fetchJSON(url){
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status + ' ' + url);
    return r.json();
  }

  function normalize(raw){
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
    const out = [];
    const skipped = [];

    for (const it of arr){
      if (!it) continue;

      const slug = (it.slug ?? '').toString().trim();
      if (!slug){
        skipped.push({ reason:'missing slug', item: it });
        continue;
      }

      // tags: 允許字串/陣列，其它型別直接忽略
      let tags = [];
      if (Array.isArray(it.tags)) tags = it.tags.map(String);
      else if (typeof it.tags === 'string') tags = [it.tags];

      out.push({
        slug,
        title: (it.title ?? '').toString(),
        excerpt: (it.excerpt ?? '').toString(),
        date: (it.date ?? '').toString(),
        tags,
        cover: it.cover || null
      });
    }

    if (skipped.length){
      console.warn('[blog] skipped items (need valid slug):', skipped);
    }
    return out;
  }

  function uniqueTags(items){
    const s = new Set();
    items.forEach(it => (it.tags || []).forEach(t => s.add(t)));
    return Array.from(s);
  }

  function buildChips(dict, items){
    if (!$chips) return;
    const labels = dict?.filters || { all: 'All' };
    const tags = uniqueTags(items);
    const mk = (val, label) =>
      `<button class="chip ${state.tag===val?'active':''}" data-tag="${val}" aria-pressed="${state.tag===val}">${label}</button>`;
    $chips.innerHTML = mk('all', labels.all || 'All') + tags.map(t => mk(t, labels[t] || t)).join('');
    $chips.onclick = e => {
      const btn = e.target.closest('.chip'); if (!btn) return;
      state.tag = btn.dataset.tag || 'all';
      state.page = 1;
      render();
    };
  }
  
 /* ---- i18n helpers ---- */
function curLang(){
  return (window.I18N?.lang || 'en').toLowerCase().replace('-', '_');
}
function pickLang(v){
  // 將任意型別（字串/數字/陣列/物件）轉成當前語言的字串
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(pickLang).filter(Boolean).join(', ');
  if (typeof v === 'object'){
    const L = curLang();
    // 常見多語鍵優先順序：當前語言 > en > _ > 物件中第一個字串值
    return (
      v[L] || v.en || v._ ||
      Object.values(v).find(x => typeof x === 'string') ||
      ''
    );
  }
  return '';
}
function pickTags(v){
  // v 可能是 ['a','b'] 或 {en:[...], zh_tw:[...]}
  if (Array.isArray(v)) return v.map(pickLang).filter(Boolean);
  if (typeof v === 'object' && v){
    const L = curLang();
    const arr = v[L] || v.en || v._ || Object.values(v).find(x => Array.isArray(x)) || [];
    return (arr || []).map(pickLang).filter(Boolean);
  }
  return [];
}

function cardTemplate(dict, item){
  if (!item || !item.slug) return '';

  const href      = `post.html?slug=${encodeURIComponent(item.slug)}&lang=${curLang()}`;
  const readmore  = dict?.readmore || 'Read more';

  const title     = pickLang(item.title);
  const excerpt   = pickLang(item.description || item.excerpt);
  const dateISO   = item.date || '';
  const dateText  = pickLang(item.dateText) || item.date || '';
  const tags      = pickTags(item.tags);

  // 圖片路徑：建議一律用絕對路徑（以 / 開頭）
  const coverSrc  = item.cover?.src || '';
  const coverAlt  = pickLang(item.cover?.alt) || '';
  const coverHTML = coverSrc ? `<img class="cover" src="${coverSrc}" alt="${coverAlt}" loading="lazy"/>` : '';

  const dateHTML  = dateISO ? `<time datetime="${dateISO}">${dateText}</time>` : '';

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

  function buildPager(totalPages){
    if (!$pager) return;
    if (totalPages <= 1){ $pager.innerHTML = ''; return; }
    let html = '';
    for (let p=1; p<=totalPages; p++){
      html += `<button class="page-btn ${p===state.page?'active':''}" data-page="${p}" aria-current="${p===state.page?'page':'false'}">${p}</button>`;
    }
    $pager.innerHTML = html;
    $pager.onclick = e=>{
      const b = e.target.closest('.page-btn'); if (!b) return;
      state.page = parseInt(b.dataset.page || '1', 10);
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  function render(){
    const dict = window.I18N?.t('blog') || {};
    const items = RAW;

    const list = (state.tag === 'all') ? items : items.filter(it => (it.tags||[]).includes(state.tag));
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = list.slice(start, start + PAGE_SIZE);

    $grid.innerHTML = pageItems.map(it => cardTemplate(dict, it)).join('') || `<p style="opacity:.8">No posts yet.</p>`;
    buildChips(dict, items);
    buildPager(totalPages);
  }

  async function boot(){
    try {
      const raw = await fetchJSON('content/blog/index.json');
      RAW = normalize(raw);
      console.table(RAW); // 方便你快速確認兩篇是否都被讀到
      render();
    } catch (e){
      console.error('[blog] failed to load index.json', e);
      $grid.innerHTML = `<p style="opacity:.8">Failed to load posts.</p>`;
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('i18n:changed', render);
})();