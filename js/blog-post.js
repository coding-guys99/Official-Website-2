// js/post.js — render single post by slug + current i18n lang
(function () {
  const $title = document.getElementById('postTitle');
  const $date  = document.getElementById('postDate');
  const $read  = document.getElementById('postRead');
  const $tags  = document.getElementById('postTags');
  const $cover = document.getElementById('postCover');
  const $toc   = document.getElementById('postTOC');
  const $tocList = document.getElementById('postTOCList');
  const $body  = document.getElementById('postBody');

  const params = new URLSearchParams(location.search);
  const slug = (params.get('slug') || '').trim();
  if (!slug) {
    $title.textContent = '404 — Post not found';
    return;
  }

  function getLang() {
    // 你的 I18N 會用 zh_tw / en 等
    return (window.I18N?.lang || 'en').toLowerCase();
  }

  // 嘗試多個路徑（相對/絕對），避免部署位置不同
  function candidates(lang) {
    const list = [];
    const base1 = new URL(`../content/blog/${slug}/`, location.href).toString();
    const base2 = new URL(`./content/blog/${slug}/`, location.href).toString();
    const base3 = `/content/blog/${slug}/`;
    [base1, base2, base3].forEach(b=>{
      list.push(`${b}${lang}.json`);
      if (lang.includes('-')) list.push(`${b}${lang.replace('-', '_')}.json`);
      if (lang.includes('_')) list.push(`${b}${lang.replace('_', '-')}.json`);
    });
    return list;
  }

  async function loadJSON(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status + ' ' + url);
    return r.json();
  }

  async function loadPost(lang) {
    const tryList = [...candidates(lang), ...candidates('en')];
    for (const url of tryList) {
      try { return await loadJSON(url); } catch {}
    }
    throw new Error('post json not found for ' + slug);
  }

  function esc(s){ return String(s==null?'':s); }

  function minutesLabel(min) {
    // 用 i18n 的字串（可在 en.json 補 blog.readmin = "min read"）
    const label = window.I18N?.t('blog.readmin') || 'min read';
    return `${min} ${label}`;
  }

  function updateSEO(doc) {
    const title = doc.title ? `${doc.title} — KeySearch` : document.title;
    document.title = title;

    function upsert(selector, create){
      let el = document.head.querySelector(selector);
      if(!el){ el = create(); document.head.appendChild(el); }
      return el;
    }
    function setName(name, content){
      if (!content) return;
      const el = upsert(`meta[name="${CSS.escape(name)}"]`, ()=> {
        const m = document.createElement('meta'); m.setAttribute('name', name); return m;
      });
      el.setAttribute('content', content);
    }
    function setProp(prop, content){
      if (!content) return;
      const el = upsert(`meta[property="${CSS.escape(prop)}"]`, ()=> {
        const m = document.createElement('meta'); m.setAttribute('property', prop); return m;
      });
      el.setAttribute('content', content);
    }
    function setLink(rel, href){
      if (!href) return;
      const el = upsert(`link[rel="${rel}"]`, ()=> {
        const l = document.createElement('link'); l.setAttribute('rel', rel); return l;
      });
      el.setAttribute('href', href);
    }

    const canonical = `https://keysearch-app.com/post.html?slug=${encodeURIComponent(slug)}`;
    const desc = doc.description || doc.excerpt || '';
    const img  = doc.cover?.src ? new URL(doc.cover.src, location.origin).toString() : undefined;

    setLink('canonical', canonical);
    setProp('og:title', doc.title || '');
    setProp('og:description', desc);
    setProp('og:url', canonical);
    if (img) setProp('og:image', img);

    setName('twitter:title', doc.title || '');
    setName('twitter:description', desc);
    if (img) setName('twitter:image', img);
  }

  function buildTOC() {
    const hs = $body.querySelectorAll('h2, h3');
    if (!hs.length) { $toc.hidden = true; return; }
    let html = '';
    hs.forEach((h, i)=>{
      if (!h.id) h.id = 'h-' + (i+1);
      const ind = h.tagName === 'H3' ? ' style="margin-left:12px; opacity:.9"' : '';
      html += `<a href="#${h.id}"${ind}>${esc(h.textContent)}</a>`;
    });
    $tocList.innerHTML = html;
    $toc.hidden = false;
  }

  function render(doc) {
    // 標題 & meta
    $title.textContent = doc.title || '';
    if (doc.date) {
      $date.textContent = doc.dateText || doc.date;
      $date.setAttribute('datetime', doc.date);
    } else {
      $date.textContent = '';
      $date.removeAttribute('datetime');
    }

    // 閱讀時間
    if (doc.readingMinutes) {
      $read.textContent = minutesLabel(doc.readingMinutes);
      $read.style.display = '';
    } else {
      $read.textContent = '';
      $read.style.display = 'none';
    }

    // 標籤
    $tags.innerHTML = (doc.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');

    // 封面
    if (doc.cover?.src) {
      const alt = esc(doc.cover.alt || doc.title || 'cover');
      const src = doc.cover.src;
      $cover.innerHTML = `<img src="${src}" alt="${alt}" loading="lazy" decoding="async">`;
      $cover.hidden = false;
    } else {
      $cover.hidden = true;
      $cover.innerHTML = '';
    }

    // 內容（兩種模式：html 或 blocks）
    if (doc.html) {
      // 直接信任來源（你掌控檔案）
      $body.innerHTML = doc.html;
    } else if (Array.isArray(doc.blocks)) {
      $body.innerHTML = doc.blocks.map(b=>{
        switch(b.type){
          case 'h2': return `<h2 id="${b.id||''}">${esc(b.text)}</h2>`;
          case 'h3': return `<h3 id="${b.id||''}">${esc(b.text)}</h3>`;
          case 'p':  return `<p>${esc(b.text)}</p>`;
          case 'ul': return `<ul>${(b.items||[]).map(li=>`<li>${esc(li)}</li>`).join('')}</ul>`;
          case 'img':return `<figure><img src="${b.src}" alt="${esc(b.alt||'')}" loading="lazy"><figcaption>${esc(b.caption||'')}</figcaption></figure>`;
          case 'code': return `<pre><code>${esc(b.code)}</code></pre>`;
          default: return '';
        }
      }).join('');
    } else {
      $body.innerHTML = `<p style="opacity:.75">No content.</p>`;
    }

    buildTOC();
    updateSEO(doc);
  }

  async function boot() {
    try {
      const lang = getLang();
      const doc = await loadPost(lang);
      render(doc);
    } catch (e) {
      console.error('[post] load failed', e);
      $title.textContent = '404 — Post not found';
      $body.innerHTML = `<p style="opacity:.75">The article you’re looking for cannot be found.</p>`;
    }
  }

  // 初次載入 & 語言切換時重載
  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('i18n:changed', boot);
})();