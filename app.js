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
      button_text: safeText(row.button_text) || "LINE諮詢",
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

  const filterButtons = document.querySelectorAll(
    ".portfolio-filter button"
  );

  if (!grid) return;

  let currentFilter = "all";

  function renderItems(filter) {

    let filteredItems = items;

    /* filter */

    if (filter !== "all") {

      filteredItems = items.filter((item) => {

        if (!item.category) return false;

        return item.category.includes(filter);

      });

    }

    /* empty */

    if (!filteredItems.length) {

      grid.innerHTML = "";

      if (emptyState) {
        emptyState.hidden = false;
      }

      return;

    }

    if (emptyState) {
      emptyState.hidden = true;
    }

    /* render */

    const html = filteredItems
      .map((item) => {

        return `
        
        <article class="portfolio-card">

          <a
            href="./product.html?slug=${item.slug}"
            class="portfolio-link"
          >

            <div class="portfolio-image">

              <img
                src="${item.image_url}"
                alt="${item.title}"
                loading="lazy"
              />

              <div class="portfolio-overlay">
                <span>VIEW PROJECT</span>
              </div>

            </div>

            <div class="portfolio-content">

              <div class="work-info">

                <h3 class="work-title">
                  ${item.title}
                </h3>

                <div class="work-meta">
                  <span class="work-category">
                    ${item.category}
                  </span>
                </div>

              </div>

            </div>

          </a>

        </article>

        `;

      })
      .join("");

    grid.innerHTML = html;

  }

  /* 初始 */

  renderItems(currentFilter);

  /* filter click */

  filterButtons.forEach((button) => {

    button.addEventListener("click", () => {

      /* active */

      filterButtons.forEach((btn) => {
        btn.classList.remove("active");
      });

      button.classList.add("active");

      /* current */

      currentFilter = button.dataset.filter;

      /* render */

      renderItems(currentFilter);

    });

  });

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

  const gallerySection =
    document.getElementById("gallerySection");

  const subImageGrid =
    document.getElementById("subImageGrid");

  const productImage =
    document.getElementById("productImage");

  if (!gallerySection || !subImageGrid) return;

  if (!subImagesString) return;

  /* split urls */

  const urls = subImagesString
    .split("|")
    .map((url) => url.trim())
    .filter(Boolean);

  if (!urls.length) return;

  /* show gallery */

  gallerySection.hidden = false;

  /* render */

  subImageGrid.innerHTML = urls
    .map(
      (img, index) => `
        <img
          src="${img}"
          alt="作品圖片 ${index + 1}"
          class="sub-thumb ${
            index === 0 ? "active" : ""
          }"
          data-image="${img}"
        />
      `
    )
    .join("");

  /* click switch image */

  const thumbs =
    document.querySelectorAll(".sub-thumb");

  thumbs.forEach((thumb) => {

    thumb.addEventListener("click", () => {

      /* fade out */

      productImage.style.opacity = 0;

      setTimeout(() => {

        /* switch image */

        productImage.src =
          thumb.dataset.image;

        /* fade in */

        productImage.style.opacity = 1;

      }, 150);

      /* active */

      thumbs.forEach((t) => {
        t.classList.remove("active");
      });

      thumb.classList.add("active");

    });

  });

}
const thumbs = document.querySelectorAll(".sub-thumb");

thumbs.forEach((thumb) => {
  thumb.addEventListener("click", () => {

    // 更換主圖
    productImage.src = thumb.dataset.image;

    // 移除 active
    thumbs.forEach((t) => {
      t.classList.remove("active");
    });

    // 加入 active
    thumb.classList.add("active");

  });
});

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
