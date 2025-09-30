// js/post.js — Single post loader (meta.json + Markdown per language)
(function () {
  const $ = s => document.querySelector(s);

  function getSlug(){
    // 1) ?slug=…
    const u = new URL(location.href);
    let slug = (u.searchParams.get('slug') || '').trim();

    // 2) referrer ?slug=
    if (!slug && document.referrer){
      try {
        const ru = new URL(document.referrer);
        slug = (ru.searchParams.get('slug') || '').trim();
      } catch {}
    }

    // 3) 路徑式 /post/<slug>.html or /blog/<slug>.html
    if (!slug){
      const m = location.pathname.match(/\/(?:post|blog)\/([^/]+)\.html$/i);
      if (m) slug = m[1];
    }
    return slug || '';
  }

  const normLang = c => (c || 'en').toLowerCase().replace('-', '_');

  function langCandidates(){
    const urlLang = normLang(new URL(location.href).searchParams.get('lang'));
    const i18nLang = normLang(window.I18N?.lang);
    const tried = new Set(), out = [];
    [urlLang, i18nLang, 'en'].forEach(l=>{
      if (!l) return; if (tried.has(l)) return;
      tried.add(l); out.push(l);
      const dash = l.replace('_','-'); if(!tried.has(dash)){ tried.add(dash); out.push(dash); }
    });
    return out;
  }

  async function loadJSON(url){ const r=await fetch(url,{cache:'no-cache'}); if(!r.ok) throw new Error(r.status+' '+url); return r.json(); }
  async function loadText(url){ const r=await fetch(url,{cache:'no-cache'}); if(!r.ok) throw new Error(r.status+' '+url); return r.text(); }

  function setText(el, txt){ if (el) el.textContent = txt || ''; }
  function setHTML(el, html){ if (el) el.innerHTML = html || ''; }

  function buildTOC(root){
    const hs = root.querySelectorAll('h2, h3');
    if (!hs.length) return null;
    const list = document.createElement('div');
    hs.forEach(h=>{
      if (!h.id) h.id = h.textContent.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^\w\-]/g,'');
      const a = document.createElement('a');
      a.href = `#${h.id}`; a.textContent = h.textContent.trim();
      list.appendChild(a);
    });
    return list;
  }

  async function renderPost(){
    const slug = getSlug();
    if (!slug){
      setHTML($('#postBody'), '<p>Missing <code>?slug=</code> parameter.</p>');
      console.warn('[post] missing slug');
      return;
    }
    const base = `content/blog/${slug}/`;

    // meta.json
    let meta = {};
    try {
      meta = await loadJSON(`${base}meta.json`);
    } catch (e){
      console.error('[post] meta.json missing', e);
      setHTML($('#postBody'), '<p>Post not found.</p>');
      return;
    }

    // 套 meta
    setText($('#postTitle'), meta.title || 'Untitled');
    if (meta.date) {
      $('#postDate')?.setAttribute('datetime', meta.date);
      setText($('#postDate'), meta.dateText || meta.date);
    }
    if (meta.readingMinutes){
      const label = (window.I18N?.t?.('blog.readTime') || 'Read time');
      setText($('#postRead'), `${label} · ${meta.readingMinutes} min`);
    }
    if (Array.isArray(meta.tags)){
      $('#postTags').innerHTML = meta.tags.map(t => `<span class="tag">${t}</span>`).join(' ');
    }
    if (meta.cover?.src){
      const wrap = $('#postCover'); wrap.hidden = false;
      const img = new Image(); img.src = meta.cover.src; img.alt = meta.cover.alt || '';
      wrap.replaceChildren(img);
    }

    // 讀 Markdown（多語）
    const langs = langCandidates();
    let md = '', usedLang = '';
    for (const l of langs){
      try {
        md = await loadText(`${base}${l}.md`);
        usedLang = l; break;
      } catch {}
    }
    if (!md){
      setHTML($('#postBody'), meta.html || '<p>Content not available.</p>');
      return;
    }

    // 轉 HTML（需在頁面引入 marked.min.js）
    const html = window.marked ? marked.parse(md, { mangle:false, headerIds:true }) : md;
    setHTML($('#postBody'), html);

    // TOC
    const tocList = buildTOC($('#postBody'));
    if (tocList){
      $('#postTOCList').replaceChildren(tocList);
      $('#postTOC').hidden = false;
    }

    console.info('[post] loaded', { slug, usedLang, meta });

    // 確保 URL 保留 lang & slug（語言切換回來時不丟）
    const u = new URL(location.href);
    if (!u.searchParams.get('slug')) u.searchParams.set('slug', slug);
    if (!u.searchParams.get('lang')) u.searchParams.set('lang', normLang(window.I18N?.lang || 'en'));
    history.replaceState(null, '', u.toString());
  }

  // 語言切換：保留 slug 並重渲染
  document.addEventListener('i18n:changed', ev=>{
    const u = new URL(location.href);
    const lang = normLang(ev.detail?.lang || 'en');
    u.searchParams.set('lang', lang);
    const slug = getSlug();
    if (slug) u.searchParams.set('slug', slug);
    history.replaceState(null, '', u.toString());
    renderPost();
  });

  document.addEventListener('DOMContentLoaded', renderPost);
})();
