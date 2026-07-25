const promotionMatch = location.pathname.match(/^\/khuyen-mai\/(\d+)$/);
if (promotionMatch) {
  const main = document.querySelector("main");
  const safe = (value) =>
    String(value || "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const money = (value) => Number(value || 0).toLocaleString("vi-VN") + " ₫";
  main.innerHTML =
    '<section class="promotion-page container"><div class="loading">Đang tải sản phẩm khuyến mãi…</div></section>';
  fetch("/api/banners/" + promotionMatch[1])
    .then((response) => {
      if (!response.ok) throw new Error();
      return response.json();
    })
    .then(({ data: banner }) => {
      const products = (banner.BannerDetails || [])
        .map((item) => item.Product)
        .filter(Boolean);
      main.innerHTML = `<section class="promotion-page container"><div class="promotion-heading"><span>KHUYẾN MÃI</span><h1>${safe(banner.name)}</h1><p>${products.length} sản phẩm trong chương trình</p></div><div class="product-grid promotion-grid">${
        products
          .map((product) => {
            const image =
              product.image || product.ProductImages?.[0]?.image || "";
            return `<article class="product"><div class="product-image ${image ? "" : "no-image"}" ${image ? `style="background-image:url('${image.replace(/'/g, "%27")}')"` : ""}>${image ? "" : "Chưa có ảnh"}</div><div class="product-info"><span class="product-cat">${safe(product.Category?.name || "")}</span><h3>${safe(product.name)}</h3><span class="price">${money(product.price)}</span>${Number(product.oldprice) > Number(product.price) ? `<span class="old">${money(product.oldprice)}</span>` : ""}<button class="add" data-add="${product.id}">+</button><span class="stock">${product.quantity > 0 ? `Còn ${product.quantity} ${safe(product.unit || "")}` : "Tạm hết hàng"}</span></div></article>`;
          })
          .join("") ||
        '<div class="clean-empty"><h2>Chương trình chưa có sản phẩm đang bán</h2></div>'
      }</div></section>`;
    })
    .catch(() => {
      main.innerHTML =
        '<div class="clean-empty"><h2>Không tìm thấy chương trình</h2><a href="/">Về trang chủ</a></div>';
    });
}
