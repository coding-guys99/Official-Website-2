// js/post.js — 單篇文章載入器（meta.json + Markdown 內容）
// 結構：/content/blog/<slug>/{meta.json, en.md, zh_tw.md, zh-cn.md, ...}

(function () {
  const $ = s => document.querySelector(s);

  // ===== 工具 =====
  function getParam(name) {
    const u = new URL(location.href);
    return u.searchParams.get(name) || '';
  }
  function normLang(code) {
    // 統一為小寫：zh_tw / zh_cn / ja / ko / en
    return (code || 'en').toLowerCase().replace('-', '_');
  }
  function langCandidates() {
    const urlLang  = normLang(getParam('lang'));
    const i18nLang = normLang(window.I18N?.lang || '');
    const tried = new Set(), arr = [];
    const push = l => { if (l && !tried.has(l)) { tried.add(l); arr.push(l, l.replace('_','-')); } };

    // 依序：URL 指定 → i18n 當前語言 → 英文 → 繁中 → 簡中
    push(urlLang);
    push(i18nLang);
    push('en');
    push('zh_tw');
    push('zh_cn');
    return arr.filter(Boolean);
  }
  // GitHub Pages 子路徑資源修正（/assets/... 自動補上 repo 路徑）
  function fixAssetPath(src) {
    if (!src) return src;
    try { new URL(src); return src; } catch (_) {}
    // 不是完整 URL
    const isGH = location.hostname.endsWith('github.io');
    let basePath = '';
    if (isGH) {
      // 取第一層 repo 子路徑，如 /Official-Website-2
      const parts = location.pathname.split('/').filter(Boolean);
      if (parts.length) basePath = '/' + parts[0];
    }
    if (src.startsWith('/')) return basePath + src;
    return basePath + '/' + src.replace(/^\.?\//,'');
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
      if (!h.id) h.id = h.textContent.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
      const a = document.createElement('a');
      a.href = `#${h.id}`;
      a.textContent = h.textContent.trim();
      list.appendChild(a);
    });
    return list;
  }

  function formatReadMinutes(n){
    const d = window.I18N?.t?.('blog') || {};
    // 支援幾種常見鍵名；沒有就 fallback
    const t = d.readMinutes || d.minRead || '{n} min read';
    return String(t).replace('{n}', n || 1);
  }

  // ===== 狀態 =====
  const state = {
    slug: '',
    base: '',
    meta: null,
    mdCache: new Map(), // lang -> markdown string
    currentLang: ''     // 真正被渲染的語言（候選找到的第一個）
  };

  async function loadMeta() {
    try {
      const meta = await loadJSON(`${state.base}meta.json`);
      state.meta = meta;
      return meta;
    } catch (e) {
      console.error('[post] meta.json missing', e);
      throw e;
    }
  }

  async function pickMarkdown() {
    const langs = langCandidates();
    for (const l of langs) {
      if (state.mdCache.has(l)) {
        return { md: state.mdCache.get(l), usedLang: l };
      }
      try {
        const md = await loadText(`${state.base}${l}.md`);
        state.mdCache.set(l, md);
        return { md, usedLang: l };
      } catch {
        // try next
      }
    }
    // 都沒有：回傳空
    return { md: '', usedLang: '' };
  }

  function applyMetaToPage(meta) {
    setText($('#postTitle'), meta.title || 'Untitled');

    if (meta.date) {
      $('#postDate')?.setAttribute('datetime', meta.date);
      setText($('#postDate'), meta.dateText || meta.date);
    }

    if (meta.readingMinutes) {
      setText($('#postRead'), formatReadMinutes(meta.readingMinutes));
      $('#postRead')?.classList.add('dot');
    } else {
      setText($('#postRead'), '');
      $('#postRead')?.classList.remove('dot');
    }

    if (Array.isArray(meta.tags)) {
      $('#postTags').innerHTML = meta.tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join(' ');
    } else {
      $('#postTags').innerHTML = '';
    }

    if (meta.cover?.src) {
      const wrap = $('#postCover'); wrap.hidden = false;
      const img = document.createElement('img');
      img.src = fixAssetPath(meta.cover.src);
      img.alt = meta.cover.alt || '';
      wrap.replaceChildren(img);
    } else {
      $('#postCover').hidden = true;
      $('#postCover').innerHTML = '';
    }

    // 作者（可選）
    const $author = $('#postAuthor');
    if ($author && meta.author) {
      const name  = meta.author.name || '';
      const role  = meta.author.role || '';
      const link  = meta.author.link || '';
      const avatar= meta.author.avatar ? fixAssetPath(meta.author.avatar) : '';
      const html = `
        ${avatar ? `<img id="postAuthorAvatar" src="${avatar}" alt="${escapeHTML(name)}" width="40" height="40" style="border-radius:999px">` : ''}
        <div class="meta">
          ${name ? `<div class="name">${escapeHTML(name)}</div>` : ''}
          ${role ? `<div class="role">${escapeHTML(role)}</div>` : ''}
        </div>
      `;
      $author.innerHTML = link ? `<a href="${escapeHTML(link)}" target="_blank" rel="noopener">${html}</a>` : html;
      $author.hidden = false;
    } else if ($author) {
      $author.hidden = true;
      $author.innerHTML = '';
    }
  }

  async function renderPost() {
    // 1) 載入/套用 meta
    if (!state.meta) {
      try {
        await loadMeta();
      } catch {
        setHTML($('#postBody'), '<p>Post not found.</p>');
        return;
      }
    }
    applyMetaToPage(state.meta);

    // 2) 取 Markdown（依語言候選），沒有就回退 meta.html
    const { md, usedLang } = await pickMarkdown();
    state.currentLang = usedLang;

    if (!md) {
      if (state.meta.html) {
        setHTML($('#postBody'), state.meta.html);
      } else {
        setHTML($('#postBody'), '<p>Content not available in your language.</p>');
      }
    } else {
      // 轉為 HTML（需要 marked）
      if (typeof marked !== 'undefined' && marked?.parse) {
        const html = marked.parse(md, { mangle:false, headerIds:true });
        setHTML($('#postBody'), html);
      } else {
        // 沒有 marked 就先當純文字
        setHTML($('#postBody'), `<pre>${escapeHTML(md)}</pre>`);
      }
    }

    // 3) 產生 TOC（依內容 h2/h3）
    const tocWrap = $('#postTOC');
    const tocList = buildTOC($('#postBody'));
    if (tocList) {
      $('#postTOCList').replaceChildren(tocList);
      tocWrap.hidden = false;
    } else {
      tocWrap.hidden = true;
      $('#postTOCList').innerHTML = '';
    }

    console.info('[post] loaded', { slug: state.slug, usedLang: usedLang || 'html(meta)', meta: state.meta });
  }

  // ===== 啟動 =====
  async function boot() {
    state.slug = (getParam('slug') || '').trim();
    if (!state.slug) {
      setHTML($('#postBody'), '<p>Missing <code>?slug=</code> parameter.</p>');
      return;
    }
    state.base = `content/blog/${state.slug}/`;

    await renderPost();
  }

  document.addEventListener('DOMContentLoaded', boot);

  // 語言切換時，只重載文章內容（不刷新頁面）
  document.addEventListener('i18n:changed', async () => {
    // 清空目前內容後重載（避免殘影）
    $('#postBody') && setHTML($('#postBody'), '');
    await renderPost();
  });
})();