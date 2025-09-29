// js/post.js — 單篇文章載入器（meta.json + Markdown）— 去重渲染 + 路徑修正
(function () {
  const $ = s => document.querySelector(s);
  const FALLBACK = 'en';

  const getParam = (k) => new URL(location.href).searchParams.get(k) || '';
  const norm = c => (c || FALLBACK).toLowerCase().replace('-', '_');

  async function fetchText(url){ const r = await fetch(url, {cache:'no-cache'}); if(!r.ok) throw new Error(r.status+' '+url); return r.text(); }
  async function fetchJSON(url){ const r = await fetch(url, {cache:'no-cache'}); if(!r.ok) throw new Error(r.status+' '+url); return r.json(); }

  function candidatesFor(lang){
    const L = norm(lang);
    const arr = [L, L.replace('_','-')];
    if (L !== 'en') arr.push('en');
    // 去重
    return [...new Set(arr)];
  }

  function setText(el, s){ if (el) el.textContent = s ?? ''; }
  function setHTML(el, h){ if (el) el.innerHTML  = h ?? ''; }

  function buildTOC(root){
    const hs = root.querySelectorAll('h2,h3');
    if (!hs.length) return null;
    const list = document.createElement('div');
    hs.forEach(h=>{
      if (!h.id){
        h.id = h.textContent.trim()
          .toLowerCase().replace(/\s+/g,'-').replace(/[^\w\-]/g,'');
      }
      const a = document.createElement('a');
      a.href = '#'+h.id;
      a.textContent = h.textContent.trim();
      list.appendChild(a);
    });
    return list;
  }

  let lastRenderedLang = null;
  let isRendering = false;

  async function renderPost(){
    if (isRendering) return;
    const slug = (getParam('slug') || '').trim();
    if (!slug){ setHTML($('#postBody'), '<p>Missing <code>?slug=</code>.</p>'); return; }

    isRendering = true;
    const base = `content/blog/${slug}/`;

    try {
      // 1) meta
      const meta = await fetchJSON(`${base}meta.json`);

      setText($('#postTitle'), meta.title || 'Untitled');
      if (meta.date){
        $('#postDate')?.setAttribute('datetime', meta.date);
        setText($('#postDate'), meta.dateText || meta.date);
      } else {
        setText($('#postDate'), '');
      }

      // 讀秒（純數字；「min read」字眼交給 i18n 在 HTML 裡）
      const mins = Number(meta.readingMinutes) || 0;
      setText($('#postRead'), mins ? String(mins) : '');

      // tags
      $('#postTags').innerHTML = Array.isArray(meta.tags)
        ? meta.tags.map(t => `<span class="tag">${t}</span>`).join(' ')
        : '';

      // 封面：把開頭的 "/" 拿掉，避免 GH Pages 專案頁 404
      const coverWrap = $('#postCover');
      const coverSrc  = meta.cover?.src ? meta.cover.src.replace(/^\//,'') : '';
      if (coverSrc){
        coverWrap.hidden = false;
        const img = document.createElement('img');
        img.src = coverSrc;
        img.alt = meta.cover.alt || '';
        coverWrap.replaceChildren(img);
      } else {
        coverWrap.hidden = true;
        coverWrap.innerHTML = '';
      }

      // 2) 內容（依語言）
      const currentLang = norm(window.I18N?.lang || getParam('lang') || FALLBACK);
      if (currentLang === lastRenderedLang){
        // 同語言就別再跑一次
        console.debug('[post] skip re-render (same lang):', currentLang);
        isRendering = false;
        return;
      }

      let md = '';
      let usedLang = '';
      for (const l of candidatesFor(currentLang)){
        try {
          md = await fetchText(`${base}${l}.md`);
          usedLang = l;
          break;
        } catch {}
      }

      if (!md && meta.html){
        setHTML($('#postBody'), meta.html);
        usedLang = 'html(meta)';
      } else if (!md){
        setHTML($('#postBody'), '<p>Content not available.</p>');
        usedLang = 'missing';
      } else {
        const html = marked.parse(md, { mangle:false, headerIds:true });
        setHTML($('#postBody'), html);
      }

      // TOC
      const tocList = buildTOC($('#postBody'));
      if (tocList){
        $('#postTOCList').replaceChildren(tocList);
        $('#postTOC').hidden = false;
      } else {
        $('#postTOC').hidden = true;
      }

      lastRenderedLang = currentLang;
      console.info('[post] loaded', { slug, usedLang, meta });
    } catch (e) {
      console.error('[post] failed', e);
      setHTML($('#postBody'), '<p>Post not found.</p>');
    } finally {
      isRendering = false;
    }
  }

  // 首次載入
  document.addEventListener('DOMContentLoaded', renderPost);
  // 語言切換才重渲染（且只在語言真的變更時才跑）
  document.addEventListener('i18n:changed', renderPost);
})();