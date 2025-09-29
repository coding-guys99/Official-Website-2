// js/docs-index.js — Docs index renderer
(function () {
  const $grid = document.getElementById('docsGrid');

  async function render() {
    const dict = I18N.t('docs') || {};
    const items = Array.isArray(dict.items) ? dict.items : [];

    $grid.innerHTML = items.map(it => `
      <article class="news-card">
        <div class="news-meta">
          ${it.date ? `<time datetime="${it.date}">${it.date}</time>` : ''}
        </div>
        <h2>${it.title}</h2>
        ${it.excerpt ? `<p>${it.excerpt}</p>` : ''}
        <div class="actions">
          <a class="btn secondary" href="post.html?slug=${encodeURIComponent(it.slug)}&section=docs">
            ${dict.readmore || 'Read more'}
          </a>
        </div>
      </article>
    `).join('') || `<p style="opacity:.8">No docs yet.</p>`;
  }

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('i18n:changed', render);
})();