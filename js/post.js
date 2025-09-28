// js/post.js — 單篇文章載入器（meta.json + Markdown 內容）
// 檔案結構：/content/blog/<slug>/{meta.json, en.md, zh_tw.md, zh-cn.md, ...}

(function () {
  const $ = s => document.querySelector(s);

  function getParam(name) {
    const u = new URL(location.href);
    return u.searchParams.get(name) || '';
  }

  // 以 I18N 為主，不動 URL（避免刷新循環）
  function currentLang() {
    return (window.I18N?.lang || 'en').toLowerCase().replace('-', '_');
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
  function escapeHTML(s){ return (s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  function buildTOC(root) {
    const hs = root.querySelectorAll('h2, h3');
    if (!hs.length) return null;
    const list = document.createElement('div');
    hs.forEach(h => {
      if (!h.id) {
        h.id = h.textContent.trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w\-]/g, '');
      }
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

    // 讀取 meta.json
    let meta = {};
    try {
      meta = await loadJSON(`${base}meta.json`);
    } catch (e) {
      console.error('[post] meta.json missing', e);
      setHTML($('#postBody'), '<p>Post not found.</p>');
      return;
    }

    // ——套用 meta——
    setText($('#postTitle'), meta.title || 'Untitled');

    if (meta.date) {
      $('#postDate')?.setAttribute('datetime', meta.date);
      setText($('#postDate'), meta.dateText || meta.date);
    }

    // 讀時：顯示「X min read」或「約 X 分鐘」
    if (typeof meta.readingMinutes === 'number') {
      const lang = currentLang();
      const mins = Math.max(1, Math.round(meta.readingMinutes));
      let label = `${mins} min read`;
      if (lang.startsWith('zh')) label = `約 ${mins} 分鐘可讀`;
      if (lang === 'ja') label = `読了目安 ${mins} 分`;
      if (lang === 'ko') label = `읽는 시간 약 ${mins}분`;
      setText($('#postRead'), label);
    } else {
      setText($('#postRead'), ''); // 沒提供就不顯示文字
    }

    if (Array.isArray(meta.tags) && meta.tags.length) {
      $('#postTags').innerHTML = meta.tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join(' ');
    } else {
      $('#postTags').innerHTML = '';
    }

    if (meta.author?.name) {
      const wrap = $('#postAuthor');
      wrap.hidden = false;
      const img = meta.author.avatar ? `<img src="${meta.author.avatar}" alt="${escapeHTML(meta.author.name)}">` : '';
      wrap.innerHTML = `
        ${img}
        <div>
          <div class="name">${escapeHTML(meta.author.name)}</div>
          ${meta.author.role ? `<div class="role">${escapeHTML(meta.author.role)}</div>` : ''}
        </div>
      `;
    } else {
      $('#postAuthor').hidden = true;
      $('#postAuthor').innerHTML = '';
    }

    if (meta.cover?.src) {
      const wrap = $('#postCover'); wrap.hidden = false;
      const img = document.createElement('img');
      img.src = meta.cover.src; img.alt = meta.cover.alt || '';
      wrap.replaceChildren(img);
    } else {
      $('#postCover').hidden = true;
      $('#postCover').innerHTML = '';
    }

    // ——讀取 Markdown（依目前語言）——
    const lang = currentLang();
    const candidates = [
      `${base}${lang}.md`,                 // zh_tw.md / en.md / ...
      `${base}${lang.replace('_','-')}.md`,// zh-tw.md
      `${base}en.md`                       // fallback
    ];

    let md = '';
    for (const url of candidates) {
      try { md = await loadText(url); break; } catch {}
    }

    if (!md) {
      // 備援：meta.html
      if (meta.html) {
        setHTML($('#postBody'), meta.html);
      } else {
        setHTML($('#postBody'), '<p>Content not available in your language.</p>');
      }
      $('#postTOC').hidden = true;
      $('#postTOCList').innerHTML = '';
      console.info('[post] loaded', { slug, usedLang: 'html(meta)', meta });
      return;
    }

    // 轉為 HTML（使用 marked）
    const html = window.marked ? window.marked.parse(md, { mangle:false, headerIds:true }) : md;
    setHTML($('#postBody'), html);

    // 產生 TOC
    const tocList = buildTOC($('#postBody'));
    if (tocList) {
      $('#postTOCList').replaceChildren(tocList);
      $('#postTOC').hidden = false;
    } else {
      $('#postTOC').hidden = true;
      $('#postTOCList').innerHTML = '';
    }

    console.info('[post] loaded', { slug, usedLang: lang, meta });
  }

  // 首次載入
  document.addEventListener('DOMContentLoaded', renderPost);

  // 語言切換時重新載入內容（不改網址）
  document.addEventListener('i18n:changed', () => {
    if (/\/post\.html$/i.test(location.pathname)) {
      renderPost();
    }
  });
})();