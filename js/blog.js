// js/blog.js — render blog list from content/blog/<lang>.posts.json
(function(){
  const lang = (window.I18N?.lang || 'en').toLowerCase();
  const langFile = `content/blog/${lang}.posts.json`;
  const fallbackFile = `content/blog/en.posts.json`;
  const grid = document.getElementById('blogGrid');
  const chipsWrap = document.getElementById('blogTagChips');
  const pager = document.getElementById('blogPager');

  const PAGE_SIZE = 6;
  let all = [];
  let filtered = [];
  let curTag = 'all';
  let page = 1;

  async function load(url){
    const r = await fetch(url, {cache:'no-cache'});
    if(!r.ok) throw new Error(r.status);
    return r.json();
  }

  function uniqTags(items){
    const set = new Set();
    items.forEach(p => (p.tags||[]).forEach(t => set.add(t)));
    return Array.from(set);
  }

  function buildChips(tags){
    const allBtn = `<button class="chip${curTag==='all'?' active':''}" data-tag="all" aria-pressed="${curTag==='all'}" data-i18n="blog.filter.all">All</button>`;
    const tagBtns = tags.map(t=>`<button class="chip${curTag===t?' active':''}" data-tag="${t}" aria-pressed="${curTag===t}">${t}</button>`).join('');
    chipsWrap.innerHTML = allBtn + tagBtns;
    chipsWrap.onclick = e=>{
      const btn = e.target.closest('.chip'); if(!btn) return;
      curTag = btn.dataset.tag;
      chipsWrap.querySelectorAll('.chip').forEach(b=>b.classList.toggle('active', b===btn));
      page = 1;
      applyFilter();
      render();
    };
    // i18n render (若使用 data-i18n)
    window.I18N?.render?.();
  }

  function applyFilter(){
    filtered = curTag==='all' ? all : all.filter(p => (p.tags||[]).includes(curTag));
  }

  function paginate(items, page, size){
    const start = (page-1)*size;
    return items.slice(start, start+size);
  }

  function renderPager(){
    const total = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if(total<=1){ pager.innerHTML=''; return; }
    let html = '';
    html += `<button class="chip" ${page<=1?'disabled':''} data-act="prev">‹</button>`;
    for(let i=1;i<=total;i++){
      html += `<button class="chip ${i===page?'active':''}" data-page="${i}">${i}</button>`;
    }
    html += `<button class="chip" ${page>=total?'disabled':''} data-act="next">›</button>`;
    pager.innerHTML = html;
    pager.onclick = e=>{
      const b = e.target.closest('button'); if(!b) return;
      if(b.dataset.page){ page = +b.dataset.page; }
      if(b.dataset.act==='prev' && page>1) page--;
      if(b.dataset.act==='next' && page<total) page++;
      render();
    };
  }

  function card(p){
    const cover = p.cover ? `<img class="news-cover" src="${p.cover}" alt="" loading="lazy"/>` : '';
    const bullets = (p.bullets||[]).slice(0,3).map(x=>`<li>${x}</li>`).join('');
    return `
      <article class="news-card" data-tags="${(p.tags||[]).join(',')}">
        <div class="news-meta">
          ${p.version?`<span class="badge">${p.version}</span>`:''}
          <time datetime="${p.dateISO||''}">${p.date||''}</time>
        </div>
        ${cover}
        <h2>${p.title}</h2>
        <p>${p.excerpt||p.desc||''}</p>
        ${bullets?`<ul class="news-list">${bullets}</ul>`:''}
        <div class="actions">
          <a class="btn" href="blog-post.html?slug=${encodeURIComponent(p.slug)}" data-i18n="blog.read">Read more</a>
        </div>
      </article>
    `;
  }

  function render(){
    const pageItems = paginate(filtered, page, PAGE_SIZE);
    grid.innerHTML = pageItems.map(card).join('');
    renderPager();
    window.I18N?.render?.();
  }

  (async function init(){
    try{
      all = await load(langFile);
    }catch{
      all = await load(fallbackFile);
    }
    // 正序/倒序：以日期新到舊
    all.sort((a,b)=>(b.dateISO||'').localeCompare(a.dateISO||''));
    buildChips(uniqTags(all));
    applyFilter();
    render();
  })();
})();