// js/blog-index.js
(async function(){
  const lang = document.documentElement.lang || "en"; // 取 <html lang="...">
  const container = document.getElementById("blogGrid");
  if (!container) return;

  // JSON 路徑
  const url = `content/blog/index/index.${lang}.json`;

  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    const data = await res.json();

    // 設定標題與描述
    document.querySelector("[data-i18n='blog.title']").textContent = data.title;
    document.querySelector("[data-i18n='blog.lead']").textContent = data.lead;

    // 清空 & 渲染文章卡片
    container.innerHTML = "";
    data.items.forEach(post => {
      const card = document.createElement("article");
      card.className = "blog-card";
      card.innerHTML = `
        <img src="${post.cover}" alt="${post.title}" class="blog-cover"/>
        <div class="blog-content">
          <h2 class="blog-title">${post.title}</h2>
          <p class="blog-excerpt">${post.excerpt}</p>
          <div class="blog-meta">
            <span>${post.date}</span> · <span>${post.readingTime}</span>
          </div>
          <a class="btn-read" href="blog-post.html?slug=${post.slug}" data-i18n="blog.readMore">Read more</a>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("[Blog] Failed to load:", err);
    container.innerHTML = `<p>⚠ Failed to load blog posts.</p>`;
  }
})();