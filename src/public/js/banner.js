if (location.pathname === "/") {
  const escapeHtml = (value) =>
    String(value || "").replace(
      /[&<>"']/g,
      (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
    );

  fetch("/api/banners")
    .then((response) => response.json())
    .then(({ data = [] }) => {
      const hero = document.querySelector(".hero");
      if (!hero || !data.length) return;

      let active = 0;
      const draw = () => {
        const banner = data[active];
        const products = (banner.BannerDetails || [])
          .map((item) => item.Product)
          .filter((item) => item && item.status === 1);
        const product = products[0];
        const productImage = product?.image || product?.ProductImages?.[0]?.image || "";
        const image = banner.image || productImage;
        const imageClass = banner.image
          ? "uses-banner-art"
          : productImage ? "has-product-image" : "no-product-image";
        const destination = products.length > 1
          ? `/khuyen-mai/${banner.id}`
          : product ? `/san-pham/${product.id}` : "/#products";

        hero.innerHTML = `<div class="container banner-wrap">
          <article class="store-banner ${imageClass}" data-banner-link="${destination}" role="link" tabindex="0" aria-label="${escapeHtml(banner.name)}">
            <div class="store-banner-content">
              <span class="banner-badge">ƯU ĐÃI TẠI NÔNG SẢN XANH</span>
              <h1>${escapeHtml(banner.name)}</h1>
              <p>${product ? `${escapeHtml(product.name)} được tuyển chọn kỹ, đóng gói cẩn thận và giao tận nhà.` : "Khám phá chương trình nổi bật và các sản phẩm đang có tại cửa hàng."}</p>
              <a class="banner-button" href="${destination}">Khám phá ngay <b aria-hidden="true">›</b></a>
            </div>
            <div class="banner-art" role="img" aria-label="${escapeHtml(banner.name)}" ${image ? `style="background-image:url('${image.replace(/'/g, "%27")}')"` : ""}></div>
          </article>
          ${data.length > 1 ? `<div class="banner-dots" aria-label="Chọn banner">${data.map((_, index) => `<button type="button" data-slide="${index}" class="${index === active ? "active" : ""}" aria-label="Xem banner ${index + 1}" ${index === active ? 'aria-current="true"' : ""}></button>`).join("")}</div>` : ""}
        </div>`;

        const bannerElement = hero.querySelector(".store-banner");
        bannerElement.onclick = (event) => {
          if (!event.target.closest("a")) location.href = bannerElement.dataset.bannerLink;
        };
        bannerElement.onkeydown = (event) => {
          if (event.key === "Enter") location.href = bannerElement.dataset.bannerLink;
        };
        hero.querySelectorAll("[data-slide]").forEach((button) => {
          button.onclick = () => {
            active = Number(button.dataset.slide);
            draw();
          };
        });
      };

      draw();
      if (data.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setInterval(() => {
          active = (active + 1) % data.length;
          draw();
        }, 5000);
      }
    })
    .catch((error) => console.error("Không thể tải banner:", error));
}
