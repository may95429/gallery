const CONFIG = {
  // 之後改成你的 Google Sheet / Apps Script JSON 網址
  settingsUrl: "https://script.google.com/macros/s/AKfycbzUHf9X22-ocvJh7ubifZ2_6tEGnIYEcPXrol74I2VY3xl6AvMGgu62cJg1r6RkSc_-/exec?action=settings",
  itemsUrl: "https://script.google.com/macros/s/AKfycbzUHf9X22-ocvJh7ubifZ2_6tEGnIYEcPXrol74I2VY3xl6AvMGgu62cJg1r6RkSc_-/exec?action=items"
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [settingsRows, itemRows] = await Promise.all([
      fetchJson(CONFIG.settingsUrl),
      fetchJson(CONFIG.itemsUrl)
    ]);

    const settings = arrayToSettingsObject(settingsRows);
    const items = normalizeItems(itemRows);

    applyGlobalSettings(settings);

    const page = document.body.dataset.page;

    if (page === "home") {
      renderHomePage(items);
    }

    if (page === "product") {
      renderProductPage(items);
    }
  } catch (error) {
    console.error("資料讀取失敗：", error);
    showLoadError();
  }
});

async function fetchJson(url) {
  if (!url || url.includes("YOUR_")) {
    throw new Error("請先在 CONFIG 中填入正確的 JSON 網址");
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`讀取失敗：${response.status}`);
  }

  return response.json();
}

function arrayToSettingsObject(rows) {
  const result = {};

  for (const row of rows) {
    const key = (row.key || "").trim();
    if (!key) continue;
    result[key] = row.value || "";
  }

  return result;
}

function normalizeItems(rows) {
  return rows
    .map((row) => ({
      id: Number(row.id) || 0,
      slug: safeText(row.slug),
      title: safeText(row.title),
      category: safeText(row.category),
      short_description: safeText(row.short_description),
      content: safeText(row.content),
      image_url: safeText(row.image_url),
      sub_images: safeText(row.sub_images),
      price: safeText(row.price),
      button_text: safeText(row.button_text) || "查看詳情",
      button_link: safeText(row.button_link),
      status: safeText(row.status).toLowerCase()
    }))
    .filter((item) => item.status === "on")
    .sort((a, b) => b.id - a.id);
}

function safeText(value) {
  return String(value || "").trim();
}

function applyGlobalSettings(settings) {
  setText("siteName", settings.site_name || "品牌名稱");
  setText("heroTitle", settings.hero_title || "首頁主標題");
  setText("heroSubtitle", settings.hero_subtitle || "首頁副標題");
  setText("aboutTitle", settings.about_title || "關於我們");
  setText("aboutContent", settings.about_content || "這裡顯示品牌介紹內容。");
  setText("contactPhone", settings.contact_phone || "-");
  setText("contactLine", settings.contact_line || "-");
  setText("contactEmail", settings.contact_email || "-");
  setText("footerText", settings.footer_text || "© 2026 品牌名稱 All Rights Reserved.");

  const heroButton = document.getElementById("heroButton");
  if (heroButton) {
    heroButton.textContent = settings.hero_button_text || "立即諮詢";
    heroButton.href = settings.hero_button_link || "#";
  }

  document.title = settings.site_name || document.title;
}

function renderHomePage(items) {
  const grid = document.getElementById("portfolioGrid");
  const emptyState = document.getElementById("emptyState");

  if (!grid) return;

  if (!items.length) {
    if (emptyState) emptyState.hidden = false;
    return;
  }

  const html = items
    .map((item) => {
      const detailUrl = `./product.html?slug=${encodeURIComponent(item.slug)}`;

      return `
        <article class="card">
          <div class="card-image">
            <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" loading="lazy">
          </div>
          <div class="card-body">
            <p class="card-category">${escapeHtml(item.category)}</p>
            <h3 class="card-title">${escapeHtml(item.title)}</h3>
            <p class="card-desc">${escapeHtml(item.short_description)}</p>
            <div class="card-actions">
              <a class="btn btn-primary" href="${detailUrl}">查看詳情</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  grid.innerHTML = html;
}

function renderProductPage(items) {
  const slug = new URLSearchParams(window.location.search).get("slug");
  const article = document.getElementById("productDetail");
  const notFound = document.getElementById("productNotFound");

  if (!slug) {
    if (notFound) notFound.hidden = false;
    return;
  }

  const item = items.find((row) => row.slug === slug);

  if (!item) {
    if (notFound) notFound.hidden = false;
    return;
  }

  if (article) article.hidden = false;

  setText("productCategory", item.category);
  setText("productTitle", item.title);
  setText("productShort", item.short_description);
  setText("productPrice", item.price ? `NT$ ${item.price}` : "");

  const image = document.getElementById("productImage");
  if (image) {
    image.src = item.image_url;
    image.alt = item.title;
  }

  const action = document.getElementById("productAction");
  if (action) {
    action.textContent = item.button_text || "立即詢問";
    action.href = item.button_link || "#";
    if (!item.button_link) {
      action.style.display = "none";
    }
  }

  const content = document.getElementById("productContent");
  if (content) {
    content.innerHTML = formatContent(item.content);
  }

  renderSubImages(item.sub_images);
  document.title = `${item.title}｜作品介紹`;
}

function renderSubImages(subImagesString) {
  const gallerySection = document.getElementById("gallerySection");
  const subImageGrid = document.getElementById("subImageGrid");

  if (!gallerySection || !subImageGrid) return;
  if (!subImagesString) return;

  const urls = subImagesString
    .split("|")
    .map((url) => url.trim())
    .filter(Boolean);

  if (!urls.length) return;

  gallerySection.hidden = false;
  subImageGrid.innerHTML = urls
    .map(
      (url, index) => `
        <img src="${escapeHtml(url)}" alt="補充圖片 ${index + 1}" loading="lazy">
      `
    )
    .join("");
}

function formatContent(text) {
  const safe = escapeHtml(text);
  return safe
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function showLoadError() {
  const homeGrid = document.getElementById("portfolioGrid");
  const notFound = document.getElementById("productNotFound");

  if (homeGrid) {
    homeGrid.innerHTML = `
      <div class="empty-state">
        目前無法讀取資料，請確認 JSON 網址是否正確。
      </div>
    `;
  }

  if (notFound) {
    notFound.hidden = false;
    notFound.textContent = "目前無法讀取資料，請確認 JSON 網址是否正確。";
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}