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

// js/pricing.js — Plans toggle / i18n tails / launch switch / feature matrix
(function () {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ------------------------------
   * 1) 可調整的上線/價格設定
   * ------------------------------ */
  const LAUNCH = {
    // 是否已開放桌面下載（所有 Coming Soon 轉為可點 CTA）
    desktopAvailable: false,

    // Web 版是否可引導（Free/Plus/Pro 的 CTA 連到 web）
    webAvailable: true,

    // Web 連結（可依方案改不同路徑；現用同一個）
    webURL: 'https://web.keysearch-app.com',

    // 桌面下載連結（之後上線改為你的實際路徑）
    desktopURL: 'download.html'
  };

  // 價格資料（也可以完全靠 HTML data-*；這裡做集中設定好維護）
  const PRICES = {
    free: { m: 0, y: 0, subtitleKey: 'pricing.plans.free.subtitle'    }, // 免安裝，立即體驗核心功能
    plus: { m: 5, y: 48, subtitleKey: 'pricing.plans.plus.subtitle'   }, // 個人專屬強化功能
    pro : { m: 12, y: 115, subtitleKey: 'pricing.plans.pro.subtitle'  }  // 團隊專屬協作工具
  };

  // 「卡片詳細內容」功能分配（你可依需求微調）
  // 顯示在比較表 data-feature="cardDetails" 該列（或做 tooltip）
  // 對應值：'none' | 'basic' | 'full'
  const CARD_DETAIL_FEATURE = {
    free: 'none',   // 無詳細檢視（可看縮圖）
    plus: 'basic',  // 圖片/基礎預覽
    pro : 'full'    // 圖片 + PDF（與更多格式）
  };

  /* ------------------------------
   * 2) 小工具
   * ------------------------------ */
  function i18n(path, fallback) {
    try {
      return (window.I18N?.t(path)) ?? fallback;
    } catch { return fallback; }
  }

  function animateNumber(el, to, dur = 280) {
    const from = parseFloat(el.textContent) || 0;
    const start = performance.now();
    const wantsInt = Number.isInteger(to);

    function step(t) {
      const k = Math.min(1, (t - start) / dur);
      const v = from + (to - from) * k;
      el.textContent = wantsInt ? Math.round(v) : v.toFixed(2);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function setTailSmall(el, mode) {
    // / month 或 / year（可被 i18n 覆蓋）
    const m = i18n('pricing.price.tail', '/ month');
    const y = i18n('pricing.price.tailYear', '/ year');
    el.textContent = (mode === 'y') ? y : m;
  }

  function calcSavePercent(mMonthly, yYearly) {
    // 例如：$5 * 12 = 60 -> 年付 48 省 20%
    if (!mMonthly || !yYearly) return 0;
    const fullYear = mMonthly * 12;
    if (!fullYear) return 0;
    const save = Math.max(0, fullYear - yYearly);
    return Math.round((save / fullYear) * 100);
  }

  /* ------------------------------
   * 3) 月/年切換（含數字動畫）
   * ------------------------------ */
  function billingToggle() {
    const btnM = $('#bill-monthly');
    const btnY = $('#bill-yearly');
    if (!btnM || !btnY) return;

    const priceSpans = $$('[data-price]');
    // 如果 HTML 上已有 data-monthly / data-yearly，就用；否則 fall back 到 PRICES
    // 同時把 Yearly 徽章的節省比例算好（由 Plus 卡那顆顯示）
    const yearlyBadge = $('#bill-yearly .badge');
    if (yearlyBadge) {
      // 單純以 Plus 當範例計算節省（也可綁定所有方案算平均）
      const pct = calcSavePercent(PRICES.plus.m, PRICES.plus.y);
      yearlyBadge.textContent = i18n('pricing.billing.save', `Save ${pct}%`).replace(/\d+%/, `${pct}%`);
    }

    function applyMode(mode) {
      // 標記 UI 狀態
      btnM.classList.toggle('on', mode === 'm');
      btnY.classList.toggle('on', mode === 'y');
      btnM.setAttribute('aria-selected', mode === 'm' ? 'true' : 'false');
      btnY.setAttribute('aria-selected', mode === 'y' ? 'true' : 'false');

      // 更新每張卡片價格
      priceSpans.forEach(el => {
        // 判斷卡片類型（free/plus/pro）
        const card = el.closest('.plan');
        let key = 'free';
        if (card?.classList.contains('plus')) key = 'plus';
        if (card?.classList.contains('pro'))  key = 'pro';

        const p = PRICES[key];
        const to = (mode === 'y') ? p.y : p.m;
        animateNumber(el, to, 280);

        // 價格尾巴（/ month / year）
        const small = el.parentElement?.querySelector('small');
        if (small) setTailSmall(small, mode);
      });
    }

    btnM.addEventListener('click', () => applyMode('m'));
    btnY.addEventListener('click', () => applyMode('y'));

    // 預設月付
    applyMode('m');

    // 語言切換後更新 /month /year 詞條
    document.addEventListener('i18n:changed', () => {
      const smalls = $$('.price small');
      // 依目前 on 的按鈕推回 mode
      const mode = btnY.classList.contains('on') ? 'y' : 'm';
      smalls.forEach(s => setTailSmall(s, mode));
    });
  }

  /* ------------------------------
   * 4) CTA 狀態（Coming Soon → 上線）
   * ------------------------------ */
  function applyLaunchState() {
    // 英文口吻/文案可交給 i18n；這裡先用語意常數做 fallback
    const TXT = {
      coming : i18n('pricing.cta.coming', 'Coming Soon'),
      openWeb: i18n('pricing.cta.openWeb', 'Open Web'),
      download: i18n('pricing.cta.download', 'Download')
    };

    // 三張卡的 CTA
    $$('.plan').forEach(card => {
      const isFree = card.classList.contains('free');
      const isPlus = card.classList.contains('plus');
      const isPro  = card.classList.contains('pro');

      // 卡片內第一顆主要 CTA（你的 HTML 是最後一個 button）
      const ctaBtn = card.querySelector('.btn-coming, .btn'); // 兼容
      if (!ctaBtn) return;

      if (!LAUNCH.desktopAvailable && !LAUNCH.webAvailable) {
        // 完全未上線 → 一律 Coming Soon（禁用）
        ctaBtn.classList.add('btn-coming');
        ctaBtn.setAttribute('aria-disabled', 'true');
        ctaBtn.textContent = TXT.coming;
        ctaBtn.removeAttribute('href');
        return;
      }

      // 有 Web 就導 Web；否則導 Desktop
      const useWeb = LAUNCH.webAvailable === true;
      const url    = useWeb ? LAUNCH.webURL : LAUNCH.desktopURL;

      // 按方案給不同行為（視你策略決定；這裡全部導向同一 webURL / download）
      ctaBtn.classList.remove('btn-coming');
      ctaBtn.removeAttribute('aria-disabled');
      ctaBtn.textContent = useWeb ? TXT.openWeb : TXT.download;
      ctaBtn.tagName === 'A'
        ? ctaBtn.setAttribute('href', url)
        : ctaBtn.replaceWith(Object.assign(document.createElement('a'), {
            className: 'btn',
            href: url,
            textContent: useWeb ? TXT.openWeb : TXT.download,
            target: '_blank', rel: 'noopener'
          }));
    });

    // HERO 與 FINAL CTA 區域（Coming Soon / Join notifications）
    $$('.btn-coming').forEach(b => {
      if (LAUNCH.desktopAvailable || LAUNCH.webAvailable) {
        // 變成可點 — 預設導 Web
        b.classList.remove('btn-coming');
        b.removeAttribute('aria-disabled');
        b.textContent = LAUNCH.webAvailable
          ? i18n('pricing.cta.openWeb', 'Open Web')
          : i18n('pricing.cta.download', 'Download');
        const a = document.createElement('a');
        a.className = 'btn';
        a.href = LAUNCH.webAvailable ? LAUNCH.webURL : LAUNCH.desktopURL;
        a.textContent = b.textContent;
        a.target = '_blank'; a.rel = 'noopener';
        b.replaceWith(a);
      }
    });
  }

  /* ------------------------------
   * 5) FAQ 單開
   * ------------------------------ */
  function faqSingleOpen() {
    const items = $$('section.faq details');
    if (!items.length) return;
    items.forEach(d => {
      d.addEventListener('toggle', () => {
        if (d.open) items.forEach(o => { if (o !== d) o.removeAttribute('open'); });
      });
    });
  }

  /* ------------------------------
   * 6) 比較表：卡片詳細內容（依方案）
   *   HTML：在對應那一列加 data-feature="cardDetails"
   * ------------------------------ */
  function applyFeatureMatrix() {
    const row = document.querySelector('table.cmp [data-feature="cardDetails"]')?.closest('tr');
    if (!row) return;

    // 假設表頭後順序是：Free / Plus / Pro（你的表格就是）
    const tds = Array.from(row.querySelectorAll('td')).slice(-3);
    if (tds.length !== 3) return;

    const MAP = {
      none : i18n('pricing.cardDetails.none', '—'),
      basic: i18n('pricing.cardDetails.basic', 'Images'),
      full : i18n('pricing.cardDetails.full', 'Images + PDF')
    };

    tds[0].textContent = MAP[CARD_DETAIL_FEATURE.free] || '—';
    tds[1].textContent = MAP[CARD_DETAIL_FEATURE.plus] || '—';
    tds[2].textContent = MAP[CARD_DETAIL_FEATURE.pro ] || '—';
  }

  /* ------------------------------
   * 7) 方案副標（subtitle）的 i18n（選擇性）
   *   HTML 若需要顯示副標，請在每張卡 h3 後加：
   *   <div class="subtitle" data-i18n="pricing.plans.free.subtitle">…</div>
   * ------------------------------ */
  function applySubtitles() {
    // 如果你已經在 i18n json 裡寫好，就交給 lang.js 自動渲染
    // 這裡只做兜底：如果沒有 data-i18n，就用固定字串
    const fallback = {
      free: 'No install. Try the core features now.',
      plus: 'Personal power features.',
      pro : 'Team collaboration ready.'
    };
    [['free','.plan.free'], ['plus','.plan.plus'], ['pro','.plan.pro']].forEach(([k, sel])=>{
      const el = document.querySelector(`${sel} .subtitle`);
      if (!el) return;
      const txt = i18n(PRICES[k].subtitleKey, fallback[k]);
      el.textContent = txt;
    });
  }

  /* ------------------------------
   * 8) 啟動
   * ------------------------------ */
  function boot() {
    billingToggle();
    applyLaunchState();
    faqSingleOpen();
    applyFeatureMatrix();
    applySubtitles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  // 語言切換後，重套副標 & feature 表列文案
  document.addEventListener('i18n:changed', () => {
    applyFeatureMatrix();
    applySubtitles();
  });
})();