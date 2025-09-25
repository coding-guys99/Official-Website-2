// ===== Language dropdown (desktop + mobile) — robust & a11y safe =====
(function(){
  const CONFIGS = [
    { btn:'#langBtn',       menu:'#langMenu',       cur:'#langCurrent' },
    { btn:'#langBtnMobile', menu:'#langMenuMobile', cur:'#langCurrentMobile' }
  ];
  const SUPPORTED = [
    ['en','English'], ['zh-tw','繁體中文'], ['zh-cn','简体中文'],
    ['ja','日本語'], ['ko','한국어'], ['fr','Français'], ['de','Deutsch']
  ];

  let tries = 0;
  function bindOnce(){
    let boundAny = false;

    CONFIGS.forEach(({btn,menu,cur})=>{
      const $btn = document.querySelector(btn);
      const $menu = document.querySelector(menu);
      const $cur = document.querySelector(cur);
      if (!$btn || !$menu || !$cur) return;

      if ($btn.dataset.langBound === '1') return;

      // 動態建清單（只建一次）
      if (!$menu.dataset.built){
        $menu.innerHTML = SUPPORTED.map(([code,label]) =>
          `<li role="none"><button type="button" role="menuitem" data-lang="${code}">${label}</button></li>`
        ).join('');
        $menu.dataset.built = '1';
        $menu.hidden = true;        // 一開始就隱藏，取代 aria-hidden
      }

      const open  = ()=>{
        $menu.hidden = false;
        $btn.setAttribute('aria-expanded','true');
        const first = $menu.querySelector('[data-lang]');
        if (first) first.focus();   // 焦點移到第一個選項
      };
      const close = ()=>{
        $menu.hidden = true;
        $btn.setAttribute('aria-expanded','false');
        $btn.focus();               // 焦點還給按鈕
      };

      $btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        ($menu.hidden ? open : close)();
      });

      $menu.addEventListener('click', (e)=>{
        const li = e.target.closest('[data-lang]');
        if (!li) return;
        $cur.textContent = li.textContent;
        console.log('Switch language:', li.dataset.lang);
        // TODO: 呼叫 I18N.setLang(li.dataset.lang);
        close();
      });

      document.addEventListener('click', (e)=>{
        if (!$menu.hidden && !$menu.contains(e.target) && !$btn.contains(e.target)) close();
      });
      document.addEventListener('keydown', (e)=>{
        if (e.key==='Escape' && !$menu.hidden) close();
      });

      $btn.dataset.langBound = '1';
      boundAny = true;
    });

    if (!boundAny && tries < 20){
      tries++;
      setTimeout(bindOnce, 100);
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindOnce, { once:true });
  }else{
    bindOnce();
  }
})();
