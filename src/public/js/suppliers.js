const supplierMatch = location.pathname.match(/^\/nha-cung-cap(?:\/(\d+))?$/);

if (supplierMatch) {
  const main = document.querySelector("main");
  const supplierId = supplierMatch[1];
  const safe = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
    );
  const money = (value) => Number(value || 0).toLocaleString("vi-VN") + " ₫";
  const initials = (name) => {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    return (words.length > 1 ? words.slice(-2) : words)
      .map((word) => word.charAt(0))
      .join("")
      .toLocaleUpperCase("vi-VN")
      .slice(0, 2) || "NS";
  };
  const productCountLabel = (count) => {
    if (!count) return "Chưa có sản phẩm";
    return `${count.toLocaleString("vi-VN")} sản phẩm đang bán`;
  };
  const listHeading = `
    <header class="supplier-heading">
      <span>ĐỐI TÁC CỦA CHÚNG TÔI</span>
      <h1>Nhà cung cấp</h1>
      <p>Khám phá các nhà cung cấp nông sản uy tín đồng hành cùng cửa hàng.</p>
    </header>`;
  const skeleton = `
    <div class="supplier-grid supplier-skeleton" aria-label="Đang tải nhà cung cấp">
      ${Array.from({ length: 3 }, () => '<div class="supplier-skeleton-card"><span></span><i></i><i></i></div>').join("")}
    </div>`;

  main.innerHTML = supplierId
    ? '<div class="page-loading" aria-live="polite">Đang tải nhà cung cấp…</div>'
    : `<section class="supplier-page container">${listHeading}${skeleton}</section>`;

  fetch(`/api/brands${supplierId ? `/${supplierId}` : ""}`)
    .then((response) => {
      if (!response.ok) throw new Error("Không thể tải nhà cung cấp");
      return response.json();
    })
    .then(({ data }) => {
      if (!supplierId) {
        const suppliers = Array.isArray(data) ? data : [];
        const content = suppliers.length
          ? `<div class="supplier-grid">${suppliers.map((supplier) => {
              const activeCount = (supplier.Products || []).filter((product) => Number(product.status) === 1).length;
              return `<a class="supplier-card" href="/nha-cung-cap/${supplier.id}" aria-label="Xem sản phẩm của ${safe(supplier.name)}">
                <div class="supplier-media">
                  ${supplier.image
                    ? `<img src="${safe(supplier.image)}" alt="Logo ${safe(supplier.name)}">`
                    : `<div class="supplier-placeholder" role="img" aria-label="${safe(supplier.name)} chưa có hình ảnh"><b>${safe(initials(supplier.name))}</b><small>Hình ảnh đang cập nhật</small></div>`}
                </div>
                <div class="supplier-body">
                  <h2 title="${safe(supplier.name)}">${safe(supplier.name)}</h2>
                  <p>${productCountLabel(activeCount)}</p>
                  <span class="supplier-cta">Xem sản phẩm <b aria-hidden="true">→</b></span>
                </div>
              </a>`;
            }).join("")}</div>`
          : `<div class="supplier-state"><span aria-hidden="true">⌂</span><h2>Chưa có nhà cung cấp</h2><p>Các đối tác mới sẽ được cập nhật tại đây.</p></div>`;

        main.innerHTML = `<section class="supplier-page container">${listHeading}${content}</section>`;
        return;
      }

      const products = data.Products || [];
      main.innerHTML = `<section class="supplier-page container">
        <header class="supplier-heading supplier-detail-heading">
          <a href="/nha-cung-cap">← Nhà cung cấp</a>
          <h1>${safe(data.name)}</h1>
          <p>${productCountLabel(products.length)}</p>
        </header>
        <div class="product-grid">${products.map((product) => {
          const image = product.image || product.ProductImages?.[0]?.image || "";
          return `<article class="product">
            <a class="product-image ${image ? "" : "no-image"}" href="/san-pham/${product.id}" ${image ? `style="background-image:url('${safe(image)}')" role="img" aria-label="${safe(product.name)}"` : 'aria-label="Sản phẩm chưa có ảnh"'}>${image ? "" : '<span aria-hidden="true">▧</span>'}</a>
            <div class="product-info"><span class="product-cat">${safe(product.Category?.name || "Nông sản")}</span><h3><a href="/san-pham/${product.id}">${safe(product.name)}</a></h3><span class="price">${money(product.price)}</span></div>
          </article>`;
        }).join("") || '<div class="supplier-state"><span aria-hidden="true">⌂</span><h2>Chưa có sản phẩm đang bán</h2><p>Nhà cung cấp này chưa cập nhật sản phẩm.</p></div>'}</div>
      </section>`;
    })
    .catch(() => {
      main.innerHTML = `<section class="supplier-page container">${supplierId ? "" : listHeading}<div class="supplier-state error"><span aria-hidden="true">!</span><h2>Chưa thể tải nhà cung cấp</h2><p>Vui lòng quay lại sau ít phút.</p></div></section>`;
    });
}
