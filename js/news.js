// js/news.js — 動態渲染 News 卡片（非模組版）
(function () {
  // 小工具：建立節點
  function h(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'dataset') {
        const ds = attrs[k] || {};
        for (const dk in ds) el.dataset[dk] = ds[dk];
      } else if (k === 'html') {
        el.innerHTML = attrs[k];
      } else {
        el.setAttribute(k, attrs[k]);
      }
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      if (typeof c === 'string') el.appendChild(document.createTextNode(c));
      else el.appendChild(c);
    });
    return el;
  }

  const gridId = 'newsGrid';
  const chipsId = 'newsYearChips';

  function buildOneCard(item) {
    // item: {version, date, title, desc, bullets[], year}
    const meta = h('div', { class: 'news-meta' }, [
      item.version ? h('span', { class: 'badge' }, item.version) : null,
      item.date ? h('time', { datetime: item.date }, item.date) : null
    ]);

    const title = h('h2', {}, item.title || '');
    const desc  = h('p',  {}, item.desc  || '');

    const ul = h('ul', { class: 'news-list' });
    if (Array.isArray(item.bullets)) {
      item.bullets.forEach(b => ul.appendChild(h('li', {}, b)));
    }

    return h('article', {
      class: 'news-card',
      dataset: { year: String(item.year || '') }
    }, [meta, title, desc, ul]);
  }

  function sortItems(items) {
    // 嘗試用 Date 解析，失敗就維持原順序
    return [...items].sort((a, b) => {
      const da = Date.parse(a.date || '') || 0;
      const db = Date.parse(b.date || '') || 0;
      return db - da; // 新到舊
    });
  }

  function renderNews() {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    // 讀 i18n 陣列
    const items = (window.I18N && window.I18N.t('news.items')) || [];
    if (!Array.isArray(items) || items.length === 0) {
      grid.innerHTML = '';
      console.warn('[news] no items in i18n: news.items');
      return;
    }

    // 清空並重建
    grid.innerHTML = '';
    sortItems(items).forEach(it => {
      grid.appendChild(buildOneCard(it));
    });

    // 預設顯示「All」
    applyFilter('all');
  }

  function applyFilter(year) {
    const cards = document.querySelectorAll('#' + gridId + ' .news-card');
    cards.forEach(card => {
      const y = card.dataset.year || '';
      const show = (year === 'all') || (y === String(year));
      card.style.display = show ? '' : 'none';
    });
  }

  function bindYearChips() {
    const wrap = document.getElementById(chipsId);
    if (!wrap) return;
    wrap.addEventListener('click', e => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      wrap.querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('active', c === btn);
        c.setAttribute('aria-pressed', c === btn ? 'true' : 'false');
      });
      applyFilter(btn.dataset.year || 'all');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderNews();
    bindYearChips();

    // 語言切換時重渲染（I18N 在 lang.js 內會 dispatch 這個事件）
    document.addEventListener('i18n:changed', renderNews, { once: false });
  });
})();