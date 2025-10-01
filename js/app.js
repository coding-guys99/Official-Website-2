// js/app.js — unified (Apple-style footer only)
(() => {
  /* ---------- tiny utils ---------- */
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  /* ---------- Backdrop manager (mobile only) ---------- */
  const Backdrop = (() => {
    let el = null;
    let ref = 0;
    let onClose = null;

    const ensure = () => {
      if (el) return el;
      el = document.createElement('div');
      el.id = 'appBackdrop';
      el.className = 'backdrop';
      document.body.appendChild(el);
      return el;
    };
    const isMobile = () => window.innerWidth <= 980;

    return {
      open(handler){
        if (!isMobile()) return;
        ensure();
        ref++;
        onClose = handler || null;
        el.classList.add('show');
        document.body.classList.add('no-scroll');
        el.onclick = () => onClose?.();
      },
      close(){
        if (!el || !isMobile()) return;
        ref = Math.max(0, ref - 1);
        if (ref === 0){
          el.classList.remove('show');
          document.body.classList.remove('no-scroll');
          el.onclick = null;
          onClose = null;
        }
      },
      force(){
        if (!el) return;
        ref = 0;
        el.classList.remove('show');
        document.body.classList.remove('no-scroll');
        el.onclick = null;
        onClose = null;
      }
    };
  })();

  /* ----------  Boot  ---------- */
  const init = () => {
    mobileNav();
    heroCtaSmooth();
    heroTyping();
    featureImgHover();
    timelineHighlight();
    pricingToggle();
    faqSingleOpen();
    feedbackMailto();
    featureCardPolish();
    newsFilter();
    appleFooterAccordion();    // ← 只有這一套（Apple 風格）
    revealOnScroll();
  };
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }

  /* ========== 1) Mobile nav (single) ========== */
  function mobileNav(){
    const toggle = $('.nav-toggle');
    const nav    = $('#primaryNav') || $('.nav-links');
    if (!toggle || !nav) return;

    const close = ()=>{
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded','false');
      Backdrop.close();
    };
    const open = ()=>{
      nav.classList.add('open');
      toggle.setAttribute('aria-expanded','true');
      Backdrop.open(close);
    };

    toggle.addEventListener('click', (e)=>{
      if (window.innerWidth > 980) return; // 桌機不啟用
      e.stopPropagation();
      nav.classList.contains('open') ? close() : open();
    });

    nav.addEventListener('click', (e)=>{ if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') close(); });
    window.addEventListener('resize', ()=>{ if (window.innerWidth > 980) Backdrop.force(), close(); }, { passive:true });
  }

  /* ========== 2) Index: CTA smooth scroll ========== */
  function heroCtaSmooth(){
    const btn = $('.hero .btn.primary');
    if (!btn) return;
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      $('.feature')?.scrollIntoView({ behavior:'smooth' });
    });
  }

  /* ========== 3) Index: Typing headline ========== */
  function heroTyping(){
    const titleEl = $('#heroTitle');
    const wrap    = $('#heroTitleWrap');
    if (!titleEl || !wrap || titleEl.dataset.typed === '1') return;
    titleEl.dataset.typed = '1';

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lines  = ['Find it. Fast.', 'No mess. Just answers.'];

    (function lockHeight(){
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
      let t; window.addEventListener('resize', ()=>{ clearTimeout(t); t=setTimeout(recompute,120); }, { passive:true });
      setTimeout(()=> probe.remove(), 0);
    })();

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
        if (cfg.loop) setTimeout(()=>{ dir=1; timer=setInterval(step, cfg.type); }, cfg.pauseBack);
      }
    }
  }

  /* ========== 4) Feature images hover ========== */
  function featureImgHover(){
    $$('.feature-img img').forEach(img=>{
      img.addEventListener('mouseenter', ()=>{
        img.style.transition = 'transform .3s ease';
        img.style.transform  = 'scale(1.03)';
      });
      img.addEventListener('mouseleave', ()=>{ img.style.transform='scale(1)'; });
    });
  }

  /* ========== 5) About: timeline highlight ========== */
  function timelineHighlight(){
    const items = $$('.timeline-list li');
    if (!items.length) return;
    const io = new IntersectionObserver(es=>{
      es.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); });
    }, { threshold:.3 });
    items.forEach(i => io.observe(i));
  }

  /* ========== 6) Pricing: billing toggle ========== */
  function pricingToggle(){
    const toggle = $('#billingToggle');
    if (!toggle) return;
    const KEY = 'ks_billing_yearly';

    const apply = (yearly)=>{
      $$('.price-card .price').forEach(p=>{
        const monthly = p.getAttribute('data-monthly') || '';
        const yearlyP = p.getAttribute('data-yearly')  || '';
        const span    = p.querySelector('span');
        if (yearly && yearlyP){
          p.firstChild.nodeValue = yearlyP + ' ';
          if (span) span.textContent = '/ month (billed yearly)';
        } else {
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
      localStorage.setItem(KEY, next ? '1' : '0');
      apply(next);
    });
  }

  /* ========== 7) Support: FAQ one-open ========== */
  function faqSingleOpen(){
    const items = $$('.faq-item');
    if (!items.length) return;
    items.forEach(d=>{
      d.addEventListener('toggle', ()=>{
        if (d.open) items.forEach(o=>{ if (o!==d) o.removeAttribute('open'); });
      });
    });
  }

  /* ========== 8) Support: feedback -> mailto ========== */
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

  /* ========== 9) Features: card shadow polish ========== */
  function featureCardPolish(){
    $$('.feature-card').forEach(card=>{
      card.addEventListener('mouseenter', ()=> card.style.boxShadow='0 8px 20px rgba(0,0,0,.4)');
      card.addEventListener('mouseleave', ()=> card.style.boxShadow='none');
    });
  }

  /* ========== 10) News: year chips filter ========== */
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

  /* ========== 11) Footer: Apple-style accordion (mobile only) ========== */
  function appleFooterAccordion(){
    const grid = $('.ks-foot-grid');            // 你的 Apple 風格 footer 容器
    if (!grid) return;

    const SECTIONS = () => $$('.ks-foot-grid > section'); // 每個欄位
    const mqMobile = matchMedia('(max-width: 768px)');

    // 綁定單一 section
    function bindSection(section){
      if (section._bound) return;
      section._bound = true;

      const h4  = section.querySelector('h4');
      const list= section.querySelector('ul, .links, .foot-links');
      if (!h4 || !list) return;

      // 無障礙屬性
      h4.setAttribute('role','button');
      h4.setAttribute('tabindex','0');
      h4.setAttribute('aria-expanded','false');

      // 初始：行動裝置預設收起
      if (mqMobile.matches){
        section.classList.remove('open');
        list.style.maxHeight = '0px';
      } else {
        section.classList.add('open');
        list.style.maxHeight = '';
        h4.removeAttribute('aria-expanded');
      }

      const toggle = ()=>{
        // 僅在行動版才可展開/收起
        if (!mqMobile.matches) return;
        const willOpen = !section.classList.contains('open');
        // 單開：關其他
        SECTIONS().forEach(s=>{
          if (s!==section && s.classList.contains('open')){
            s.classList.remove('open');
            const hh = s.querySelector('h4');
            const ll = s.querySelector('ul, .links, .foot-links');
            hh?.setAttribute('aria-expanded','false');
            if (ll) ll.style.maxHeight = '0px';
          }
        });
        // 切換目前
        section.classList.toggle('open', willOpen);
        h4.setAttribute('aria-expanded', String(willOpen));
        list.style.maxHeight = willOpen ? (list.scrollHeight + 'px') : '0px';
      };

      h4.addEventListener('click', toggle);
      h4.addEventListener('keydown', e=>{
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    }

    // 初始化 / 重算
    function setup(){
      const sections = SECTIONS();
      sections.forEach(bindSection);

      if (!mqMobile.matches){
        // 桌機：全部展開且移除高度限制
        sections.forEach(section=>{
          section.classList.add('open');
          const h4 = section.querySelector('h4');
          const ul = section.querySelector('ul, .links, .foot-links');
          h4?.removeAttribute('aria-expanded');
          if (ul) ul.style.maxHeight = '';
        });
      }else{
        // 手機：全部收起（保留使用者點開狀態）
        sections.forEach(section=>{
          if (!section.classList.contains('open')){
            const ul = section.querySelector('ul, .links, .foot-links');
            if (ul) ul.style.maxHeight = '0px';
            const h4 = section.querySelector('h4');
            h4?.setAttribute('aria-expanded','false');
          }
        });
      }
    }

    setup();
    // 視窗改變/語言切換（DOM 可能重建）後重新設定
    window.addEventListener('resize', ()=> requestAnimationFrame(setup), { passive:true });
    document.addEventListener('i18n:changed', ()=> requestAnimationFrame(setup));
  }

  /* ========== 12) Reveal-on-scroll ========== */
  function revealOnScroll(){
    const els = $$('.reveal-on-scroll');
    if (!els.length) return;

    if (!('IntersectionObserver' in window) ||
        matchMedia('(prefers-reduced-motion: reduce)').matches){
      els.forEach(e => e.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver((entries)=>{
      entries.forEach(en=>{
        if (en.isIntersecting){
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -10% 0px' });

    els.forEach(e => io.observe(e));
  }
})();

// js/pricing.js
(function(){
  const $ = (s,r=document)=>r.querySelector(s);
  const $$= (s,r=document)=>Array.from(r.querySelectorAll(s));

  function animateNumber(el, to, dur=300){
    const from = parseFloat(el.textContent) || 0;
    const start = performance.now();
    const isInt = Number.isInteger(parseFloat(el.getAttribute('data-monthly')||'0')) &&
                  Number.isInteger(parseFloat(el.getAttribute('data-yearly')||'0'));
    function step(t){
      const k = Math.min(1, (t-start)/dur);
      const v = from + (to - from) * k;
      el.textContent = isInt ? Math.round(v) : v.toFixed(2);
      if (k<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function billingToggle(){
    const btnM = $('#bill-monthly');
    const btnY = $('#bill-yearly');
    const prices = $$('[data-price]');
    if (!btnM || !btnY || !prices.length) return;

    function setMode(mode){ // 'm' | 'y'
      btnM.classList.toggle('on', mode==='m');
      btnY.classList.toggle('on', mode==='y');
      btnM.setAttribute('aria-selected', mode==='m' ? 'true':'false');
      btnY.setAttribute('aria-selected', mode==='y' ? 'true':'false');

      prices.forEach(el=>{
        const m = parseFloat(el.getAttribute('data-monthly')||'0');
        const y = parseFloat(el.getAttribute('data-yearly')||'0');
        const target = (mode==='y') ? y : m;
        animateNumber(el, target, 280);
        const tail = el.parentElement.querySelector('small');
        if (tail){
          tail.textContent = (mode==='y') ? '/ year' : '/ month';
          // i18n 補：若你的 i18n 有 pricing.price.tailYear 可在 lang.js 渲染後覆蓋
        }
      });
    }

    btnM.addEventListener('click', ()=> setMode('m'));
    btnY.addEventListener('click', ()=> setMode('y'));
    // 預設月付
    setMode('m');
  }

  function faqSingleOpen(){
    const items = $$('section.faq details');
    if (!items.length) return;
    items.forEach(d=>{
      d.addEventListener('toggle', ()=>{
        if (d.open) items.forEach(o=>{ if (o!==d) o.removeAttribute('open'); });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    billingToggle();
    faqSingleOpen();
  });
})();
