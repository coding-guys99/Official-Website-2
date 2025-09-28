// js/post.js — 單篇文章載入器（meta.json + Markdown 內容）
// 結構：/content/blog/<slug>/{meta.json, en.md, zh_tw.md, zh-cn.md, ...}

(function () {
  const $ = s => document.querySelector(s);

  function getParam(name) {
    const u = new URL(location.href);
    return u.searchParams.get(name) || '';
  }

  function normLang(code) {
    // 統一為小寫：zh_tw / zh_cn / ja / ko / en
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
      // 同時嘗試 dash 版本（避免檔名差異）
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

  async function boot() {
    const slug = (getParam('slug') || '').trim();
    if (!slug) {
      setHTML($('#postBody'), '<p>Missing <code>?slug=</code> parameter.</p>');
      return;
    }

    // 文章目錄
    // 相對於 post.html： ./content/blog/<slug>/
    const base = `content/blog/${slug}/`;

    // 讀取 meta.json（單語系 metadata）
    let meta = {};
    try {
      meta = await loadJSON(`${base}meta.json`);
    } catch (e) {
      console.error('[post] meta.json missing', e);
      setHTML($('#postBody'), '<p>Post not found.</p>');
      return;
    }

    // 套用 meta 到頁面
    setText($('#postTitle'), meta.title || 'Untitled');
    if (meta.date) {
      $('#postDate').setAttribute('datetime', meta.date);
      setText($('#postDate'), meta.dateText || meta.date);
    }
    if (meta.readingMinutes) setText($('#postRead'), `${meta.readingMinutes} min read`);
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
      } catch { /* try next */ }
    }
    if (!md) {
      // 如果 meta.json 內含 html 欄位，當作備援
      if (meta.html) {
        setHTML($('#postBody'), meta.html);
      } else {
        setHTML($('#postBody'), '<p>Content not available in your language.</p>');
      }
      return;
    }

    // 轉為 HTML
    const html = marked.parse(md, { mangle:false, headerIds:true });
    setHTML($('#postBody'), html);

    // 產生 TOC（依內容 h2/h3）
    const tocWrap = $('#postTOC');
    const tocList = buildTOC($('#postBody'));
    if (tocList) {
      $('#postTOCList').replaceChildren(tocList);
      tocWrap.hidden = false;
    }

    console.info('[post] loaded', { slug, usedLang, meta });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();