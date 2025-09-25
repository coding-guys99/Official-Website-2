(() => {
  /* ---------- tiny utils ---------- */
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    heroCtaSmoothScroll();
    heroTyping();
    featureImgHover();
    timelineHighlight();
    pricingToggle();
    faqSingleOpen();
    feedbackMailto();
    featureCardPolish();
    newsFilter();
    mobileNav();
    footerAccordion();
    mountLangMenus();
  }

  /* ========== Index: CTA 平滑捲動 ========== */
  function heroCtaSmoothScroll(){
    const btn = $('.hero .btn.primary');
    if (!btn) return;
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      $('.feature')?.scrollIntoView({behavior:'smooth'});
    });
  }

  /* ========== Index: 打字效果（含高度固定） ========== */
  function heroTyping(){
    const titleEl = $('#heroTitle');
    const wrap    = $('#heroTitleWrap');
    if (!titleEl || !wrap || titleEl.dataset.typed === '1') return;
    titleEl.dataset.typed = '1';

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lines  = ['Find it. Fast.', 'No mess. Just answers.'];

    // 固定外層高度，避免欄位抖動
    (function fixHeroHeight(){
      const probe = document.createElement('div');
      const cs = getComputedStyle(titleEl);
      probe.style.cssText = `
        position:absolute; left:-9999px; top:-9999px; visibility:hidden; white-space:normal;
        font:${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily};
        letter-spacing:${cs.letterSpacing}; text-transform:${cs.textTransform};
      `;
      document.body.appendChild(probe);
      const recompute = () => {
        let maxH = 0;
        probe.style.width = wrap.clientWidth + 'px';
        lines.forEach(t => { probe.textContent = t; maxH = Math.max(maxH, probe.offsetHeight); });
        wrap.style.minHeight = (maxH + 4) + 'px';
      };
      recompute();
      let t; window.addEventListener('resize', ()=>{ clearTimeout(t); t=setTimeout(recompute,120); }, {passive:true});
      setTimeout(()=> probe.remove(), 0);
    })();

    // 建立文字與 caret
    const span  = document.createElement('span');
    const caret = document.createElement('span');
    caret.className = 'caret';
    titleEl.textContent = ''; titleEl.append(span, caret);

    if (reduce){ span.textContent = lines[0]; return; }

    const cfg = { type:70, back:45, pauseType:1000, pauseBack:600, loop:true };
    let i=0, dir=1, idx=0, timer=setInterval(step, cfg.type);

    function step(){
      const t = lines[idx];
      i += dir; span.textContent = t.slice(0, i);

      if (dir===1 && i>=t.length){
        clearInterval(timer);
        setTimeout(()=>{ dir=-1; timer=setInterval(step, cfg.back); }, cfg.pauseType);
      }else if (dir===-1 && i<=0){
        clearInterval(timer);
        idx = (idx+1) % lines.length;
        if (cfg.loop){
          setTimeout(()=>{ dir=1; timer=setInterval(step, cfg.type); }, cfg.pauseBack);
        }
      }
    }
  }

  /* ========== Index: Feature 圖片 hover ========== */
  function featureImgHover(){
    $$('.feature-img img').forEach(img=>{
      img.addEventListener('mouseenter', ()=>{
        img.style.transition = 'transform .3s ease';
        img.style.transform  = 'scale(1.03)';
      });
      img.addEventListener('mouseleave', ()=>{ img.style.transform='scale(1)'; });
    });
  }

  /* ========== About: 年代表高亮 ========== */
  function timelineHighlight(){
    const items = $$('.timeline-list li');
    if (!items.length) return;
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); });
    }, {threshold:.3});
    items.forEach(i => io.observe(i));
  }

  /* ========== Pricing: 月/年切換 ========== */
  function pricingToggle(){
    const toggle = $('#billingToggle');
    if (!toggle) return;
    const KEY = 'ks_billing_yearly';

    const apply = (yearly) => {
      $$('.price-card .price').forEach(p=>{
        const monthly = p.getAttribute('data-monthly') || '';
        const yearlyP = p.getAttribute('data-yearly')  || '';
        const span    = p.querySelector('span');
        if (yearly && yearlyP){
          p.firstChild.nodeValue = yearlyP + ' ';
          if (span) span.textContent = '/ month (billed yearly)';
        }else{
          p.firstChild.nodeValue = monthly + ' ';
          if (span) span.textContent = '/ month';
        }
      });
    };

    const saved = localStorage.getItem(KEY) === '1';
    toggle.setAttribute('aria-pressed', saved ? 'true' : 'false');
    apply(saved);

    toggle.addEventListener('click', ()=>{
      const next = toggle.getAttribute('aria-pressed') !== 'true';
      toggle.setAttribute('aria-pressed', String(next));
      localStorage.setItem(KEY, next ? '1':'0');
      apply(next);
    });
  }

  /* ========== Support: FAQ only-one-open ========== */
  function faqSingleOpen(){
    const items = $$('.faq-item');
    if (!items.length) return;
    items.forEach(d=>{
      d.addEventListener('toggle', ()=>{
        if (d.open) items.forEach(o=>{ if(o!==d) o.removeAttribute('open'); });
      });
    });
  }

  /* ========== Support: 送出 → 開 mailto + toast ========== */
  function feedbackMailto(){
    const form  = $('#feedbackForm');
    const toast = $('#toast');
    if (!form) return;

    const showToast = (txt)=>{
      if (!toast) return;
      toast.textContent = txt;
      toast.hidden = false;
      clearTimeout(showToast._t);
      showToast._t = setTimeout(()=> toast.hidden = true, 2500);
    };

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      if (form.website?.value.trim()) return; // 蜜罐

      const name  = form.name?.value.trim();
      const email = form.email?.value.trim();
      const topic = form.topic?.value || 'general';
      const msg   = form.message?.value.trim();
      if (!name || !email || !msg) return showToast('Please fill in your name, email and message.');

      const subject = encodeURIComponent(`KeySearch Support — ${topic}`);
      const body    = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${msg}`);
      window.location.href = `mailto:hello@keysearch-app.com?subject=${subject}&body=${body}`;
      showToast('Opening your email app…');
    });
  }

  /* ========== Features page: 掛一個淡淡的陰影互動 ========== */
  function featureCardPolish(){
    $$('.feature-card').forEach(card=>{
      card.addEventListener('mouseenter', ()=> card.style.boxShadow='0 8px 20px rgba(0,0,0,.4)');
      card.addEventListener('mouseleave', ()=> card.style.boxShadow='none');
    });
  }

  /* ========== News: 年份 chips 篩選 ========== */
  function newsFilter(){
    const group = $('#newsYearChips');
    if (!group) return;
    const cards = $$('.news-card');
    group.addEventListener('click', (e)=>{
      const chip = e.target.closest('.chip'); if (!chip) return;
      $$('.chip', group).forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
      const y = chip.dataset.year;
      cards.forEach(c => c.style.display = (y==='all' || c.dataset.year === y) ? '' : 'none');
    });
  }

  /* ========== Header: 行動選單 ========== */
  function mobileNav(){
    const toggle = $('.nav-toggle');
    const nav    = $('#primaryNav') || $('.nav-links');
    if (!toggle || !nav) return;

    const close = ()=>{
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded','false');
    };
    toggle.addEventListener('click', (e)=>{
      e.stopPropagation();
      const open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', (e)=>{ if (e.target.closest('a')) close(); });
    document.addEventListener('click', (e)=>{ if (!nav.contains(e.target) && !toggle.contains(e.target)) close(); });
    document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') close(); });
    window.addEventListener('resize', ()=>{ if (innerWidth>980) close(); }, {passive:true});
  }

  /* ========== Footer: 手機版收合 ========== */
  function footerAccordion(){
    const mq = matchMedia('(max-width: 768px)');
    const cols = $$('.foot-col');
    if (!cols.length) return;

    function bind(col){
      const btn  = $('.foot-head', col);
      const list = $('.foot-links', col);
      if (!btn || !list || btn._bound) return;
      btn._bound = true;

      const setOpen = (v)=>{
        col.classList.toggle('open', v);
        btn.setAttribute('aria-expanded', String(v));
        list.style.maxHeight = v ? (list.scrollHeight+'px') : '0px';
      };

      if (!col.classList.contains('open')) setOpen(false);

      btn.addEventListener('click', ()=>{
        const next = !col.classList.contains('open');
        // 可選：只開一個
        cols.forEach(c=>{
          if (c!==col && c.classList.contains('open')){
            c.classList.remove('open');
            const b = $('.foot-head', c), l = $('.foot-links', c);
            b?.setAttribute('aria-expanded','false'); if (l) l.style.maxHeight='0px';
          }
        });
        setOpen(next);
      });
    }

    const setup = ()=>{
      if (mq.matches){
        cols.forEach(bind);
      }else{
        cols.forEach(col=>{
          col.classList.remove('open');
          $('.foot-head', col)?.removeAttribute('aria-expanded');
          const l = $('.foot-links', col); if (l) l.style.maxHeight='';
        });
      }
    };
    setup();
    window.addEventListener('resize', ()=> requestAnimationFrame(setup));
  }

  /* ========== 語言選單（桌機 + 手機） ========== */
  function mountLangMenus(){
    const DROPS = [
      { btn:'#langBtn',        menu:'#langMenu',        cur:'#langCurrent' },
      { btn:'#langBtnMobile',  menu:'#langMenuMobile',  cur:'#langCurrentMobile' },
    ];
    const SUPPORTED = [
      ['en','English'], ['zh-tw','繁體中文'], ['zh-cn','简体中文'],
      ['ja','日本語'], ['ko','한국어'], ['fr','Français'], ['de','Deutsch']
    ];

    DROPS.forEach(({btn,menu,cur})=>{
      const $btn = $(btn), $menu=$(menu), $cur=$(cur);
      if (!$btn || !$menu || !$cur) return;

      if (!$menu.dataset.built){
        $menu.innerHTML = SUPPORTED.map(([code,label]) =>
          `<li role="menuitem" data-lang="${code}">${label}</li>`).join('');
        $menu.dataset.built = '1';
      }

      const close = ()=>{
        $menu.classList.remove('open');
        $btn.setAttribute('aria-expanded','false');
        $menu.setAttribute('aria-hidden','true');
      };
      const open = ()=>{
        $menu.classList.add('open');
        $btn.setAttribute('aria-expanded','true');
        $menu.removeAttribute('aria-hidden');
      };

      $btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        $menu.classList.contains('open') ? close() : open();
      });

      $menu.addEventListener('click', (e)=>{
        const li = e.target.closest('li[data-lang]'); if (!li) return;
        $cur.textContent = li.textContent;
        // TODO: 這裡接你的 i18n 切換：setLang(li.dataset.lang)
        console.log('Switch language:', li.dataset.lang);
        close();
      });

      document.addEventListener('click', (e)=>{ if (!$menu.contains(e.target) && !$btn.contains(e.target)) close(); });
      document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') close(); });
    });
  }
})();
