if (location.pathname === "/") {
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
  const extras = document.createElement("div");
  extras.innerHTML = `<section class="home-steps"><div class="container"><div class="home-section-title"><span>MUA SẮM DỄ DÀNG</span><h2>Từ cửa hàng đến bàn ăn</h2></div><div class="step-grid"><article><i>01</i><div class="step-icon">⌕</div><h3>Chọn sản phẩm</h3><p>Tìm kiếm và xem đầy đủ thông tin sản phẩm đang có.</p></article><article><i>02</i><div class="step-icon">🛒</div><h3>Đặt hàng</h3><p>Thêm vào giỏ, chọn số lượng và phương thức thanh toán.</p></article><article><i>03</i><div class="step-icon">🚚</div><h3>Nhận hàng</h3><p>Theo dõi đơn hàng và nhận sản phẩm tại địa chỉ của bạn.</p></article></div></div></section><section class="home-suppliers" aria-labelledby="supplierTitle"><div class="container"><div class="home-section-title horizontal"><div><span>ĐỐI TÁC</span><h2 id="supplierTitle">Nhà cung cấp uy tín</h2></div><a href="/nha-cung-cap">Xem tất cả <span aria-hidden="true">→</span></a></div><div id="homeSupplierList" class="home-supplier-list"><div class="loading">Đang tải nhà cung cấp…</div></div></div></section><section class="home-newsletter" aria-labelledby="newsletterTitle"><div class="container newsletter-box"><div><span>NHẬN THÔNG TIN MỚI</span><h2 id="newsletterTitle">Nông sản mới mỗi tuần</h2><p>Nhận thông báo khi cửa hàng cập nhật sản phẩm và chương trình mới.</p></div><form id="homeSubscribe" novalidate><label for="homeSubscribeEmail">Email của bạn</label><div class="newsletter-controls"><input id="homeSubscribeEmail" name="email" type="email" autocomplete="email" required placeholder="ban@example.com"><button type="submit">Đăng ký</button></div><small id="subscribeMessage" role="status" aria-live="polite"></small></form></div></section>`;
  main.appendChild(extras);
  fetch("/api/brands")
    .then((response) => response.json())
    .then(({ data = [] }) => {
      document.querySelector("#homeSupplierList").innerHTML =
        data
          .slice(0, 4)
          .map(
            (brand) =>
              `<a href="/nha-cung-cap/${brand.id}" class="home-supplier"><div role="img" aria-label="Logo ${safe(brand.name)}" ${brand.image ? `style="background-image:url('${brand.image.replace(/'/g, "%27")}')"` : ""}>${brand.image ? "" : "NS"}</div><span>${safe(brand.name)}</span><b aria-hidden="true">→</b></a>`,
          )
          .join("") || "<p>Chưa có nhà cung cấp.</p>";
    });
  document.querySelector("#homeSubscribe").onsubmit = (event) => {
    event.preventDefault();
    const input = document.querySelector("#homeSubscribeEmail");
    const message = document.querySelector("#subscribeMessage");
    if (!input.validity.valid) {
      message.textContent = "Vui lòng nhập một địa chỉ email hợp lệ.";
      message.className = "error";
      input.focus();
      return;
    }
    message.textContent = "Cảm ơn bạn! Chúng tôi sẽ gửi tin mới đến email này.";
    message.className = "success";
    event.currentTarget.reset();
  };
}
