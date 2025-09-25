// js/footer-accordion.js
document.addEventListener('DOMContentLoaded', () => {
  const mq = window.matchMedia('(max-width: 768px)');
  const cols = Array.from(document.querySelectorAll('.bm-footer .foot-col'));

  if (!cols.length) return;

  function applyState(isMobile){
    cols.forEach(col => {
      const btn  = col.querySelector('.foot-head');
      const list = col.querySelector('.foot-links');
      if (!btn || !list) return;

      if (isMobile) {
        // 初始：全部收起
        col.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        list.style.maxHeight = '0px';
        list.style.overflow = 'hidden';
      } else {
        // 桌機：全部展開（還原高度控制）
        col.classList.remove('open');
        btn.removeAttribute('aria-expanded');
        list.style.maxHeight = '';
        list.style.overflow = '';
      }
    });
  }

  function bindClicks(){
    cols.forEach(col => {
      const btn  = col.querySelector('.foot-head');
      const list = col.querySelector('.foot-links');
      if (!btn || !list || btn._bound) return;

      btn._bound = true;
      btn.addEventListener('click', () => {
        if (!mq.matches) return; // 只在手機收合

        const opening = !col.classList.contains('open');
        // 先關其他
        cols.forEach(other => {
          if (other !== col && other.classList.contains('open')) {
            other.classList.remove('open');
            const b = other.querySelector('.foot-head');
            const l = other.querySelector('.foot-links');
            if (b) b.setAttribute('aria-expanded', 'false');
            if (l) l.style.maxHeight = '0px';
          }
        });

        // 切換自己
        col.classList.toggle('open', opening);
        btn.setAttribute('aria-expanded', String(opening));
        // 用 scrollHeight 做自然高度
        list.style.maxHeight = opening ? (list.scrollHeight + 'px') : '0px';
      });
    });
  }

  // 初始
  applyState(mq.matches);
  bindClicks();

  // RWD 切換時更新
  const onChange = e => applyState(e.matches);
  // 兼容舊瀏覽器
  mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
});