// js/post.js — load meta.json + <lang>.md, render post (Plan B)
// 要求 URL: post.html?slug=<folder-name>

(function(){
  // ===== Utils =====
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const getParam = (k) => new URL(location.href).searchParams.get(k);

  // 取得目前語言（配合你的 lang.js）
  function getLangCode(){
    const fromI18N = (window.I18N?.lang || document.documentElement.lang || 'en').toLowerCase();
    // 常見別名/破折號對齊
    if (fromI18N === 'zh-tw' || fromI18N === 'zh_hant') return 'zh_tw';
    if (fromI18N === 'zh-cn' || fromI18N === 'zh_hans') return 'zh_cn';
    return fromI18N.replace('-', '_');
  }

  // 路徑拼接（相對於當前頁面；支援 GHPages 子目錄）
  function urlJoin(...parts){
    return parts.join('/').replace(/\/{2,}/g, '/');
  }

  async function loadJSON(url){
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`JSON ${r.status} ${url}`);
    return r.json();
  }
  async function loadText(url){
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`TEXT ${r.status} ${url}`);
    return r.text();
  }

  // 小型 Markdown 轉 HTML（支援：#..######、段落、* / - 清單、``` 區塊、**粗** / *斜*、[連結](url)）
  function mdToHtml(md){
    // 標準化換行
    md = md.replace(/\r\n?/g, '\n').trim();

    // 先處理 ```code``` 區塊
    const codeBlocks = [];
    md = md.replace(/```([\s\S]*?)```/g, (_, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push(code);
      return `\uE000CODE${idx}\uE000`;
    });

    const lines = md.split('\n');
    const out = [];
    let inList = false, listType = null;

    function closeList(){
      if (inList){
        out.push(listType === 'ol' ? '</ol>' : '</ul>');
        inList = false; listType = null;
      }
    }

    for (let i = 0; i < lines.length; i++){
      let line = lines[i];

      // 標題
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h){
        closeList();
        const level = h[1].length;
        out.push(`<h${level}>${inline(h[2])}</h${level}>`);
        continue;
      }

      // 清單（- 或 * 或 1. ）
      const ul = line.match(/^\s*[-*]\s+(.*)$/);
      const ol = line.match(/^\s*\d+\.\s+(.*)$/);
      if (ul || ol){
        const type = ol ? 'ol' : 'ul';
        if (!inList || listType !== type){
          closeList();
          inList = true; listType = type;
          out.push(type === 'ol' ? '<ol>' : '<ul>');
        }
        out.push(`<li>${inline((ul||ol)[1])}</li>`);
        continue;
      }else{
        closeList();
      }

      // 空行 → 段落分隔
      if (/^\s*$/.test(line)){
        out.push('');
        continue;
      }

      // 一般段落
      out.push(`<p>${inline(line)}</p>`);
    }
    closeList();

    let html = out.join('\n');

    // 還原 code 區塊
    html = html.replace(/\uE000CODE(\d+)\uE000/g, (_, idx) => {
      const code = escapeHtml(codeBlocks[Number(idx)]);
      return `<pre><code>${code}</code></pre>`;
    });

    return html;

    // inline 標記：**粗體**、*斜體*、[text](url)
    function inline(s){
      s = escapeHtml(s);
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      s = s.replace(/$begin:math:display$([^$end:math:display$]+)\]$begin:math:text$([^)]+)$end:math:text$/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      return s;
    }
    function escapeHtml(s){
      return s
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;');
    }
  }

  // ===== Render =====
  function renderPost(meta, html, lang){
    // 掛點（容錯多 selector）
    const elTitle = qs('#postTitle, [data-post-title]') || qs('h1');
    const elDate  = qs('#postDate, time[datetime], [data-post-date]');
    const elRead  = qs('#postRead, [data-post-read]');
    const elCover = qs('#postCover, .post-cover img, [data-post-cover]');
    const elBody  = qs('#postBody, article, .post-body');

    if (elTitle) elTitle.textContent = meta.title || '';
    if (elDate) {
      if (meta.dateText) elDate.textContent = meta.dateText;
      if (meta.date)     elDate.setAttribute('datetime', meta.date);
    }
    if (elRead && meta.readingMinutes) {
      // 可做多語（這裡先簡單處理）
      const unit = (lang.startsWith('zh') ? '分鐘閱讀' :
                   lang.startsWith('ja') ? '分で読めます' :
                   lang.startsWith('ko') ? '분 소요' : 'min read');
      elRead.textContent = `${meta.readingMinutes} ${unit}`;
    }
    if (elCover && meta.cover?.src) {
      const src = meta.cover.src;
      // 支援以 / 開頭路徑與相對路徑
      elCover.src = src.startsWith('/')
        ? src
        : urlJoin('./', src);
      if (meta.cover.alt) elCover.alt = meta.cover.alt;
    }
    if (elBody) elBody.innerHTML = html || '';

    // 同步 <title> 與 OG/Twitter（若你有 seo.js，也可以不必做）
    if (meta.title) document.title = `${meta.title} — KeySearch`;
  }

  // ===== Boot =====
  async function boot(){
    const slug = (getParam('slug') || '').trim();
    if (!slug){
      console.error('[post] missing ?slug=');
      return;
    }

    // content/blog/<slug>/X
    const base = urlJoin(location.pathname.replace(/\/[^\/]*$/, '/'), 'content/blog/', slug, '/');
    const lang = getLangCode();

    // 1) 讀 meta：優先 meta.<lang>.json → 再用 meta.json
    let meta = null;
    const metaCandidates = [
      urlJoin(base, `meta.${lang}.json`),
      urlJoin(base, 'meta.json')
    ];
    for (const u of metaCandidates){
      try { meta = await loadJSON(u); break; } catch {}
    }
    if (!meta){
      console.error('[post] meta.json not found for slug:', slug);
      return;
    }

    // 2) 讀本文：<lang>.md → zh-tw/zh_tw 互轉 → en.md
    const langVariants = [
      lang,
      lang.replace('_','-'),
      lang.replace('-','_'),
      'en'
    ];

    let md = null, usedLang = null;
    for (const l of langVariants){
      const u = urlJoin(base, `${l}.md`);
      try {
        md = await loadText(u);
        usedLang = l;
        break;
      } catch {}
    }
    if (!md){
      console.error('[post] markdown not found for slug:', slug);
      md = '*Content not available yet.*';
      usedLang = 'en';
    }

    const html = mdToHtml(md);
    renderPost(meta, html, usedLang || lang);
  }

  document.addEventListener('DOMContentLoaded', boot);
})();