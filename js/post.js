// js/post.js — robust single post loader (meta.json + Markdown)
// 目錄：/content/blog/<slug>/{meta.json, en.md, zh_tw.md, ...}
(function () {
  const $ = s => document.querySelector(s);

  function getParam(name) {
    const u = new URL(location.href);
    return u.searchParams.get(name) || '';
  }
  function normLang(code) {
    return (code || 'en').toLowerCase().replace('-', '_');
  }
  function langCandidates() {
    const urlLang = normLang(getParam('lang'));
    const i18nLang = normLang(window.I18N?.lang || '');
    const tried = new Set();
    const arr = [];
    [urlLang, i18nLang, 'en'].forEach(l => {
      if (!l) return;
      if (tried.has(l)) return;
      tried.add(l);
      arr.push(l);
      const dash = l.replace('_', '-');
      if (!tried.has(dash)) { tried.add(dash); arr.push(dash); }
    });
    return arr;
  }
  async function loadText(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status + ' ' + url);
    return r.text();
  }
  async function loadJSON(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status + ' ' + url);
    return r.json();
  }
  function setText(el, txt) { if (el) el.textContent = txt || ''; }
  function setHTML(el, html) { if (el) el.innerHTML = html || ''; }
  function escapeHTML(s){ return String(s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  // 1) 強化 slug 解析
  function resolveSlug() {
    // a) query: ?slug= / ?post=
    const byQuery = getParam('slug') || getParam('post');
    if (byQuery) return byQuery.trim();

    // b) path: /post/<slug> 或 /blog/<slug> 或 /content/blog/<slug>/
    const parts = location.pathname.split('/').filter(Boolean);
    // 嘗試抓最後一段（排除 .html）
    let last = parts[parts.length - 1] || '';
    if (last.endsWith('.html')) last = parts[parts.length - 2] || '';
    // 若倒數第二段是 post 或 blog，就取最後一段當 slug
    const prev = (parts[parts.length - 2] || '').toLowerCase();
    if (prev === 'post' || prev === 'blog' || prev === 'posts') {
      if (last) return last;
    }
    // 或 /content/blog/<slug>/
    const i = parts.findIndex(p => p === 'blog');
    if (i >= 0 && parts[i+1]) return parts[i+1];

    // c) data- 屬性：<main data-slug> / <article id="postBody" data-slug>
    const attr = (document.querySelector('main[data-slug]')?.getAttribute('data-slug')
               || document.querySelector('#postBody[data-slug]')?.getAttribute('data-slug') || '').trim();
    if (attr) return attr;

    return '';
  }

  function buildTOC(root) {
    const hs = root.querySelectorAll('h2, h3');
    if (!hs.length) return null;
    const list = document.createElement('div');
    hs.forEach(h => {
      if (!h.id) h.id = h.textContent.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
      const a = document.createElement('a');
      a.href = `#${h.id}`;
      a.textContent = h.textContent.trim();
      list.appendChild(a);
    });
    return list;
  }

  async function renderPost() {
    const slug = (resolveSlug() || '').trim();
    if (!slug) {
      setHTML($('#postBody'), '<p>Missing <code>?slug=</code> parameter, and no fallback slug found.</p>');
      console.error('[post] missing slug — expected post.html?slug=<your-slug>');
      return;
    }

    const base = `content/blog/${slug}/`;

    // meta.json
    let meta = {};
    try {
      meta = await loadJSON(`${base}meta.json`);
    } catch (e) {
      console.error('[post] meta.json missing', e);
      setHTML($('#postBody'), '<p>Post not found.</p>');
      return;
    }

    // 套用 meta
    setText($('#postTitle'), meta.title || 'Untitled');
    if (meta.date) {
      $('#postDate').setAttribute('datetime', meta.date);
      setText($('#postDate'), meta.dateText || meta.date);
    }
    // 讀時：改成可 i18n 的樣式（ex: "6 min read" -> "6 min" + i18n）
    if (meta.readingMinutes) {
      const label = window.I18N?.t?.('blog.minread') || 'min read';
      setText($('#postRead'), `${meta.readingMinutes} ${label}`);
    }
    if (Array.isArray(meta.tags)) {
      $('#postTags').innerHTML = meta.tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join(' ');
    }
    if (meta.cover?.src) {
      const wrap = $('#postCover'); wrap.hidden = false;
      const img = document.createElement('img');
      img.src = meta.cover.src; img.alt = meta.cover.alt || '';
      wrap.replaceChildren(img);
    }

    // 讀取 Markdown（多語內容）
    const langs = langCandidates();
    let md = '';
    let usedLang = '';
    for (const l of langs) {
      try {
        md = await loadText(`${base}${l}.md`);
        usedLang = l;
        break;
      } catch {}
    }
    if (!md) {
      // 如果 meta.json 內含 html 欄位作為備援
      if (meta.html) {
        setHTML($('#postBody'), meta.html);
      } else {
        setHTML($('#postBody'), '<p>Content not available in your language.</p>');
      }
      return;
    }

    // Markdown -> HTML（需要先在頁面引入 marked.min.js）
    const html = (window.marked?.parse)
      ? window.marked.parse(md, { mangle:false, headerIds:true })
      : md.replace(/</g,'&lt;'); // 保底（無 marked 時）
    setHTML($('#postBody'), html);

    // TOC
    const tocWrap = $('#postTOC');
    const tocList = buildTOC($('#postBody'));
    if (tocList) {
      $('#postTOCList').replaceChildren(tocList);
      tocWrap.hidden = false;
    }

    console.info('[post] loaded', { slug, usedLang, meta });
  }

  document.addEventListener('DOMContentLoaded', renderPost);
  // 語言切換時重繪（不重算 slug）
  document.addEventListener('i18n:changed', renderPost);
})();
