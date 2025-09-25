(() => {
  /* ---------- tiny utils ---------- */
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  /* ========== Boot ========== */
  document.addEventListener('DOMContentLoaded', () => {
    mobileNav();         // 行動選單
    langPortal();        // 語言選單（桌機/手機/Footer 共用）
    heroCtaSmooth();     // Index CTA 平滑捲動
    heroTyping();        // Index 打字動畫
    featureImgHover();   // Index/Features 圖片 hover
    timelineHighlight(); // About 年代表
    pricingToggle();     // Pricing 月/年
    faqSingleOpen();     // Support FAQ
    feedbackMailto();    // Support 表單
    featureCardPolish(); // Features 卡片 hover 陰影
    newsFilter();        // News 篩選
    footerAccordion();   // Footer 手機手風琴
  });

  /* ========== 1) Mobile nav（唯一版本） ========== */
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

  /* ========== 2) Language Portal（唯一版本） ========== */
  function langPortal(){
    const SUPPORTED = [
      ['en','English'], ['zh-tw','繁體中文'], ['zh-cn','简体中文'],
      ['ja','日本語'], ['ko','한국어'], ['fr','Français'], ['de','Deutsch']
    ];
    const portal     = $('#langPortal');
    const btnDesk    = $('#langBtn');
    const btnMobile  = $('#langBtnMobile');
    const footLink   = $('#footLangLink');
    const curDesk    = $('#langCurrent');
    const curMobile  = $('#langCurrentMobile');
    if (!portal) return;

    let current = localStorage.getItem('ks_lang') || 'en';

    // 建一次清單
    if (!portal.dataset.built){
      portal.innerHTML = SUPPORTED.map(([code,label]) =>
        `<button type="button" role="menuitem" data-lang="${code}">${label}</button>`
      ).join('');
      portal.dataset.built = '1';
    }

    const syncCurrent = ()=>{
      const label = SUPPORTED.find(([c])=>c===current)?.[1] || 'English';
      if (curDesk)   curDesk.textContent   = label;
      if (curMobile) curMobile.textContent = label;
      portal.querySelectorAll('[aria-current="true"]').forEach(b=>b.removeAttribute('aria-current'));
      portal.querySelector(`[data-lang="${current}"]`)?.setAttribute('aria-current','true');
    };
    syncCurrent();

    const setLang = (code)=>{
      current = code;
      localStorage.setItem('ks_lang', code);
      syncCurrent();
      // 若有 i18n：window.KS_I18N?.setLang(code);
      console.log('[i18n] switch to:', code);
    };

    // 開/關
    const close = ()=>{
      portal.classList.remove('open');
      portal.setAttribute('aria-hidden','true');
    };
    const open = (anchor)=>{
      portal.classList.add('open');
      portal.removeAttribute('aria-hidden');

      // 先顯示再定位（需要尺寸）
      const r = anchor.getBoundingClientRect();
      const top  = Math.min(r.bottom + 8, window.innerHeight - portal.offsetHeight - 16);
      const left = Math.min(
        Math.max(16, r.left),
        window.innerWidth - portal.offsetWidth - 16
      );
      portal.style.top  = `${Math.max(8, top)}px`;
      portal.style.left = `${Math.max(8, left)}px`;

      // 點外面 / ESC 關閉
      const onDoc = (e)=>{ if (!portal.contains(e.target)) close(); };
      const onEsc = (e)=>{ if (e.key==='Escape') close(); };
      setTimeout(()=>{
        document.addEventListener('click', onDoc, { once:true });
        document.addEventListener('keydown', onEsc, { once:true });
      }, 0);
    };

    const bindOpen = (el)=>{
      if (!el) return;
      el.addEventListener('click', (e)=>{
        e.preventDefault();
        e.stopPropagation();     // 避免馬上被「點外面關閉」吃掉
        portal.classList.contains('open') ? close() : open(el);
      });
    };

    bindOpen(btnDesk);
    bindOpen(btnMobile);
    bindOpen(footLink);

    portal.addEventListener('click', (e)=>{
      const b = e.target.closest('button[data-lang]');
      if (!b) return;
      setLang(b.dataset.lang);
      close();
    });
  }

  /* ========== 3) Index: CTA 平滑捲動 ========== */
  function heroCtaSmooth(){
    const btn = $('.hero .btn.primary');
    if (!btn) return;
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      $('.feature')?.scrollIntoView({behavior:'smooth'});
    });
  }

  /* ========== 4) Index: 打字動畫（高度穩定） ========== */
  function heroTyping(){
    const titleEl = $('#heroTitle');
    const wrap    = $('#heroTitleWrap');
    if (!titleEl || !wrap || titleEl.dataset.typed === '1') return;
    titleEl.dataset.typed = '1';

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lines  = ['Find it. Fast.', 'No mess. Just answers.'];

    // 固定外層高度，避免欄寬抖動
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
        if (cfg.loop) setTimeout(()=>{ dir=1; timer=setInterval(step, cfg.type); }, cfg.pauseBack);
      }
    }
  }

  /* ========== 5) Index/Features: 圖片 hover ========== */
  function featureImgHover(){
    $$('.feature-img img').forEach(img=>{
      img.addEventListener('mouseenter', ()=>{
        img.style.transition = 'transform .3s ease';
        img.style.transform  = 'scale(1.03)';
      });
      img.addEventListener('mouseleave', ()=>{ img.style.transform='scale(1)'; });
    });
  }

  /* ========== 6) About: 年代表高亮 ========== */
  function timelineHighlight(){
    const items = $$('.timeline-list li');
    if (!items.length) return;
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); });
    }, {threshold:.3});
    items.forEach(i => io.observe(i));
  }

  /* ========== 7) Pricing: 月/年切換 ========== */
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

  /* ========== 8) Support: FAQ only-one-open ========== */
  function faqSingleOpen(){
    const items = $$('.faq-item');
    if (!items.length) return;
    items.forEach(d=>{
      d.addEventListener('toggle', ()=>{
        if (d.open) items.forEach(o=>{ if(o!==d) o.removeAttribute('open'); });
      });
    });
  }

  /* ========== 9) Support: 送出 → mailto + toast ========== */
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

  /* ========== 10) Features: 卡片 hover 陰影 ========== */
  function featureCardPolish(){
    $$('.feature-card').forEach(card=>{
      card.addEventListener('mouseenter', ()=> card.style.boxShadow='0 8px 20px rgba(0,0,0,.4)');
      card.addEventListener('mouseleave', ()=> card.style.boxShadow='none');
    });
  }

  /* ========== 11) News: 年份 chips 篩選 ========== */
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

  /* ========== 12) Footer: 手機手風琴 ========== */
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
        // 只開一個
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
})();

// 建議放在 langPortal() 那段內部最後
function closePortal(){
  portal.classList.remove('open');
  portal.setAttribute('aria-hidden','true');
}
function openPortal(anchor){
  portal.classList.add('open');
  portal.removeAttribute('aria-hidden');
  // ...（定位演算法維持）
}

// ① 頁面載入先確保關閉
closePortal();

// ② 窗口尺寸變動時關閉（避免位置失效）
window.addEventListener('resize', () => {
  if (portal.classList.contains('open')) closePortal();
}, { passive: true });

// ③ 點外面關閉（注意 setTimeout 0 防止與開啟那次 click 衝突）
function bindOpen(el){
  if (!el) return;
  el.addEventListener('click', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    if (portal.classList.contains('open')) {
      closePortal();
    } else {
      openPortal(el);
      setTimeout(() => {
        const onDoc = (ev) => { if (!portal.contains(ev.target)) closePortal(); };
        const onEsc = (ev) => { if (ev.key === 'Escape') closePortal(); };
        document.addEventListener('click', onDoc, { once:true });
        document.addEventListener('keydown', onEsc, { once:true });
      }, 0);
    }
  });
}
