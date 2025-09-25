(function () {
  const portal    = document.getElementById('langPortal');          // 你現有的節點
  const btnMobile = document.getElementById('langBtnMobile');       // 你現有的按鈕
  const footLink  = document.getElementById('footLangLink');        // footer 的入口（有就綁，沒有略過）
  const curMobile = document.getElementById('langCurrentMobile');   // 目前語言顯示

  if (!portal) return;

  // 你的 HTML 保留原樣：這裡在執行時自動移除 aria-hidden，改用 hidden 控制顯示
  portal.hidden = true;
  portal.removeAttribute('aria-hidden');
  portal.setAttribute('role','menu');
  portal.setAttribute('tabindex','-1');

  // 支援語言（名稱會顯示在選單與行動版按鈕上）
  const SUPPORTED = [
    ['en','English'],
    ['zh_tw','繁體中文'],
    ['zh_cn','简体中文'],
    ['ja','日本語'],
    ['ko','한국어']
  ];

  // 動態建立清單（按鈕）
  if (!portal.dataset.built){
    portal.innerHTML = SUPPORTED.map(([code,label]) =>
      `<button type="button" class="lang-item" role="menuitem" data-lang="${code}">${label}</button>`
    ).join('');
    portal.dataset.built = '1';
  }

  // Backdrop：若你的 app.js 有更完整的 Backdrop，就用它；沒有就用內建簡易版
  const Backdrop = (window.KS_Backdrop) || (() => {
    let el=null, onClose=null;
    const ensure=()=>{ if(el) return el; el=document.createElement('div'); el.className='backdrop'; document.body.appendChild(el); return el; };
    return {
      open(handler){ ensure(); onClose=handler||null; el.classList.add('show'); document.body.classList.add('no-scroll'); el.onclick=()=>onClose?.(); },
      close(){ if(!el) return; el.classList.remove('show'); document.body.classList.remove('no-scroll'); el.onclick=null; onClose=null; }
    };
  })();

  const getCur = ()=> (window.I18N?.lang) || localStorage.getItem('i18n.lang') || 'en';
  const setCurLabel = (lang)=>{
    const label = SUPPORTED.find(([c])=>c===lang)?.[1] || 'English';
    if (curMobile) curMobile.textContent = label;
    portal.querySelectorAll('[aria-current="true"]').forEach(b => b.removeAttribute('aria-current'));
    portal.querySelector(`[data-lang="${lang}"]`)?.setAttribute('aria-current','true');
  };
  setCurLabel(getCur());

  let lastTrigger = null;

  function openMenu(anchor){
    lastTrigger = anchor;
    portal.hidden = false;

    // 貼近觸發鈕定位
    const r = anchor.getBoundingClientRect();
    const W = portal.offsetWidth, H = portal.offsetHeight, M = 12;
    let top  = r.bottom + 8, left = r.left;
    if (left + W + M > innerWidth)  left = Math.max(M, innerWidth - W - M);
    if (top  + H + M > innerHeight) top  = Math.max(M, r.top - H - 8);
    portal.style.position = 'fixed';
    portal.style.top  = Math.min(Math.max(M, top),  innerHeight - H - M) + 'px';
    portal.style.left = Math.min(Math.max(M, left), innerWidth  - W - M) + 'px';

    Backdrop.open(closeMenu);
    lastTrigger.setAttribute('aria-expanded','true');

    (portal.querySelector('.lang-item') || portal).focus();
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDocPointer, true);
  }

  function closeMenu(){
    if (portal.hidden) return;
    portal.hidden = true;
    Backdrop.close();
    lastTrigger?.setAttribute('aria-expanded','false');
    lastTrigger?.focus();
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerdown', onDocPointer, true);
  }

  function onKey(e){
    if (e.key === 'Escape'){ e.preventDefault(); closeMenu(); return; }
    const items = [...portal.querySelectorAll('.lang-item')];
    if (!items.length) return;
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown'){ e.preventDefault(); items[(i+1+items.length)%items.length].focus(); }
    if (e.key === 'ArrowUp'){   e.preventDefault(); items[(i-1+items.length)%items.length].focus(); }
  }
  function onDocPointer(e){
    if (!portal.contains(e.target) && !lastTrigger?.contains(e.target)) closeMenu();
  }

  // 綁定觸發（你現有的 #langBtnMobile 與 footer 鏈結）
  [btnMobile, footLink].forEach(btn=>{
    if (!btn) return;
    btn.setAttribute('aria-haspopup','menu');
    btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click', (e)=>{
      e.preventDefault(); e.stopPropagation();
      portal.hidden ? openMenu(btn) : closeMenu();
    });
  });

  // 點選語言 → 真正切換
  portal.addEventListener('click', async (e)=>{
    const item = e.target.closest('.lang-item[data-lang]');
    if (!item) return;
    const code = item.dataset.lang.toLowerCase().replace('-', '_'); // zh-tw -> zh_tw
    if (window.I18N?.setLang) await I18N.setLang(code);             // 真的切換＆重渲染
    localStorage.setItem('i18n.lang', code);                         // 與核心同步
    setCurLabel(code);
    closeMenu();
  });

  // 其他地方若呼叫了 I18N.setLang，也會同步按鈕顯示
  document.addEventListener('i18n:changed', ev => setCurLabel(ev.detail?.lang || getCur()));

  // 視窗改變關閉，避免定位跑位
  window.addEventListener('resize', ()=>{ if (!portal.hidden) closeMenu(); }, { passive:true });
})();