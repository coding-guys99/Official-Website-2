// js/news.js — 動態產生 News chips + cards，支援 i18n 切換

(function () {
  const grid  = document.getElementById('newsGrid');
  const chips = document.getElementById('newsYearChips');

  if (!grid || !chips) return;

  // 取得目前語系的 news 區塊
  function getNewsDict() {
    const d = (window.I18N && I18N.dict) || {};
    return d.news || {};
  }

  // 從 items 取出所有年份（若缺 year 就由 date 推）
  function collectYears(items) {
    const years = new Set();
    items.forEach(it => {
      let y = it.year;
      if (!y && it.date) {
        // 嘗試從 "Sep 1, 2025" / "2025-09-01" 等取年
        const m = String(it.date).match(/(\d{4})/);
        if (m) y = m[1];
      }
      if (y) years.add(String(y));
    });
    // 由大到小排序
    return Array.from(years).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }

  // 產生年份 chips
  function renderChips(dict) {
    const items = dict.items || [];
    const years = collectYears(items);
    const allLabel = dict.filter?.all || 'All';

    // 先清空
    chips.innerHTML = '';

    // All
    const btnAll = document.createElement('button');
    btnAll.className = 'chip active';
    btnAll.dataset.year = 'all';
    btnAll.setAttribute('aria-pressed', 'true');
    btnAll.textContent = allLabel;
    chips.appendChild(btnAll);

    // 逐年
    years.forEach(y => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.dataset.year = y;
      b.textContent = y;
      b.setAttribute('aria-pressed', 'false');
      chips.appendChild(b);
    });
  }

  // 產生卡片 HTML
  function cardHTML(it) {
    const year = it.year || (String(it.date || '').match(/(\d{4})/)?.[1] || '');
    const bullets = (it.bullets || []).map(li => `<li>${li}</li>`).join('');
    return `
      <article class="news-card" data-year="${year}">
        <div class="news-meta">
          ${it.version ? `<span class="badge">${it.version}</span>` : ''}
          ${it.date ? `<time datetime="${it.date}">${it.date}</time>` : ''}
        </div>
        <h2>${it.title || ''}</h2>
        <p>${it.desc || ''}</p>
        ${bullets ? `<ul class="news-list">${bullets}</ul>` : ''}
      </article>
    `;
  }

  // 渲染卡片（依目前字典）
  function renderCards(dict) {
    const items = (dict.items || []).slice();

    // 依日期/版本做個大致排序（新→舊）
    items.sort((a, b) => {
      // 先比年份
      const ya = (a.year || String(a.date || '').match(/(\d{4})/)?.[1] || '0');
      const yb = (b.year || String(b.date || '').match(/(\d{4})/)?.[1] || '0');
      if (yb !== ya) return yb.localeCompare(ya, undefined, { numeric: true });
      // 再比日期字串（最佳做法是改成 ISO 日期，但這裡就先字串比較）
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    grid.innerHTML = items.map(cardHTML).join('');
  }

  // 綁定 chip 點擊事件
  function bindChipEvents() {
    chips.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;

      // 切換 active 與 aria-pressed
      chips.querySelectorAll('.chip').forEach(c => {
        const active = c === btn;
        c.classList.toggle('active', active);
        c.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      const yr = btn.dataset.year;
      filterByYear(yr);
    });
  }

  // 依年份過濾
  function filterByYear(year) {
    const cards = grid.querySelectorAll('.news-card');
    cards.forEach(card => {
      const y = card.getAttribute('data-year');
      const show = (year === 'all') || (year === y);
      card.style.display = show ? '' : 'none';
    });
  }

  // 首次渲染
  function firstRender() {
    const dict = getNewsDict();
    renderChips(dict);
    renderCards(dict);
    // 預設顯示 All
    filterByYear('all');
  }

  // 當語言切換時重渲染（文字會換語言、年份 chip 也會用該語言的 "All"）
  document.addEventListener('i18n:changed', firstRender);

  // DOM 準備好就先跑一次（若 i18n 還沒載完，下一次 i18n:changed 會再覆蓋）
  document.addEventListener('DOMContentLoaded', () => {
    bindChipEvents();
    firstRender();
  });
})();