const productPath = location.pathname.match(/^\/san-pham\/(\d+)$/);

document.addEventListener("click", (event) => {
  const card = event.target.closest(".product");
  if (card && !event.target.closest("[data-add]")) {
    const id = card.querySelector("[data-add]")?.dataset.add;
    if (id) location.href = `/san-pham/${id}`;
  }
});

if (productPath) {
  const productId = productPath[1];
  const main = document.querySelector("main");
  const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
  const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
  const date = (value) => value ? new Date(value).toLocaleDateString("vi-VN") : "Đang cập nhật";
  let currentUser = null;
  let comments = [];
  let editingCommentId = null;

  const request = async (url, options) => {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Không thể thực hiện yêu cầu.");
    return payload;
  };

  const renderComments = () => {
    const list = document.querySelector("#productComments");
    const formBox = document.querySelector("#commentFormBox");
    if (!list || !formBox) return;

    const rating = comments.length
      ? (comments.reduce((total, comment) => total + Number(comment.star), 0) / comments.length).toFixed(1)
      : "Chưa có";
    const ratingElement = document.querySelector("#commentRating");
    const countElement = document.querySelector("#commentCount");
    const scoreElement = document.querySelector("#commentScore");
    if (ratingElement) ratingElement.textContent = rating;
    if (countElement) countElement.textContent = comments.length;
    if (scoreElement) scoreElement.textContent = comments.length ? `${rating}/5 ★` : rating;

    list.innerHTML = comments.length ? comments.map((comment) => {
      const isOwner = Number(comment.user_id) === Number(currentUser?.id);
      const canDelete = isOwner || Number(currentUser?.role) === 1;
      return `<article class="comment-card">
        <div class="comment-avatar">${comment.User?.avatar ? `<img src="${safe(comment.User.avatar)}" alt="">` : safe((comment.User?.name || "K").charAt(0).toUpperCase())}</div>
        <div class="comment-content">
          <div class="comment-head"><b>${safe(comment.User?.name || "Khách hàng")}</b><span>${"★".repeat(comment.star)}${"☆".repeat(5 - comment.star)}</span><time>${date(comment.createdAt)}</time></div>
          <p>${safe(comment.content)}</p>
          ${isOwner ? `<button class="comment-link" data-edit-comment="${comment.id}">Sửa</button>` : ""}
          ${canDelete ? `<button class="comment-link danger" data-delete-comment="${comment.id}">Xóa</button>` : ""}
        </div>
      </article>`;
    }).join("") : '<div class="comment-empty">Chưa có bình luận. Hãy là người đầu tiên chia sẻ cảm nhận.</div>';

    if (!currentUser) {
      formBox.innerHTML = '<p class="comment-login"><a href="/dang-nhap">Đăng nhập</a> để bình luận sản phẩm.</p>';
      return;
    }

    const editingComment = comments.find((comment) =>
      Number(comment.id) === Number(editingCommentId)
      && Number(comment.user_id) === Number(currentUser.id)
    );
    formBox.innerHTML = `<form id="commentForm" data-comment-id="${editingComment?.id || ""}">
      <h3>${editingComment ? "Chỉnh sửa bình luận" : "Viết bình luận"}</h3>
      <label>Đánh giá
        <select name="star" required>${[5, 4, 3, 2, 1].map((star) => `<option value="${star}" ${Number(editingComment?.star || 5) === star ? "selected" : ""}>${star} sao</option>`).join("")}</select>
      </label>
      <label>Nội dung<textarea name="content" minlength="2" maxlength="1000" required placeholder="Chia sẻ cảm nhận của bạn...">${safe(editingComment?.content || "")}</textarea></label>
      <div class="comment-form-actions"><button type="submit">${editingComment ? "Lưu thay đổi" : "Gửi bình luận"}</button>${editingComment ? '<button type="button" class="comment-cancel" data-cancel-edit>Hủy</button>' : ""}</div>
      <small id="commentMessage"></small>
    </form>`;
  };

  const loadComments = async () => {
    const payload = await request(`/api/products/${productId}/comments`);
    comments = payload.data || [];
    renderComments();
  };

  main.innerHTML = '<div class="loading">Đang tải chi tiết sản phẩm…</div>';
  Promise.all([
    request(`/api/products/${productId}`),
    request(`/api/products/${productId}/comments`),
    request("/api/auth/me").then(({ data }) => data).catch(() => null),
  ]).then(([{ data: product }, commentPayload, user]) => {
    currentUser = user;
    comments = commentPayload.data || [];
    const images = [product.image, ...(product.ProductImages || []).map((image) => image.image)].filter((image, index, all) => image && all.indexOf(image) === index);
    const batches = product.ProductBatches || [];
    const rating = comments.length ? (comments.reduce((total, comment) => total + Number(comment.star), 0) / comments.length).toFixed(1) : "Chưa có";

    main.innerHTML = `<section class="commerce-detail container">
      <div class="commerce-breadcrumb"><a href="/">Trang chủ</a> › <a href="/san-pham">Sản phẩm</a> › ${safe(product.Category?.name || "")} › ${safe(product.name)}</div>
      <div class="commerce-top">
        <div class="commerce-gallery"><div id="commerceMain" class="commerce-main" ${images[0] ? `style="background-image:url('${safe(images[0])}')"` : ""}>${images.length ? "" : "Chưa có ảnh"}</div><div class="commerce-thumbs">${images.map((image, index) => `<button class="${index ? "" : "active"}" data-commerce-image="${safe(image)}" style="background-image:url('${safe(image)}')"></button>`).join("")}</div></div>
        <div class="commerce-info"><h1>${safe(product.name)}</h1><div class="commerce-stats"><span><b id="commentRating">${rating}</b> ${comments.length ? "★" : "đánh giá"}</span><span><b id="commentCount">${comments.length}</b> bình luận</span><span>Đã bán <b>${product.sold_count || 0}</b></span></div><div class="commerce-price">${money(product.price)}${Number(product.oldprice) > Number(product.price) ? `<del>${money(product.oldprice)}</del>` : ""}</div><div class="commerce-row"><label>Vận chuyển</label><div><b>🚚 Giao hàng tận nơi</b><small>Phí vận chuyển được xác nhận khi đặt hàng.</small></div></div><div class="commerce-row"><label>Nguồn gốc</label><div>${safe(product.origin || "Đang cập nhật")}</div></div><div class="commerce-row"><label>Nhà cung cấp</label><div>${safe(product.Brand?.name || "Đang cập nhật")}</div></div><div class="commerce-row"><label>Tình trạng</label><div class="${product.quantity > 0 ? "in-stock" : "out-stock"}">${product.quantity > 0 ? `Còn ${product.quantity} đơn vị` : "Tạm hết hàng"}</div></div><div class="commerce-row"><label>Số lượng</label><div class="commerce-buy"><input id="commerceQty" type="number" min="1" max="${product.quantity}" value="1"><button id="commerceAdd" ${product.quantity <= 0 ? "disabled" : ""}>${product.quantity > 0 ? "Thêm vào giỏ hàng" : "Tạm hết hàng"}</button></div></div></div>
      </div>
      <div class="commerce-spec"><h2>CHI TIẾT SẢN PHẨM</h2><dl><dt>Danh mục</dt><dd>${safe(product.Category?.name || "Đang cập nhật")}</dd><dt>Sản phẩm còn lại</dt><dd>${product.quantity > 0 ? `${product.quantity} đơn vị` : "Hết hàng"}</dd><dt>Đơn vị đóng gói</dt><dd>${safe(product.unit || "Đang cập nhật")}</dd><dt>Nhà cung cấp</dt><dd>${safe(product.Brand?.name || "Đang cập nhật")}</dd><dt>Xuất xứ</dt><dd>${safe(product.origin || "Đang cập nhật")}</dd>${batches[0] ? `<dt>Ngày thu hoạch</dt><dd>${date(batches[0].harvest_date)}</dd><dt>Hạn sử dụng</dt><dd>${date(batches[0].expiry_date)}</dd>` : ""}</dl></div>
      <div class="commerce-description"><h2>MÔ TẢ SẢN PHẨM</h2><div>${safe(product.description || "Nội dung đang được cập nhật.")}</div>${product.specification ? `<h2>THÔNG SỐ</h2><div>${safe(product.specification)}</div>` : ""}</div>
      <section class="product-comments"><div class="comment-title"><div><span>Ý KIẾN KHÁCH HÀNG</span><h2>Bình luận sản phẩm</h2></div><b id="commentScore">${rating}${comments.length ? "/5 ★" : ""}</b></div><div id="commentFormBox"></div><div id="productComments"></div></section>
    </section>`;

    renderComments();
    document.querySelectorAll("[data-commerce-image]").forEach((button) => {
      button.onclick = () => {
        document.querySelector("#commerceMain").style.backgroundImage = `url('${button.dataset.commerceImage}')`;
        document.querySelectorAll("[data-commerce-image]").forEach((item) => item.classList.toggle("active", item === button));
      };
    });
    const add = document.querySelector("#commerceAdd");
    if (add) add.onclick = () => {
      const quantity = Math.max(1, Number(document.querySelector("#commerceQty").value) || 1);
      const cart = JSON.parse(localStorage.getItem("nong-san-cart") || "[]");
      const existing = cart.find((item) => item.id === product.id);
      if (existing) existing.qty += quantity;
      else cart.push({ id: product.id, name: product.name, price: Number(product.price), image: images[0] || "", qty: quantity });
      localStorage.setItem("nong-san-cart", JSON.stringify(cart));
      location.reload();
    };
  }).catch(() => {
    main.innerHTML = '<div class="clean-empty"><h2>Không tìm thấy sản phẩm</h2><a href="/">Về trang chủ</a></div>';
  });

  document.addEventListener("submit", async (event) => {
    if (event.target.id !== "commentForm") return;
    event.preventDefault();
    const form = event.target;
    const message = form.querySelector("#commentMessage");
    const commentId = form.dataset.commentId;
    try {
      message.textContent = "Đang lưu…";
      await request(`/api/products/${productId}/comments${commentId ? `/${commentId}` : ""}`, {
        method: commentId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ star: Number(form.star.value), content: form.content.value }),
      });
      editingCommentId = null;
      await loadComments();
    } catch (error) {
      message.textContent = error.message;
    }
  });

  document.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-comment]");
    if (editButton) {
      editingCommentId = Number(editButton.dataset.editComment);
      renderComments();
      const form = document.querySelector("#commentForm");
      form?.content.focus();
      document.querySelector("#commentFormBox")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (event.target.closest("[data-cancel-edit]")) {
      editingCommentId = null;
      renderComments();
      return;
    }
    const deleteButton = event.target.closest("[data-delete-comment]");
    if (!deleteButton || !confirm("Bạn có chắc muốn xóa bình luận này?")) return;
    try {
      await request(`/api/products/${productId}/comments/${deleteButton.dataset.deleteComment}`, { method: "DELETE" });
      if (Number(editingCommentId) === Number(deleteButton.dataset.deleteComment)) editingCommentId = null;
      await loadComments();
    } catch (error) {
      alert(error.message);
    }
  });
}
