(() => {
  /* ---------- tiny utils ---------- */
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

document.addEventListener('DOMContentLoaded', () => {
  /* ========= Mobile nav toggle (唯一版本) ========= */
  const toggle = document.querySelector('.nav-toggle');
  const nav    = document.getElementById('primaryNav');

  if (toggle && nav){
    const closeNav = () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    };
    toggle.addEventListener('click', (e)=>{
      e.stopPropagation(); // 避免立刻被外層點擊關閉
      const open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    // 點選任一連結關掉
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) closeNav();
    });
    // 點外面關
    document.addEventListener('click', (e)=>{
      if (!nav.contains(e.target) && !toggle.contains(e.target)) closeNav();
    });
    // 視窗放大回桌機，保證關閉
    window.addEventListener('resize', () => {
      if (window.innerWidth > 980) closeNav();
    }, { passive:true });
  }

  /* ========= Language Portal（唯一版本） ========= */
  const SUPPORTED = [
    ['en','English'], ['zh-tw','繁體中文'], ['zh-cn','简体中文'],
    ['ja','日本語'], ['ko','한국어'], ['fr','Français'], ['de','Deutsch']
  ];
  const portal     = document.getElementById('langPortal');
  const btnDesk    = document.getElementById('langBtn');
  const btnMobile  = document.getElementById('langBtnMobile');
  const footLink   = document.getElementById('footLangLink');
  const curDesk    = document.getElementById('langCurrent');
  const curMobile  = document.getElementById('langCurrentMobile');

  let current = localStorage.getItem('ks_lang') || 'en';

  // 建一次清單
  if (!portal.dataset.built){
    portal.innerHTML = SUPPORTED.map(([code,label]) =>
      `<button type="button" role="menuitem" data-lang="${code}">${label}</button>`
    ).join('');
    portal.dataset.built = '1';
  }

  function syncCurrent(){
    const label = SUPPORTED.find(([c])=>c===current)?.[1] || 'English';
    if (curDesk)   curDesk.textContent   = label;
    if (curMobile) curMobile.textContent = label;
    portal.querySelectorAll('[aria-current="true"]').forEach(b=>b.removeAttribute('aria-current'));
    const active = portal.querySelector(`[data-lang="${current}"]`);
    if (active) active.setAttribute('aria-current','true');
  }
  syncCurrent();

  function setLang(code){
    current = code;
    localStorage.setItem('ks_lang', code);
    syncCurrent();
    // TODO: 如果有 i18n：window.KS_I18N?.setLang(code)
    console.log('[i18n] switch to:', code);
  }

  // 開/關 portal
  function openPortal(anchor){
    // 先顯示再量尺寸
    portal.classList.add('open');
    portal.removeAttribute('aria-hidden');

    const r = anchor.getBoundingClientRect();
    const idealTop  = r.bottom + 8;
    const idealLeft = Math.min(
      Math.max(16, r.left),
      window.innerWidth - portal.offsetWidth - 16
    );
    const top  = Math.min(idealTop, window.innerHeight - portal.offsetHeight - 16);
    const left = Math.max(16, idealLeft);

    portal.style.top  = `${top}px`;
    portal.style.left = `${left}px`;

    // 關閉監聽（只掛一次）
    const onDoc = (e) => { if (!portal.contains(e.target)) closePortal(); };
    const onEsc = (e) => { if (e.key === 'Escape') closePortal(); };
    setTimeout(() => {
      document.addEventListener('click', onDoc, { once:true });
      document.addEventListener('keydown', onEsc, { once:true });
    }, 0);
  }
  function closePortal(){
    portal.classList.remove('open');
    portal.setAttribute('aria-hidden','true');
  }

  function bindOpen(el){
    if (!el) return;
    el.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();   // 防止立刻被「點外面關閉」吃掉
      if (portal.classList.contains('open')) {
        closePortal();
      } else {
        openPortal(el);
      }
    });
  }
  bindOpen(btnDesk);
  bindOpen(btnMobile);
  bindOpen(footLink);

  portal.addEventListener('click', (e)=>{
    const b = e.target.closest('button[data-lang]');
    if (!b) return;
    setLang(b.dataset.lang);
    closePortal();
  });
});



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

  




