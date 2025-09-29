// js/post.js — 單篇文章載入器（支援多語切換）
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
  function escapeHTML(s){ return s.replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

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
    const slug = (getParam('slug') || '').trim();
    if (!slug) {
      setHTML($('#postBody'), '<p>Missing <code>?slug=</code> parameter.</p>');
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

    // meta
    setText($('#postTitle'), meta.title || 'Untitled');
    if (meta.date) {
      $('#postDate').setAttribute('datetime', meta.date);
      setText($('#postDate'), meta.dateText || meta.date);
    }
    if (meta.readingMinutes) setText($('#postRead'), `${meta.readingMinutes} min read`);
    if (meta.author) setText($('#postAuthor'), meta.author);

    if (Array.isArray(meta.tags)) {
      $('#postTags').innerHTML = meta.tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join(' ');
    }
    if (meta.cover?.src) {
      const wrap = $('#postCover'); wrap.hidden = false;
      const img = document.createElement('img');
      img.src = meta.cover.src; img.alt = meta.cover.alt || '';
      wrap.replaceChildren(img);
    }

    // markdown
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
      if (meta.html) {
        setHTML($('#postBody'), meta.html);
      } else {
        setHTML($('#postBody'), '<p>Content not available in your language.</p>');
      }
      return;
    }

    const html = marked.parse(md, { mangle:false, headerIds:true });
    setHTML($('#postBody'), html);

    // TOC
    const tocWrap = $('#postTOC');
    const tocList = buildTOC($('#postBody'));
    if (tocList) {
      $('#postTOCList').replaceChildren(tocList);
      tocWrap.hidden = false;
    } else {
      tocWrap.hidden = true;
    }

    console.info('[post] loaded', { slug, usedLang, meta });
  }

  // 啟動 & 語言切換
  document.addEventListener('DOMContentLoaded', renderPost);
  document.addEventListener('i18n:changed', renderPost);
})();