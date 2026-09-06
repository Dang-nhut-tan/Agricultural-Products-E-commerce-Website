const promotionMatch = location.pathname.match(/^\/khuyen-mai\/(\d+)$/);
const isPromotionIndex = location.pathname === "/khuyen-mai";

if (promotionMatch || isPromotionIndex) {
  const main = document.querySelector("main");
  const safe = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const safeImage = (value) => String(value || "").replace(/['"()]/g, encodeURIComponent);
  const money = (value) => Number(value || 0).toLocaleString("vi-VN") + " ₫";

  const renderPromotionList = (banners) => {
    main.innerHTML = `<section class="promotion-page container">
      <div class="promotion-heading"><span>KHUYẾN MÃI</span><h1>Chương trình đang diễn ra</h1><p>Chọn chương trình để xem các sản phẩm ưu đãi</p></div>
      <div class="promotion-list">${banners.map((banner) => {
        const count = (banner.BannerDetails || []).filter((item) => item.Product).length;
        return `<a class="promotion-card" href="/khuyen-mai/${banner.id}">
          <div class="promotion-card-image${banner.image ? "" : " no-image"}"${banner.image ? ` style="background-image:url('${safeImage(banner.image)}')"` : ""}>${banner.image ? "" : "KHUYẾN MÃI"}</div>
          <div><small>CHƯƠNG TRÌNH ƯU ĐÃI</small><h2>${safe(banner.name)}</h2><p>${count} sản phẩm · Xem ngay →</p></div>
        </a>`;
      }).join("") || '<div class="clean-empty"><h2>Hiện chưa có chương trình khuyến mãi</h2><a href="/san-pham">Xem sản phẩm</a></div>'}</div>
    </section>`;
  };

  const renderPromotionDetail = (banner) => {
    const products = (banner.BannerDetails || []).map((item) => item.Product).filter(Boolean);
    main.innerHTML = `<section class="promotion-page container"><div class="promotion-heading"><span>KHUYẾN MÃI</span><h1>${safe(banner.name)}</h1><p>${products.length} sản phẩm trong chương trình</p></div><div class="product-grid promotion-grid">${products.map((product) => {
      const image = product.image || product.ProductImages?.[0]?.image || "";
      return `<article class="product"><a class="product-image ${image ? "" : "no-image"}" href="/san-pham/${product.id}" ${image ? `style="background-image:url('${safeImage(image)}')"` : ""}>${image ? "" : "Chưa có ảnh"}</a><div class="product-info"><span class="product-cat">${safe(product.Category?.name || "")}</span><h3><a href="/san-pham/${product.id}">${safe(product.name)}</a></h3><span class="price">${money(product.price)}</span>${Number(product.oldprice) > Number(product.price) ? `<span class="old">${money(product.oldprice)}</span>` : ""}<button type="button" class="add" data-add="${product.id}">+</button><span class="stock">${product.quantity > 0 ? `Còn ${product.quantity} ${safe(product.unit || "")}` : "Tạm hết hàng"}</span></div></article>`;
    }).join("") || '<div class="clean-empty"><h2>Chương trình chưa có sản phẩm đang bán</h2></div>'}</div></section>`;
  };

  main.innerHTML = '<section class="promotion-page container"><div class="loading">Đang tải chương trình khuyến mãi…</div></section>';
  fetch(promotionMatch ? `/api/banners/${promotionMatch[1]}` : "/api/banners")
    .then((response) => {
      if (!response.ok) throw new Error();
      return response.json();
    })
    .then(({ data }) => promotionMatch ? renderPromotionDetail(data) : renderPromotionList(data || []))
    .catch(() => {
      main.innerHTML = '<div class="clean-empty"><h2>Không tải được chương trình khuyến mãi</h2><a href="/">Về trang chủ</a></div>';
    });
}
