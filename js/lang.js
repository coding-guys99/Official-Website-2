// ===== Language dropdown (desktop + mobile) — robust single binder =====
(function(){
  const CONFIGS = [
    { btn:'#langBtn',       menu:'#langMenu',       cur:'#langCurrent' },
    { btn:'#langBtnMobile', menu:'#langMenuMobile', cur:'#langCurrentMobile' }
  ];
  const SUPPORTED = [
    ['en','English'], ['zh-tw','繁體中文'], ['zh-cn','简体中文'],
    ['ja','日本語'], ['ko','한국어'], ['fr','Français'], ['de','Deutsch']
  ];

  // 綁定一次；若 DOM 尚未就緒，會稍後再試
  let tries = 0;
  function bindOnce(){
    let boundAny = false;

    CONFIGS.forEach(({btn,menu,cur})=>{
      const $btn = document.querySelector(btn);
      const $menu = document.querySelector(menu);
      const $cur = document.querySelector(cur);
      if (!$btn || !$menu || !$cur) return;

      // 避免重複綁定
      if ($btn.dataset.langBound === '1') return;

      // 動態建清單（只建一次）
      if (!$menu.dataset.built){
        $menu.innerHTML = SUPPORTED.map(([code,label]) =>
          `<li role="menuitem" data-lang="${code}">${label}</li>`
        ).join('');
        $menu.dataset.built = '1';
      }

      const open  = ()=>{
        $menu.classList.add('open');
        $menu.removeAttribute('aria-hidden');
        $btn.setAttribute('aria-expanded','true');
      };
      const close = ()=>{
        $menu.classList.remove('open');
        $menu.setAttribute('aria-hidden','true');
        $btn.setAttribute('aria-expanded','false');
      };

      // 按鈕切換
      $btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        ($menu.classList.contains('open') ? close : open)();
      });

      // 點選語言
      $menu.addEventListener('click', (e)=>{
        const li = e.target.closest('li[data-lang]');
        if (!li) return;
        $cur.textContent = li.textContent;      // 顯示母語名稱
        // TODO: 在這裡接你的 i18n 切換邏輯，例如 KS_I18N.setLang(li.dataset.lang)
        console.log('Switch language:', li.dataset.lang);
        close();
      });

      // 點外面關閉 / ESC 關閉
      document.addEventListener('click', (e)=>{
        if (!$menu.contains(e.target) && !$btn.contains(e.target)) close();
      });
      document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') close(); });

      // 標記已綁定
      $btn.dataset.langBound = '1';
      boundAny = true;
    });

    // 如果一個都沒綁定（可能 DOM 還沒插入），重試幾次
    if (!boundAny && tries < 20){
      tries++;
      setTimeout(bindOnce, 100);
    }
  }

  // 進入點：確保在 DOM ready 後跑，但也能容忍晚載入的 Header
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindOnce, { once:true });
  }else{
    bindOnce();
  }
})();
