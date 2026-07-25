const promotionPath = location.pathname;
const promotionMatch = promotionPath.match(/^\/khuyen-mai\/(\d+)$/);

if (promotionPath === "/khuyen-mai" || promotionMatch) {
  const main = document.querySelector("main");
  const safe = (value) =>
    String(value ?? "").replace(
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
  const money = (value) =>
    Number(value || 0).toLocaleString("vi-VN") + " ₫";
  const productImage = (product) =>
    product.image ||
    [...(product.ProductImages || [])].sort(
      (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0),
    )[0]?.image ||
    "";
  const salePercent = (product) =>
    Math.round(
      ((Number(product.oldprice) - Number(product.price)) /
        Number(product.oldprice)) *
        100,
    );

  function renderProducts(products, title, description) {
    state.products = products;
    main.innerHTML = `
      <section class="promotion-hero">
        <div class="container promotion-hero-inner">
          <div>
            <span class="promotion-kicker">ƯU ĐÃI TƯƠI NGON</span>
            <h1>${safe(title)}</h1>
            <p>${safe(description)}</p>
          </div>
          <div class="promotion-stat" aria-label="${products.length} sản phẩm đang giảm giá">
            <strong>${products.length}</strong>
            <span>sản phẩm<br>đang giảm giá</span>
          </div>
        </div>
      </section>
      <section class="promotion-page container">
        <div class="promotion-toolbar">
          <div>
            <span>KHUYẾN MÃI HÔM NAY</span>
            <h2>Chọn món ngon, nhận giá tốt</h2>
          </div>
          <p>Giá ưu đãi được cập nhật trực tiếp từ cửa hàng.</p>
        </div>
        <div class="product-grid promotion-grid">
          ${
            products
              .map((product) => {
                const image = productImage(product);
                const available = Number(product.quantity) > 0;
                return `
                  <article class="product promotion-card">
                    <a class="product-image ${image ? "" : "no-image"}" href="/san-pham/${product.id}"
                      ${image ? `style="background-image:url('${safe(image)}')" role="img"` : 'role="img" aria-label="Sản phẩm chưa có ảnh"'}>
                      ${image ? "" : '<span aria-hidden="true">♧</span>'}
                      <span class="discount-badge">-${salePercent(product)}%</span>
                    </a>
                    <div class="product-info">
                      <span class="product-cat">${safe(product.Category?.name || "Nông sản")}</span>
                      <h3><a href="/san-pham/${product.id}">${safe(product.name)}</a></h3>
                      <div class="promotion-prices">
                        <span class="price">${money(product.price)}</span>
                        <span class="old">${money(product.oldprice)}</span>
                      </div>
                      <div class="promotion-saving">Tiết kiệm ${money(Number(product.oldprice) - Number(product.price))}</div>
                      <button class="promotion-add" data-add="${product.id}" ${available ? "" : "disabled"}>
                        ${available ? "Thêm vào giỏ" : "Tạm hết hàng"}
                      </button>
                    </div>
                  </article>`;
              })
              .join("") ||
            `<div class="promotion-empty">
              <span aria-hidden="true">%</span>
              <h2>Chưa có sản phẩm khuyến mãi</h2>
              <p>Các ưu đãi mới sẽ sớm được cập nhật. Bạn có thể xem toàn bộ sản phẩm trong lúc chờ đợi.</p>
              <a href="/san-pham">Xem tất cả sản phẩm</a>
            </div>`
          }
        </div>
      </section>`;
  }

  main.innerHTML =
    '<section class="promotion-page container"><div class="loading">Đang tải sản phẩm khuyến mãi…</div></section>';

  const requestUrl = promotionMatch
    ? `/api/banners/${promotionMatch[1]}`
    : "/api/storefront/promotions";

  fetch(requestUrl)
    .then((response) => {
      if (!response.ok) throw new Error();
      return response.json();
    })
    .then((payload) => {
      if (promotionMatch) {
        const banner = payload.data;
        const products = (banner.BannerDetails || [])
          .map((item) => item.Product)
          .filter(
            (product) =>
              product &&
              Number(product.oldprice) > Number(product.price),
          );
        renderProducts(
          products,
          banner.name || "Khuyến mãi",
          "Những sản phẩm giá tốt trong chương trình này.",
        );
        return;
      }

      renderProducts(
        payload.products || [],
        "Giá tốt mỗi ngày",
        "Tổng hợp các sản phẩm có giá hiện tại thấp hơn giá ban đầu.",
      );
    })
    .catch(() => {
      main.innerHTML = `<div class="clean-empty">
        <h2>Chưa thể tải chương trình khuyến mãi</h2>
        <p>Vui lòng thử lại sau.</p>
        <a href="/">Về trang chủ</a>
      </div>`;
    });
}
