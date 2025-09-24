document.addEventListener('DOMContentLoaded', () => {
  const els = document.querySelectorAll('.reveal-on-scroll');
  if (!els.length) return;

  // 如果瀏覽器不支援 IO 或使用者設定少動畫，就直接顯示
  if (!('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(e => e.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('is-visible');
        io.unobserve(en.target); // 只 reveal 一次
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -10% 0px'
  });

  els.forEach(e => io.observe(e));
});