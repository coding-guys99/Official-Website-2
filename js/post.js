// js/post.js — 單篇文章載入器（支援 blog + docs）
// 結構：/content/<section>/<slug>/{meta.json, en.md, zh_tw.md, ...}

(function () {
  const $ = s => document.querySelector(s);

  // ===== URL 參數 =====
  function getParam(name) {
    const u = new URL(location.href);
    return u.searchParams.get(name) || '';
  }

  // ===== 語言工具 =====
  function normLang(code) {
    return (code || 'en').toLowerCase().replace('-', '_'); // ex: zh_tw
  }
  function langCandidates() {
    // 依序嘗試：URL lang → I18N.lang → 瀏覽器 → en
    const urlLang = normLang(getParam('lang'));
    const appLang = normLang(window.I18N?.lang || '');
    const navLang = normLang((navigator.language || 'en').toLowerCase());
    const base = [];
    [urlLang, appLang, navLang, 'en'].forEach(l => {
      if (!l) return;
      base.push(l);
      // 同時加入 dash 變體（避免檔名差異）
      const dash = l.replace('_', '-');
      if (dash !== l) base.push(dash);
      // 再加入語系主碼（ex: zh_tw → zh）
      const root = l.split(/[_-]/)[0];
      if (root && root !== l) base.push(root);
    });
    // 去重
    return Array.from(new Set(base));
  }

  // ===== 輔助 =====
  async function loadText(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.text();
  }
  async function loadJSON(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
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

  function fmtReadMinutes(min) {
    const n = Number(min) || 0;
    // 從 i18n 取字串，沒有就 fallback 到英文
    const dict = (window.I18N?.t('blog') || {});
    const tpl = dict.readmin || '{min} min read';
    return tpl.replace('{min}', n.toString());
  }

  // ===== 主要渲染流程 =====
  let META = null;         // cache meta（避免切語言時重抓）
  let BASE = '';           // content 基底路徑：content/<section>/<slug>/
  let CURRENT_LANG = '';   // 記錄目前顯示的語言（純記錄用）

  async function renderMeta() {
    if (!META) return;

    setText($('#postTitle'), META.title || 'Untitled');

    if (META.date) {
      $('#postDate')?.setAttribute('datetime', META.date);
      setText($('#postDate'), META.dateText || META.date);
    }

    // 讀文時間（用 i18n 模板）
    if (META.readingMinutes != null) {
      setText($('#postRead'), fmtReadMinutes(META.readingMinutes));
      $('#postRead')?.classList.add('dot');
    } else {
      setText($('#postRead'), '');
      $('#postRead')?.classList.remove('dot');
    }

    // tags
    if (Array.isArray(META.tags)) {
      $('#postTags').innerHTML = META.tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join(' ');
    } else {
      $('#postTags').innerHTML = '';
    }

    // cover
    if (META.cover?.src) {
      const wrap = $('#postCover'); wrap.hidden = false;
      const img = document.createElement('img');
      img.src = META.cover.src; img.alt = META.cover.alt || '';
      wrap.replaceChildren(img);
    } else {
      $('#postCover')?.setAttribute('hidden','');
    }

    // 作者（若 post.html 有這些節點就會顯示）
    if (META.author?.name) {
      const $a = $('#postAuthorName');
      if ($a) setText($a, META.author.name);
      const $p = $('#postAuthorPhoto');
      if ($p && META.author.photo) {
        $p.src = META.author.photo;
        $p.alt = META.author.name;
      }
    }
  }

  async function renderBody() {
    // 依目前語言候選清單去抓 .md
    const langs = langCandidates();
    let md = '';
    let used = '';

    for (const l of langs) {
      try {
        md = await loadText(`${BASE}${l}.md`);
        used = l;
        break;
      } catch {
        // try next
      }
    }

    if (!md) {
      // 沒有對應 .md → 若 meta.html 有，當備援；否則提示
      if (META?.html) {
        setHTML($('#postBody'), META.html);
        CURRENT_LANG = 'html(meta)';
      } else {
        setHTML($('#postBody'), '<p style="opacity:.8">Content not available in your language.</p>');
        CURRENT_LANG = 'none';
      }
      $('#postTOC')?.setAttribute('hidden','');
      return;
    }

    // 轉 HTML
    const html = (window.marked ? window.marked.parse(md, { mangle:false, headerIds:true }) : md);
    setHTML($('#postBody'), html);
    CURRENT_LANG = used;

    // 產生 TOC
    const tocList = buildTOC($('#postBody'));
    const wrap = $('#postTOC');
    if (tocList) {
      $('#postTOCList').replaceChildren(tocList);
      wrap.hidden = false;
    } else {
      wrap.hidden = true;
    }
  }

  async function boot(initial = false) {
    const slug = (getParam('slug') || '').trim();
    const section = (getParam('section') || 'blog').trim(); // 預設 blog
    if (!slug) {
      setHTML($('#postBody'), '<p>Missing <code>?slug=</code> parameter.</p>');
      return;
    }

    BASE = `content/${encodeURIComponent(section)}/${encodeURIComponent(slug)}/`;

    // 只在第一次載入時抓 meta（切語言不必重抓）
    if (initial || !META) {
      try {
        META = await loadJSON(`${BASE}meta.json`);
      } catch (e) {
        console.error('[post] meta.json missing', e);
        setHTML($('#postBody'), '<p>Post not found.</p>');
        return;
      }
      await renderMeta();
    }

    await renderBody();
    console.info('[post] loaded', { slug, section, usedLang: CURRENT_LANG, meta: META });
  }

  document.addEventListener('DOMContentLoaded', () => boot(true));

  // 語言切換時，重新渲染「閱讀時間字串 + 內容 Markdown」
  document.addEventListener('i18n:changed', async () => {
    // 重新套用閱讀時間的 i18n
    await renderMeta();
    // 重新抓取對應語言的 md
    await renderBody();
  });
})();