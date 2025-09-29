// js/legal.js — Legal loader (privacy / terms / disclaimer)
(function () {
  const $ = s => document.querySelector(s);

  // 取 slug：從 <body data-legal-slug="privacy|terms|disclaimer">
  function getSlug() {
    return (document.body?.dataset?.legalSlug || '').trim();
  }

  // 目前頁面資料夾（解 GitHub Pages 子路徑問題）
  const PAGE_DIR = new URL('.', location.href).toString();

  // 語言正規化
  function normLang(code){ return (code||'').toLowerCase().replace('-', '_'); }

  // 把語言擴展成候選清單：zh_tw → [zh_tw, zh-tw, zh, en]
  function expandLangs(pref) {
    const out = [];
    const tried = new Set();
    const push = v => { if (v && !tried.has(v)) { tried.add(v); out.push(v); } };

    const nav = navigator.language || '';
    const navNorm = normLang(nav);                // e.g. zh_tw
    const navBase = navNorm.split('_')[0];        // e.g. zh

    const prefNorm = normLang(pref);              // 來自 URL 或 I18N
    const prefBase = prefNorm.split('_')[0];

    // URL ?lang
    push(prefNorm); push(prefNorm.replace('_','-')); push(prefBase);

    // I18N.lang
    const ui = normLang(window.I18N?.lang || '');
    const uiBase = ui.split('_')[0];
    push(ui); push(ui.replace('_','-')); push(uiBase);

    // navigator
    push(navNorm); push(navNorm.replace('_','-')); push(navBase);

    // 最後 fallback en
    push('en');

    return out.filter(Boolean);
  }

  async function loadJSON(url){
    const r = await fetch(url, { cache:'no-cache' });
    if (!r.ok) throw new Error(r.status + ' ' + url);
    return r.json();
  }
  async function loadText(url){
    const r = await fetch(url, { cache:'no-cache' });
    if (!r.ok) throw new Error(r.status + ' ' + url);
    return r.text();
  }

  function setText(sel, txt){ const el = $(sel); if (el) el.textContent = txt || ''; }
  function setHTML(sel, html){ const el = $(sel); if (el) el.innerHTML = html || ''; }

  function escapeHTML(s){ return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

  function showTried(title, urls){
    const host = $('#legalBody') || document.body;
    const box = document.createElement('div');
    box.style.cssText = 'margin:16px 0;padding:12px;border:1px solid #f66;border-radius:8px;background:#2a0f0f;color:#fbb';
    box.innerHTML = `<strong>${title}</strong><br><code style="white-space:pre-wrap">${urls.join('\n')}</code>`;
    host.replaceChildren(box);
  }

  function buildTOC() {
    const wrap = $('#legalTOC');
    const list = $('#legalTOCList');
    if (!wrap || !list) return;
    const hs = document.querySelectorAll('#legalBody h2, #legalBody h3');
    if (!hs.length) return;

    list.innerHTML = '';
    hs.forEach(h => {
      if (!h.id) h.id = h.textContent.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^\w\-]/g,'');
      const a = document.createElement('a');
      a.href = `#${h.id}`;
      a.textContent = h.textContent.trim();
      list.appendChild(a);
    });
    wrap.hidden = false;
  }

  async function render() {
    const slug = getSlug();
    if (!slug) {
      setHTML('#legalBody', '<p>Missing <code>data-legal-slug</code> (privacy/terms/disclaimer).</p>');
      return;
    }

    const base = new URL(`content/legal/${slug}/`, PAGE_DIR).toString();

    // 1) meta.json（可選）
    try {
      const meta = await loadJSON(new URL('meta.json', base));
      if (meta?.title) setText('#legalTitle', meta.title);
    } catch (e) {
      console.warn('[legal] meta.json not found:', e.message);
    }

    // 2) md 內容（多語候選）
    const urlLang = new URL(location.href).searchParams.get('lang') || '';
    const candidates = expandLangs(urlLang);
    const tried = [];
    let md = '';
    let usedLang = '';

    for (const l of candidates) {
      const url = new URL(`${l}.md`, base).toString();
      tried.push(url);
      try {
        md = await loadText(url);
        usedLang = l;
        break;
      } catch { /* next */ }
    }

    if (!md) {
      console.warn('[legal] all candidates failed:', tried);
      showTried('Content not found. Tried:', tried);
      return;
    }

    // 3) 轉 HTML（若無 marked，退回純文字）
    if (window.marked?.parse) {
      setHTML('#legalBody', window.marked.parse(md, { mangle:false, headerIds:true }));
    } else {
      setHTML('#legalBody', `<pre style="white-space:pre-wrap">${escapeHTML(md)}</pre>`);
    }

    buildTOC();
    console.info('[legal] loaded', { slug, usedLang, base });
  }

  document.addEventListener('DOMContentLoaded', render);
  // 語言切換即重載
  document.addEventListener('i18n:changed', render);
})();