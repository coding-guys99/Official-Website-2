// js/blog-index.js — Blog index (robust to array or {items:[]})
(function () {
  const $grid  = document.getElementById('blogGrid');
  const $chips = document.getElementById('blogTagChips');
  const $pager = document.getElementById('blogPager');
  if (!$grid) return;

  const PAGE_SIZE = 8;
  let RAW = []; // 一律保證為陣列
  let state = { tag: 'all', page: 1 };

  const getLang = () => (window.I18N?.lang || 'en').toLowerCase().replace('-', '_');

  function toArray(x){ if(x==null) return []; if(Array.isArray(x)) return x.filter(Boolean).map(String); if(typeof x==='string') return [x]; return []; }
  function pickL(val, lang=getLang(), fb='en'){
    if (val==null) return '';
    if (typeof val==='string') return val;
    if (typeof val==='object') return val[lang] ?? val[lang.replace('_','-')] ?? val[fb] ?? '';
    return String(val ?? '');
  }
  function parseDateISO(s){ const d=new Date(s); return isNaN(d.getTime())?null:d; }
  const unique = arr => Array.from(new Set(arr));
  const escapeHTML = s => String(s??'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function toLocalizedItem(raw){
    const lang = getLang();
    let tags=[];
    if (Array.isArray(raw.tags)) tags = toArray(raw.tags);
    else if (raw.tags && typeof raw.tags==='object'){
      const v = raw.tags[lang] ?? raw.tags[lang.replace('_','-')] ?? raw.tags.en ?? raw.tags['en-US'];
      tags = toArray(v);
    } else tags = toArray(raw.tags);

    return {
      slug: raw.slug,
      title: pickL(raw.title, lang),
      desc:  pickL(raw.description, lang),
      date:  raw.date || '',
      dateText: pickL(raw.dateText, lang) || raw.date || '',
      readingMinutes: raw.readingMinutes ?? '',
      tags,
      cover: { src: raw.cover?.src || '', alt: pickL(raw.cover?.alt || '', lang) },
      author:{ name: raw.author?.name || '', role: pickL(raw.author?.role || '', lang), avatar: raw.author?.avatar || '' },
      _dateObj: parseDateISO(raw.date)
    };
  }

  function getDict(){ return (window.I18N?.t?.('blog')) || {}; }
  function hrefFor(slug){
    const lang=getLang(); const url=new URL('post.html', location.href);
    url.searchParams.set('slug', slug); url.searchParams.set('lang', lang);
    return url.pathname + url.search;
  }

  function buildChips(items){
    if(!$chips) return;
    const dict = getDict();
    const labels = dict.filters || { all:'All' };
    const allTags = unique(items.flatMap(it => it.tags || [])).filter(Boolean);

    const chip = (v,t,on)=>`<button class="chip ${on?'active':''}" data-tag="${escapeHTML(v)}" aria-pressed="${on?'true':'false'}">${escapeHTML(t)}</button>`;
    let html = chip('all', labels.all || 'All', state.tag==='all');
    html += allTags.map(t => chip(t, (labels[t]||t), state.tag===t)).join('');
    $chips.innerHTML = html;

    $chips.onclick = e=>{
      const btn = e.target.closest('.chip'); if(!btn) return;
      state.tag = btn.dataset.tag || 'all'; state.page=1; render();
    };
  }

  function cardTemplate(dict, item){
    const readmore = dict.readmore || 'Read more';
    const date = item.dateText || item.date || '';
    const tagsArr = toArray(item.tags);
    const tags = tagsArr.map(t=>`<span class="tag">${escapeHTML(dict.filters?.[t] || t)}</span>`).join(' ');
    const dataTags = tagsArr.join(',');

    return `
      <article class="news-card" data-tags="${escapeHTML(dataTags)}">
        <div class="news-meta">
          ${date ? `<time datetime="${escapeHTML(item.date)}">${escapeHTML(date)}</time>` : ''}
          ${item.readingMinutes ? `<span class="dot">${escapeHTML(String(item.readingMinutes))} min</span>` : ''}
        </div>
        <h2>${escapeHTML(item.title || 'Untitled')}</h2>
        ${item.desc ? `<p>${escapeHTML(item.desc)}</p>` : ''}
        ${tags ? `<div class="tags">${tags}</div>` : ''}
        <div class="actions"><a class="btn secondary" href="${hrefFor(item.slug)}">${escapeHTML(readmore)}</a></div>
      </article>
    `;
  }

  function buildPager(totalPages){
    if(!$pager) return;
    if(totalPages<=1){ $pager.innerHTML=''; return; }
    let html=''; for(let p=1;p<=totalPages;p++){
      html+=`<button class="page-btn ${p===state.page?'active':''}" data-page="${p}" aria-current="${p===state.page?'page':'false'}">${p}</button>`;
    }
    $pager.innerHTML=html;
    $pager.onclick=e=>{
      const b=e.target.closest('.page-btn'); if(!b) return;
      state.page=parseInt(b.dataset.page,10)||1; render(); window.scrollTo({top:0,behavior:'smooth'});
    };
  }

  function render(){
    const dict = getDict();
    const L = Array.isArray(RAW) ? RAW.map(toLocalizedItem) : [];
    L.sort((a,b)=> (a._dateObj && b._dateObj) ? (b._dateObj - a._dateObj) : (b.date||'').localeCompare(a.date||''));

    const list = (state.tag==='all') ? L : L.filter(it => (it.tags||[]).includes(state.tag));
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = list.slice(start, start + PAGE_SIZE);

    $grid.innerHTML = pageItems.map(it => cardTemplate(dict, it)).join('') || `<p style="opacity:.8">No posts yet.</p>`;
    buildChips(L);
    buildPager(totalPages);
  }

  async function fetchJSON(url){ const r=await fetch(url,{cache:'no-cache'}); if(!r.ok) throw new Error(r.status+' '+url); return r.json(); }

  async function loadIndex(){
    const url = new URL('content/blog/index.json', location.href).toString();
    const json = await fetchJSON(url);
    // 允許兩種格式： [ ... ] 或 { items:[ ... ] }
    RAW = Array.isArray(json) ? json : (Array.isArray(json.items) ? json.items : []);
  }

  async function boot(){
    try { await loadIndex(); }
    catch(e){ console.error('[blog] failed to load index.json', e); $grid.innerHTML = `<p style="opacity:.8">Blog index not found.</p>`; return; }
    render();
  }

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('i18n:changed', ()=>{ state.page=1; render(); });
})();
