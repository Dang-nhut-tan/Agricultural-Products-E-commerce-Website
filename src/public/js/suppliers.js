const supplierMatch = location.pathname.match(/^\/nha-cung-cap(?:\/(\d+))?$/);

if (supplierMatch) {
  const main = document.querySelector("main");
  const supplierId = supplierMatch[1];
  const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
  const initials = (name) => String(name || "NS").trim().split(/\s+/).slice(-2)
    .map((word) => word[0]).join("").toLocaleUpperCase("vi-VN");
  const productLabel = (count) => count
    ? `${count.toLocaleString("vi-VN")} sản phẩm đang bán`
    : "Chưa có sản phẩm";
  const logo = (supplier, large = false) => supplier.image
    ? `<img src="${safe(supplier.image)}" alt="Logo ${safe(supplier.name)}" loading="lazy">`
    : `<span class="supplier-avatar${large ? " is-large" : ""}" aria-hidden="true">${safe(initials(supplier.name))}</span>`;

  const listHero = `
    <header class="supplier-hero">
      <div class="supplier-hero-copy">
        <span class="supplier-kicker">Nguồn hàng được chọn lọc</span>
        <h1>Đồng hành cùng nhà cung cấp uy tín</h1>
        <p>Mỗi đối tác đều được giới thiệu rõ ràng để bạn dễ dàng chọn đúng nông sản và nguồn hàng phù hợp.</p>
      </div>
      <div class="supplier-hero-mark" aria-hidden="true">
        <span>✓</span><strong>Nguồn gốc<br>minh bạch</strong>
      </div>
    </header>`;
  const skeleton = `<div class="supplier-grid supplier-skeleton" aria-label="Đang tải nhà cung cấp">
    ${Array.from({ length: 3 }, () => '<div class="supplier-skeleton-card"><span></span><i></i><i></i></div>').join("")}
  </div>`;

  main.innerHTML = supplierId
    ? '<div class="page-loading" aria-live="polite">Đang tải nhà cung cấp…</div>'
    : `<section class="supplier-page container">${listHero}${skeleton}</section>`;

  fetch(`/api/brands${supplierId ? `/${supplierId}` : ""}`)
    .then((response) => {
      if (!response.ok) throw new Error("Không thể tải nhà cung cấp");
      return response.json();
    })
    .then(({ data }) => {
      if (!supplierId) {
        const suppliers = Array.isArray(data) ? data : [];
        const activeTotal = suppliers.reduce((total, supplier) => total
          + (supplier.Products || []).filter((product) => Number(product.status) === 1).length, 0);
        const cards = suppliers.length ? suppliers.map((supplier) => {
          const activeCount = (supplier.Products || []).filter((product) => Number(product.status) === 1).length;
          return `<a class="supplier-card" href="/nha-cung-cap/${supplier.id}">
            <div class="supplier-card-top">
              <div class="supplier-logo">${logo(supplier)}</div>
              <span class="supplier-verified"><i>✓</i> Đối tác cửa hàng</span>
            </div>
            <div class="supplier-body">
              <h2>${safe(supplier.name)}</h2>
              <p>${productLabel(activeCount)}</p>
              <span class="supplier-cta">Xem gian hàng <b aria-hidden="true">→</b></span>
            </div>
          </a>`;
        }).join("") : `<div class="supplier-state"><span aria-hidden="true">⌂</span><h2>Chưa có nhà cung cấp</h2><p>Các đối tác mới sẽ được cập nhật tại đây.</p></div>`;

        main.innerHTML = `<section class="supplier-page container">${listHero}
          <div class="supplier-section-head">
            <div><span>Danh sách đối tác</span><h2>Nhà cung cấp nổi bật</h2></div>
            <p><strong>${suppliers.length}</strong> nhà cung cấp · <strong>${activeTotal}</strong> sản phẩm</p>
          </div>
          <div class="supplier-grid">${cards}</div>
        </section>`;
        return;
      }

      const products = (data.Products || []).filter((product) => Number(product.status) !== 0);
      const productCards = products.map((product) => {
        const image = product.image || product.ProductImages?.[0]?.image || "";
        return `<article class="product">
          <a class="product-image ${image ? "" : "no-image"}" href="/san-pham/${product.id}" ${image ? `style="background-image:url('${safe(image)}')" role="img" aria-label="${safe(product.name)}"` : 'aria-label="Sản phẩm chưa có ảnh"'}>${image ? "" : '<span aria-hidden="true">▧</span>'}</a>
          <div class="product-info"><span class="product-cat">${safe(product.Category?.name || "Nông sản")}</span><h3><a href="/san-pham/${product.id}">${safe(product.name)}</a></h3><span class="price">${money(product.price)}</span></div>
        </article>`;
      }).join("");

      main.innerHTML = `<section class="supplier-page supplier-detail-page container">
        <a class="supplier-back" href="/nha-cung-cap"><span aria-hidden="true">←</span> Tất cả nhà cung cấp</a>
        <header class="supplier-profile">
          <div class="supplier-profile-logo">${logo(data, true)}</div>
          <div class="supplier-profile-copy">
            <span class="supplier-verified"><i>✓</i> Nhà cung cấp đã xác minh</span>
            <h1>${safe(data.name)}</h1>
            <p>Nông sản được cung cấp trực tiếp tại cửa hàng, thông tin giá và tồn kho luôn được cập nhật.</p>
          </div>
          <div class="supplier-profile-stat"><strong>${products.length}</strong><span>Sản phẩm<br>đang bán</span></div>
        </header>
        <div class="supplier-section-head supplier-products-head">
          <div><span>Sản phẩm của đối tác</span><h2>Chọn sản phẩm bạn cần</h2></div>
          <p>${productLabel(products.length)}</p>
        </div>
        <div class="product-grid">${productCards || '<div class="supplier-state"><span aria-hidden="true">⌂</span><h2>Chưa có sản phẩm đang bán</h2><p>Nhà cung cấp này chưa cập nhật sản phẩm.</p></div>'}</div>
      </section>`;
    })
    .catch(() => {
      main.innerHTML = `<section class="supplier-page container">${supplierId ? "" : listHero}<div class="supplier-state error"><span aria-hidden="true">!</span><h2>Chưa thể tải nhà cung cấp</h2><p>Vui lòng quay lại sau ít phút.</p></div></section>`;
    });
}
