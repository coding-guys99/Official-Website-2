document.addEventListener('DOMContentLoaded', () => {
  console.log('App ready');

  /* ========== Index: Hero CTA 平滑滾動 ========== */
  const heroBtn = document.querySelector('.hero .btn.primary');
  if (heroBtn) {
    heroBtn.addEventListener('click', (e) => {
      e.preventDefault(); // 若要直接下載，移除此行
      document.querySelector('.feature')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* ========== Index: Features 圖片 hover（去重） ========== */
  document.querySelectorAll('.feature-img img').forEach((img) => {
    img.addEventListener('mouseenter', () => {
      img.style.transform = 'scale(1.03)';
      img.style.transition = 'transform .3s ease';
    });
    img.addEventListener('mouseleave', () => {
      img.style.transform = 'scale(1)';
    });
  });

  /* ========== Index: Hero typing（多段循環） ========== */
  const titleEl = document.getElementById('heroTitle');
  if (titleEl && titleEl.dataset.typed !== '1') {
    titleEl.dataset.typed = '1';

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const texts = [
      'Find it. Fast.',
      'No mess. Just answers.',
      // 'Everything, in reach.',
    ];

    // 固定外層高度，避免輸入長度改變造成左右位移/覆蓋
    function fixHeroHeight(lines){
      const wrap = document.getElementById('heroTitleWrap');
      const h1   = document.getElementById('heroTitle');
      if (!wrap || !h1) return;

      const measurer = document.createElement('div');
      measurer.style.cssText = `
        position:absolute; left:-9999px; top:-9999px; visibility:hidden; white-space:normal;
      `;
      const cs = getComputedStyle(h1);
      ['font-family','font-size','font-weight','line-height','letter-spacing',
       'text-transform','word-spacing','width'].forEach(p => measurer.style[p] = cs[p]);
      document.body.appendChild(measurer);

      const recompute = () => {
        measurer.style.width = getComputedStyle(wrap).width;
        let maxH = 0;
        lines.forEach(t => { measurer.textContent = t; maxH = Math.max(maxH, measurer.offsetHeight); });
        wrap.style.minHeight = (maxH + 4) + 'px';
      };
      recompute();

      let tid;
      window.addEventListener('resize', () => {
        clearTimeout(tid);
        tid = setTimeout(recompute, 120);
      }, { passive:true });

      setTimeout(()=> document.body.removeChild(measurer), 0);
    }
    fixHeroHeight(texts);

    // 建立文字容器 + caret
    const span = document.createElement('span');
    const caret = document.createElement('span');
    caret.className = 'caret';
    titleEl.textContent = '';
    titleEl.append(span, caret);

    if (reduce) { span.textContent = texts[0]; return; }

    const cfg = { typeSpeed: 70, backSpeed: 45, pauseAfterType: 1000, pauseAfterBack: 600, loop: true };
    let textIndex = 0, i = 0, dir = 1;
    let timer = setInterval(step, cfg.typeSpeed);

    function step() {
      const t = texts[textIndex];
      i += dir;
      span.textContent = t.slice(0, i);

      if (dir === 1 && i >= t.length) {
        clearInterval(timer);
        setTimeout(() => { dir = -1; timer = setInterval(step, cfg.backSpeed); }, cfg.pauseAfterType);
      } else if (dir === -1 && i <= 0) {
        clearInterval(timer);
        textIndex = (textIndex + 1) % texts.length;
        if (cfg.loop) {
          setTimeout(() => { dir = 1; timer = setInterval(step, cfg.typeSpeed); }, cfg.pauseAfterBack);
        }
      }
    }
  }

  /* ========== About: Timeline highlight on scroll ========== */
  const timelineItems = document.querySelectorAll('.timeline-list li');
  if (timelineItems.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); });
    }, { threshold: 0.3 });
    timelineItems.forEach(i => io.observe(i));
  }

  /* ========== Pricing: monthly/yearly toggle ========== */
  const toggle = document.getElementById('billingToggle');
  if (toggle) {
    const saved = localStorage.getItem('ks_billing_yearly') === '1';
    toggle.setAttribute('aria-pressed', saved ? 'true' : 'false');
    applyPrices(saved);

    toggle.addEventListener('click', () => {
      const next = toggle.getAttribute('aria-pressed') !== 'true';
      toggle.setAttribute('aria-pressed', next ? 'true' : 'false');
      localStorage.setItem('ks_billing_yearly', next ? '1' : '0');
      applyPrices(next);
    });

    function applyPrices(yearly){
      document.querySelectorAll('.price-card .price').forEach(p=>{
        const monthly = p.getAttribute('data-monthly') || '';
        const yearlyP = p.getAttribute('data-yearly') || '';
        if (yearly && yearlyP){
          p.firstChild.nodeValue = yearlyP + ' ';
          p.querySelector('span')?.textContent = '/ month (billed yearly)';
        }else{
          p.firstChild.nodeValue = monthly + ' ';
          p.querySelector('span')?.textContent = '/ month';
        }
      });
    }
  }

  /* ========== Support: FAQ & Feedback ========== */
  const faqItems = document.querySelectorAll('details.faq-item');
  const form = document.getElementById('feedbackForm');
  const toast = document.getElementById('toast');

  if (faqItems.length){
    faqItems.forEach(d => {
      d.addEventListener('toggle', () => {
        if (d.open) faqItems.forEach(other => { if (other !== d) other.removeAttribute('open'); });
      });
    });
  }

  if (form){
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (form.website && form.website.value.trim() !== '') return; // 蜜罐

      const name = (form.name?.value || '').trim();
      const email = (form.email?.value || '').trim();
      const topic = (form.topic?.value || 'general');
      const msg = (form.message?.value || '').trim();

      if (!name || !email || !msg) return showToast('Please fill in your name, email and message.');

      const subject = encodeURIComponent(`KeySearch Support — ${topic}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${msg}`);
      window.location.href = `mailto:hello@keysearch-app.com?subject=${subject}&body=${body}`;
      showToast('Opening your email app…');
    });
  }

  function showToast(text){
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=> { toast.hidden = true; }, 2500);
  }

  /* ========== Features page: small polish ========== */
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', () => { card.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)'; });
    card.addEventListener('mouseleave', () => { card.style.boxShadow = 'none'; });
  });
});

// News: 年份 chip 篩選
document.addEventListener('DOMContentLoaded', () => {
  const group = document.getElementById('newsYearChips');
  if (!group) return;

  const cards = document.querySelectorAll('.news-card');
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;

    // 切換 active 樣式
    group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');

    const year = btn.dataset.year;
    cards.forEach(c => {
      c.style.display = (year === 'all' || c.dataset.year === year) ? '' : 'none';
    });
  });
});

document.addEventListener('DOMContentLoaded', ()=>{
  const toggle = document.getElementById('navToggle');
  const links  = document.querySelector('.nav .nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', ()=>{
    const open = !links.classList.contains('open');
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
});
