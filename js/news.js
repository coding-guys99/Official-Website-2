(() => {
  const GRID_ID = 'newsGrid';
  const CHIPS_ID = 'newsYearChips';
  const DATA_URL = new URL('../data/news.json', import.meta.url).toString(); // 相對 js/ 的路徑

  let rawItems = [];     // 從 JSON 讀到的原始資料
  let activeYear = 'all';

  // 取 i18n 文案（支援 l1、l2、l3... 的 bullets）
  function t(path, fallback = '') {
    try {
      const v = window.I18N?.t(path);
      return (typeof v === 'string') ? v : fallback;
    } catch (_) {
      return fallback;
    }
  }

  // 產生年份 chips（All + 各年，DESC）
  function renderYearChips(years) {
    const wrap = document.getElementById(CHIPS_ID);
    if (!wrap) return;

    const uniq = Array.from(new Set(years)).sort((a, b) => b - a);
    const html = [
      `<button class="chip ${activeYear==='all' ? 'active' : ''}" data-year="all" aria-pressed="${activeYear==='all'}" data-i18n="news.filter.all">${t('news.filter.all','All')}</button>`,
      ...uniq.map(y =>
        `<button class="chip ${String(y)===String(activeYear)?'active':''}" data-year="${y}" aria-pressed="${String(y)===String(activeYear)}">${y}</button>`
      )
    ].join('');

    wrap.innerHTML = html;

    wrap.onclick = (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      activeYear = btn.dataset.year;
      [...wrap.querySelectorAll('.chip')].forEach(b => {
        const on = (b.dataset.year === activeYear);
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      renderCards();
    };
  }

  // 從 i18n 取得 bullets（news.vxxx.l1..lN）
  function getBullets(keyBase, max = 10) {
    const out = [];
    for (let i = 1; i <= max; i++) {
      const key = `${keyBase}.l${i}`;
      const val = t(key);
      if (!val) break;
      out.push(val);
    }
    return out;
  }

  // 產生更新卡片
  function renderCards() {
    const grid = document.getElementById(GRID_ID);
    if (!grid) return;

    const list = rawItems
      .filter(item => activeYear === 'all' || String(item.year) === String(activeYear))
      .sort((a, b) => (b.dateISO || '').localeCompare(a.dateISO || ''));

    const html = list.map(item => {
      const k = item.i18n; // 例如 "news.v130"
      const dateText = t(`${k}.date`) || item.dateISO || '';
      const title = t(`${k}.title`, item.id);
      const desc = t(`${k}.desc`, '');
      const bullets = getBullets(k);
      const badge = item.version || '';

      return `
        <article class="news-card" data-year="${item.year}">
          <div class="news-meta">
            ${badge ? `<span class="badge">${badge}</span>` : ''}
            ${dateText ? `<time datetime="${item.dateISO || ''}">${dateText}</time>` : ''}
          </div>
          <h2>${title}</h2>
          ${desc ? `<p>${desc}</p>` : ''}
          ${bullets.length ? `<ul class="news-list">${bullets.map(li => `<li>${li}</li>`).join('')}</ul>` : ''}
        </article>
      `;
    }).join('');

    grid.innerHTML = html || `<p class="muted">No updates yet.</p>`;
  }

  // 初始載入
  async function boot() {
    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      rawItems = Array.isArray(data.items) ? data.items : [];

      // 年份來自資料本身
      renderYearChips(rawItems.map(i => i.year));
      renderCards();
    } catch (err) {
      console.error('[news] load data failed:', err);
      const grid = document.getElementById(GRID_ID);
      if (grid) grid.innerHTML = `<p class="muted">Failed to load updates.</p>`;
    }
  }

  // i18n 切換時重繪（文字會跟著語言變換）
  document.addEventListener('i18n:changed', () => {
    // 只需要重繪 chips 的「All」字串和卡片文字
    renderYearChips(rawItems.map(i => i.year));
    renderCards();
  });

  document.addEventListener('DOMContentLoaded', boot);
})();