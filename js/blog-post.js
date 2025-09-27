// js/blog-post.js — render single post from content/blog/posts/<slug>.<lang>.json
(function(){
  const params = new URLSearchParams(location.search);
  const slug = params.get('slug') || '';
  const lang = (window.I18N?.lang || 'en').toLowerCase();

  const file = `content/blog/posts/${slug}.${lang}.json`;
  const fallback = `content/blog/posts/${slug}.en.json`;

  const elTitle   = document.getElementById('postTitle');
  const elExcerpt = document.getElementById('postExcerpt');
  const elDate    = document.getElementById('postDate');
  const elReading = document.getElementById('postReading');
  const elCover   = document.getElementById('postCover');
  const elContent = document.getElementById('postContent');

  async function load(url){
    const r = await fetch(url, {cache:'no-cache'});
    if(!r.ok) throw new Error(r.status);
    return r.json();
  }

  function renderBlocks(blocks){
    // blocks: [{type:'p'|'h2'|'code'|'quote'|'ul'|'img', value|items|src|alt }]
    const frag = document.createDocumentFragment();
    (blocks||[]).forEach(b=>{
      let node;
      switch(b.type){
        case 'h2': node = document.createElement('h2'); node.textContent = b.value||''; break;
        case 'p':  node = document.createElement('p');  node.textContent = b.value||''; break;
        case 'quote':
          node = document.createElement('blockquote'); node.textContent = b.value||''; break;
        case 'ul':
          node = document.createElement('ul');
          (b.items||[]).forEach(it=>{ const li=document.createElement('li'); li.textContent=it; node.appendChild(li); });
          break;
        case 'code':
          node = document.createElement('pre'); const code = document.createElement('code'); code.textContent = b.value||''; node.appendChild(code); break;
        case 'img':
          node = document.createElement('img'); node.src = b.src; node.alt = b.alt||''; node.loading='lazy'; break;
        case 'html':
          node = document.createElement('div'); node.innerHTML = b.value||''; break;
        default:
          node = document.createElement('p'); node.textContent = b.value||''; break;
      }
      frag.appendChild(node);
    });
    elContent.innerHTML = '';
    elContent.appendChild(frag);
  }

  function applyDynamicSEO(post){
    const url = `${location.origin}${location.pathname}?slug=${encodeURIComponent(slug)}`;
    // 若你的 seo.js 暴露了 window.SEO.applyPost，就用它；否則直接注 meta：
    if (window.SEO?.applyPost) {
      window.SEO.applyPost({
        title: post.title,
        description: post.excerpt || post.desc || '',
        url,
        image: post.cover,
        datePublished: post.dateISO,
        dateModified: post.updatedISO || post.dateISO,
        author: post.author || 'KeySearch'
      });
    } else {
      document.title = `${post.title} — KeySearch`;
      const head = document.head;
      const meta = (name, content) => { if(!content) return; const m=document.createElement('meta'); m.name=name; m.content=content; head.appendChild(m); };
      const prop = (p, content) => { if(!content) return; const m=document.createElement('meta'); m.setAttribute('property', p); m.content=content; head.appendChild(m); };
      meta('description', post.excerpt||post.desc||'');
      prop('og:title', post.title); prop('og:description', post.excerpt||post.desc||''); prop('og:type','article');
      prop('og:url', url); if(post.cover) prop('og:image', post.cover);
      meta('twitter:card','summary_large_image'); meta('twitter:title',post.title); meta('twitter:description', post.excerpt||post.desc||''); if(post.cover) meta('twitter:image', post.cover);
      // JSON-LD Article
      const ld = {
        "@context":"https://schema.org",
        "@type":"Article",
        "headline": post.title,
        "description": post.excerpt||post.desc||'',
        "author": {"@type":"Organization","name":"KeySearch"},
        "datePublished": post.dateISO,
        "dateModified": post.updatedISO || post.dateISO,
        "image": post.cover ? [post.cover] : undefined,
        "mainEntityOfPage": url
      };
      const s = document.createElement('script'); s.type='application/ld+json'; s.textContent=JSON.stringify(ld); head.appendChild(s);
    }
  }

  (async function init(){
    if(!slug){ elTitle.textContent = 'Not found'; return; }
    let post;
    try{ post = await load(file); }catch{ post = await load(fallback); }

    // Render
    elTitle.textContent   = post.title || '';
    elExcerpt.textContent = post.excerpt || post.desc || '';
    elDate.textContent    = post.date || '';
    elDate.dateTime       = post.dateISO || '';
    elReading.textContent = post.readingTime || '';
    if (post.cover){ elCover.src = post.cover; elCover.style.display='block'; }

    renderBlocks(post.blocks);

    // SEO
    applyDynamicSEO(post);

    // i18n re-render可選
    window.I18N?.render?.();
  })();
})();