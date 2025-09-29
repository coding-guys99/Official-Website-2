// js/policy.js — legal pages loader (privacy/terms) with i18n + GH Pages path fix
(function () {
  const $ = s => document.querySelector(s);
  const FALLBACK = 'en';

  function norm(code){ return (code || FALLBACK).toLowerCase().replace('-', '_'); }
  function getType(){
    const s = document.currentScript;
    return (s?.dataset.type || 'privacy').trim().toLowerCase(); // 'privacy' or 'terms'
  }

  async function fetchText(url){ const r = await fetch(url, {cache:'no-cache'}); if(!r.ok) throw new Error(r.status+' '+url); return r.text(); }
  async function fetchJSON(url){ const r = await fetch(url, {cache:'no-cache'}); if(!r.ok) throw new Error(r.status+' '+url); return r.json(); }

  function candidatesFor(lang){
    const L = norm(lang);
    const arr = [L, L.replace('_','-')];
    if (L !== 'en') arr.push('en');
    return [...new Set(arr)];
  }

  function setText(el, s){ if (el) el.textContent = s ?? ''; }
  function setHTML(el, h){ if (el) el.innerHTML  = h ?? ''; }

  async function render(){
    const type = getType(); // 'privacy' or 'terms'
    const base = `content/legal/${type}/`;

    // 1) meta
    let meta = {};
    try {
      meta = await fetchJSON(`${base}meta.json`);
    } catch (e) {
      console.error(`[${type}] meta.json missing`, e);
      setHTML($('#docBody'), '<p>Not found.</p>');
      return;
    }

    setText($('#docTitle'), meta.title || (type === 'privacy' ? 'Privacy Policy' : 'Terms'));
    if (meta.date){
      $('#docDate')?.setAttribute('datetime', meta.date);
      setText($('#docDate'), meta.dateText || meta.date);
    } else {
      setText($('#docDate'), '');
    }
    const mins = Number(meta.readingMinutes) || 0;
    setText($('#docRead'), mins ? String(mins) : '');

    // cover（去掉開頭的 "/"，避免 GH Pages 子路徑 404）
    const coverWrap = $('#docCover');
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

    // 2) content
    const cur = norm(window.I18N?.lang || FALLBACK);
    let md = '';
    let used = '';
    for (const l of candidatesFor(cur)){
      try{
        md = await fetchText(`${base}${l}.md`);
        used = l;
        break;
      }catch{}
    }
    if (!md){
      setHTML($('#docBody'), '<p>Content not available.</p>');
      return;
    }

    const html = (window.marked ? window.marked.parse(md, { mangle:false, headerIds:true }) : md);
    setHTML($('#docBody'), html);
    console.info(`[${type}] loaded`, { usedLang: used, meta });
  }

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('i18n:changed', render);
})();