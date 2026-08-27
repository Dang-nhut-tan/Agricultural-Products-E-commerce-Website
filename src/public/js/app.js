const initialParams = new URLSearchParams(location.search);
const state = {
  products: [],
  categories: [],
  page: 1,
  totalPages: 1,
  category: initialParams.get("category") || "all",
  search: initialParams.get("search") || "",
  cart: JSON.parse(localStorage.getItem("nong-san-cart") || "[]"),
};
const $ = (s) =>
    document.querySelector(s) ||
    (s === "#categories"
      ? Object.assign(document.createElement("div"), { hidden: true })
      : null),
  money = (n) => Number(n || 0).toLocaleString("vi-VN") + " ₫";
const safe = (s) =>
  String(s ?? "").replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
const productImage = (p) =>
  p.image ||
  p.ProductImages?.sort((a, b) => a.sort_order - b.sort_order)[0]?.image ||
  "";
const productUnit = (value) =>
  String(value || "sản phẩm").trim().replace(/^1\s+(?=\S)/, "") || "sản phẩm";
function applyCategoryImages() {
  document.querySelectorAll(".category[data-cat]").forEach((card) => {
    const category = state.categories.find(
      (item) => item.id == card.dataset.cat,
    );
    const box = card.querySelector(".category-image");
    if (!box || !category) return;
    if (category.image) {
      box.textContent = "";
      box.style.backgroundImage = `url("${category.image.replace(/"/g, "%22")}")`;
      box.style.backgroundSize = "cover";
      box.style.backgroundPosition = "center";
      box.classList.remove("no-image");
    } else {
      box.innerHTML =
        '<span class="category-placeholder-icon" aria-hidden="true">♧</span><small>Hình ảnh đang cập nhật</small>';
      box.style.backgroundImage = "none";
      box.classList.add("no-image");
    }
  });
}
const categoryObserver = new MutationObserver(() => {
  categoryObserver.disconnect();
  applyCategoryImages();
  categoryObserver.observe(document.body, { childList: true, subtree: true });
});
categoryObserver.observe(document.body, { childList: true, subtree: true });
function renderRoute() {
  const path = location.pathname;
  if (path === "/") return "home";
  const main = document.querySelector("main");
  const title = (name) =>
    `<section class="page-title"><div class="container"><span class="breadcrumbs"><a href="/">Trang chủ</a> / ${name}</span><h1>${name}</h1></div></section>`;
  if (path === "/dang-nhap" || path === "/dang-ky") {
    return "auth";
  }
  if (path === "/thanh-toan") {
    main.innerHTML =
      title("Thanh toán") +
      `<section class="page-shell checkout-page"><div class="container checkout-grid">
        <div class="panel checkout-panel">
          <div class="checkout-heading"><span>1</span><div><h2>Địa chỉ nhận hàng</h2><p>Chọn nơi bạn muốn nhận đơn</p></div></div>
          <div id="checkoutAddresses"><p>Đang tải địa chỉ…</p></div>
        </div>
        <div class="panel checkout-panel">
          <div class="checkout-heading"><span>2</span><div><h2>Đơn hàng của bạn</h2><p>Kiểm tra sản phẩm trước khi thanh toán</p></div></div>
          <div id="checkoutItems"></div>
          <div class="checkout-total"><span>Tổng cộng</span><strong id="checkoutTotal">0 ₫</strong></div>
          <div class="payment-title"><b>Phương thức thanh toán</b><small>Giao dịch được xử lý an toàn</small></div>
          <div class="payment-methods paypal-only" aria-label="Phương thức thanh toán">
            <div class="payment-method active">
              <span class="payment-radio"></span><span class="payment-logo paypal-word">PayPal</span>
              <small>Thẻ quốc tế hoặc tài khoản PayPal</small>
            </div>
          </div>
          ${state.cart.some((item) => item.type === "combo") ? '<p class="checkout-rate-note"><b>✓ Miễn phí giao hàng</b> vì đơn có Combo nhà hàng.</p>' : ""}
          <div id="paypalPaymentPanel" class="payment-panel active">
            <p class="checkout-rate-note">Số tiền được quy đổi sang USD theo tỷ giá của cửa hàng.</p>
            <div id="paypalButtons"></div>
          </div>
          <p id="checkoutMessage" class="checkout-message" role="status"></p>
        </div>
      </div></section>`;
    setupPaypalCheckout();
    return "checkout";
  }
  if (path === "/gio-hang") {
    main.innerHTML = `<section class="cart-page-shell"><div class="container cart-page-container">
      <div class="cart-page-header"><div><span>Đơn hàng của bạn</span><h1>Giỏ hàng</h1><p>Kiểm tra sản phẩm và điều chỉnh số lượng trước khi thanh toán.</p></div><a href="/san-pham">← Tiếp tục mua sắm</a></div>
      <div id="cartPageContent"></div>
    </div></section>`;
    renderCartPage();
    return "cart";
  }
  if (path === "/don-hang" || /^\/don-hang\/\d+$/.test(path)) {
    const orderId = path.split("/")[2];
    main.innerHTML = title(orderId ? `Đơn hàng #${safe(orderId)}` : "Lịch sử mua hàng") +
      `<section class="page-shell orders-page"><div class="container"><div id="ordersContent"><div class="panel orders-loading">Đang tải đơn hàng…</div></div></div></section>`;
    loadOrders(orderId);
    return "orders";
  }
  const pages = {
    "/tai-khoan": [
      "Tài khoản của tôi",
      "Quản lý thông tin cá nhân, địa chỉ nhận hàng và mật khẩu.",
    ],
    "/gioi-thieu": [
      "Về Nông Sản Xanh",
      "Chúng tôi kết nối nông sản có nguồn gốc rõ ràng với gia đình Việt.",
    ],
  };
  const page = pages[path] || [
    "Không tìm thấy trang",
    "Trang bạn yêu cầu không tồn tại.",
  ];
  main.innerHTML =
    title(page[0]) +
    `<section class="page-shell"><div class="container"><div class="panel empty-page"><h2>${page[0]}</h2><p>${page[1]}</p><div class="page-actions"><a class="primary" href="/san-pham">Xem sản phẩm</a></div></div></div></section>`;
  return "static";
}

const orderStatuses={0:["Đã nhận đơn","pending"],1:["Đang chuẩn bị đơn","paid"],2:["Đã giao cho đơn vị vận chuyển","processing"],3:["Đang giao","shipping"],4:["Hoàn thành","completed"],5:["Đã hủy","cancelled"]};
const orderStatus=(value)=>orderStatuses[Number(value)]||["Không xác định","pending"];
const orderDate=(value)=>new Date(value).toLocaleString("vi-VN");
async function loadOrders(orderId){
  const box=document.querySelector("#ordersContent"); if(!box)return;
  try{
    const response=await fetch(`/api/orders${orderId?`/${orderId}`:""}`),result=await response.json();
    if(response.status===401){box.innerHTML='<div class="panel orders-empty"><h2>Bạn chưa đăng nhập</h2><a class="primary" href="/dang-nhap">Đăng nhập</a></div>';return}
    if(!response.ok)throw new Error(result.message||"Không thể tải đơn hàng.");
    orderId?renderOrderDetail(result.data,box):renderOrderList(result.data||[],box);
  }catch(error){box.innerHTML=`<div class="panel orders-empty"><h2>Không thể tải đơn hàng</h2><p>${safe(error.message)}</p></div>`}
}
function renderOrderList(orders,box){
  if(!orders.length){box.innerHTML='<div class="panel orders-empty"><h2>Bạn chưa có đơn hàng</h2><p>Các đơn đã đặt sẽ xuất hiện tại đây.</p><a class="primary" href="/san-pham">Mua sắm ngay</a></div>';return}
  box.innerHTML=`<div class="orders-toolbar"><div><h2>Đơn hàng của tôi</h2><p>${orders.length} đơn hàng</p></div><a href="/san-pham">Tiếp tục mua sắm</a></div><div class="order-list">${orders.map(order=>{const status=orderStatus(order.status),count=(order.OrderDetails||[]).reduce((sum,item)=>sum+Number(item.quantity),0);return `<a class="order-card" href="/don-hang/${order.id}"><div class="order-card-head"><div><b>Đơn hàng #${order.id}</b><small>${orderDate(order.createdAt)}</small></div><span class="order-status ${status[1]}">${status[0]}</span></div><div class="order-card-body"><span>${count} sản phẩm · ${safe(order.Payment?.method||"Chưa thanh toán")}</span><strong>${money(order.total)}</strong></div><div class="order-card-foot">Xem chi tiết <span>→</span></div></a>`}).join("")}</div>`;
}
function renderOrderDetail(order,box){
  const status=orderStatus(order.status),histories=order.OrderHistories||[],shipment=order.Shipment;
  const previousCombos=[...(order.OrderDetails||[]).reduce((map,item)=>{if(item.combo_id&&!map.has(item.combo_id))map.set(item.combo_id,{id:item.combo_id,name:item.combo_name,quantity:item.combo_quantity||1});return map},new Map()).values()];
  if(previousCombos.length) queueMicrotask(()=>{
    const host=box.querySelector(".order-detail-main");
    host?.insertAdjacentHTML("beforeend",`<div class="order-totals"><b>Mua lại combo</b>${previousCombos.map(combo=>`<button type="button" class="primary" data-rebuy-combo="${combo.id}" data-rebuy-quantity="${combo.quantity}">${safe(combo.name)} · Mua lại</button>`).join("")}</div>`);
    host?.querySelectorAll("[data-rebuy-combo]").forEach(button=>button.addEventListener("click",async()=>{
      const response=await fetch(`/api/combos/${button.dataset.rebuyCombo}`),result=await response.json();
      if(!response.ok)return alert(result.message||"Combo hiện không còn đủ hàng.");
      const combo=result.data,cart=JSON.parse(localStorage.getItem("nong-san-cart")||"[]"),quantity=Math.max(Number(button.dataset.rebuyQuantity||1),Number(combo.minimum_quantity||1));
      const existing=cart.find(item=>item.type==="combo"&&Number(item.comboId)===Number(combo.id));
      if(existing)existing.qty+=quantity;else cart.push({id:`combo-${combo.id}`,comboId:combo.id,type:"combo",name:combo.name,price:combo.comboPrice,image:combo.image||"",minimumQuantity:combo.minimum_quantity,qty:quantity,freeShipping:true});
      localStorage.setItem("nong-san-cart",JSON.stringify(cart));button.textContent="Đã thêm lại ✓";
    }));
  });
  box.innerHTML=`<div class="order-detail-grid"><div class="panel order-detail-main"><div class="order-detail-head"><div><a href="/don-hang">← Lịch sử mua hàng</a><h2>Đơn hàng #${order.id}</h2><small>${orderDate(order.createdAt)}</small></div><span class="order-status ${status[1]}">${status[0]}</span></div><div class="order-products">${(order.OrderDetails||[]).map(item=>`<div class="order-product"><div class="order-product-image"${item.Product?.image?` style="background-image:url('${safe(item.Product.image)}')"`:""}></div><div><b>${safe(item.product_name)}</b><small>${item.quantity} × ${money(item.price)}</small></div><strong>${money(Number(item.price)*Number(item.quantity))}</strong></div>`).join("")}</div><div class="order-totals"><span>Tạm tính <b>${money(order.subtotal)}</b></span><span>Phí giao hàng <b>${money(order.shipping_fee)}</b></span><span class="grand">Tổng cộng <b>${money(order.total)}</b></span></div></div><aside class="panel order-timeline"><h3>Trạng thái đơn hàng</h3><div class="timeline"><div class="timeline-item active"><i></i><div><b>Đã tạo đơn</b><small>${orderDate(order.createdAt)}</small></div></div>${histories.map(item=>`<div class="timeline-item active"><i></i><div><b>${orderStatus(item.to_status)[0]}</b><small>${orderDate(item.createdAt)}${item.reason?` · ${safe(item.reason)}`:""}</small></div></div>`).join("")}</div><div class="payment-summary"><span>Thanh toán</span><b>${safe(order.Payment?.method||"Chưa thanh toán")}</b></div>${[0,1].includes(Number(order.status))?`<button class="cancel-order" data-cancel-order="${order.id}">Hủy đơn hàng</button>`:""}</aside></div>`;
  if(shipment) box.querySelector(".payment-summary")?.insertAdjacentHTML("afterend",`<div class="shipment-summary"><h4>Thông tin vận chuyển</h4><p><b>${safe(shipment.receiver_name)}</b> · ${safe(shipment.phone)}</p><p>${safe([shipment.address,shipment.ward,shipment.district,shipment.province].filter(Boolean).join(", "))}</p>${shipment.tracking_code?`<p>Mã vận đơn: <strong>${safe(shipment.tracking_code)}</strong></p>`:""}${shipment.delivery_time?`<p>Giao lúc: ${orderDate(shipment.delivery_time)}</p>`:""}</div>`);
  box.querySelector("[data-cancel-order]")?.addEventListener("click",async(event)=>{if(!confirm("Bạn chắc chắn muốn hủy đơn hàng này?"))return;event.currentTarget.disabled=true;const response=await fetch(`/api/orders/${order.id}/cancel`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:"Khách hàng hủy từ lịch sử mua hàng"})}),result=await response.json();if(!response.ok){alert(result.message||"Không thể hủy đơn hàng.");event.currentTarget.disabled=false;return}loadOrders(order.id)});
}
async function setupPaypalCheckout() {
  const itemsBox = document.querySelector("#checkoutItems");
  const addressesBox = document.querySelector("#checkoutAddresses");
  const messageBox = document.querySelector("#checkoutMessage");
  const paypalBox = document.querySelector("#paypalButtons");
  const totalBox = document.querySelector("#checkoutTotal");
  if (!itemsBox || !addressesBox || !messageBox || !paypalBox || !totalBox) return;
  const total = state.cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);

  itemsBox.innerHTML = state.cart.length
    ? state.cart.map((item) =>
      `<div class="checkout-item"><span>${safe(item.name)} × ${Number(item.qty)}</span><b>${money(Number(item.price) * Number(item.qty))}</b></div>`
    ).join("")
    : "<p>Giỏ hàng đang trống.</p>";
  totalBox.textContent = money(total);
  if (!state.cart.length) return;

  try {
    const [meResponse, addressesResponse, configResponse] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/auth/addresses"),
      fetch("/api/payments/paypal/config"),
    ]);
    if (!meResponse.ok) {
      addressesBox.innerHTML = '<p>Bạn cần đăng nhập trước khi thanh toán.</p><a class="primary" href="/dang-nhap">Đăng nhập</a>';
      return;
    }
    if (!addressesResponse.ok || !configResponse.ok) throw new Error("Không thể tải thông tin thanh toán.");
    const addresses = (await addressesResponse.json()).data || [];
    const config = await configResponse.json();
    const shippingFee = state.cart.some((item) => item.type === "combo") ? 0 : Number(config.standardShippingFee || 0);
    total += shippingFee;
    totalBox.textContent = money(total);
    if (!addresses.length) {
      addressesBox.innerHTML = '<p>Bạn chưa có địa chỉ nhận hàng. Hãy thêm địa chỉ trong trang tài khoản.</p><a class="primary" href="/tai-khoan">Thêm địa chỉ</a>';
      return;
    }
    addressesBox.innerHTML = addresses.map((address, index) =>
      `<label class="checkout-address">
        <input type="radio" name="checkoutAddress" value="${address.id}" ${address.is_default || index === 0 ? "checked" : ""}>
        <span><b>${safe(address.receiver_name)}</b> · ${safe(address.phone)}<small>${safe([address.address, address.ward, address.district, address.province].filter(Boolean).join(", "))}</small></span>
      </label>`
    ).join("");
    if (!config.enabled || !config.clientId) {
      paypalBox.innerHTML = "<p>PayPal chưa được cấu hình trên máy chủ.</p>";
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.clientId)}&currency=USD&intent=capture`;
    script.onload = () => window.paypal.Buttons({
      createOrder: async () => {
        messageBox.textContent = "";
        const addressId = document.querySelector('input[name="checkoutAddress"]:checked')?.value;
        const response = await fetch("/api/payments/paypal/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            addressId,
            items: state.cart.map((item) => item.type === "combo"
              ? { type: "combo", comboId: item.comboId, quantity: item.qty }
              : { type: "product", id: item.id, quantity: item.qty }),
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Không thể tạo giao dịch PayPal.");
        return data.id;
      },
      onApprove: async (data) => {
        const response = await fetch(`/api/payments/paypal/orders/${encodeURIComponent(data.orderID)}/capture`, { method: "POST" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Không thể xác nhận thanh toán.");
        state.cart = [];
        renderCart();
        messageBox.classList.add("success");
        messageBox.textContent = `${result.message} Mã đơn hàng: #${result.orderId}`;
        setTimeout(() => { location.href = `/don-hang/${result.orderId}`; }, 1200);
      },
      onError: (error) => {
        messageBox.classList.remove("success");
        messageBox.textContent = error.message || "Thanh toán PayPal không thành công.";
      },
      onCancel: () => { messageBox.textContent = "Bạn đã hủy thanh toán PayPal."; },
    }).render("#paypalButtons");
    script.onerror = () => { paypalBox.innerHTML = "<p>Không tải được cổng PayPal. Vui lòng thử lại.</p>"; };
    document.head.appendChild(script);
  } catch (error) {
    messageBox.textContent = error.message;
  }
}
function toast(message) {
  const toastBox = $("#toast");
  if (!toastBox) return;
  toastBox.textContent = message;
  toastBox.classList.add("show");
  setTimeout(() => toastBox.classList.remove("show"), 2200);
}
function productCard(p) {
  const img = productImage(p);
  const available = Number(p.quantity) > 0;
  return `<article class="product"><a class="product-image ${img ? "" : "no-image"}" href="/san-pham/${p.id}" aria-label="Xem ${safe(p.name)}"${img ? ` style="background-image:url('${safe(img)}')" role="img"` : ' role="img" aria-label="Sản phẩm chưa có ảnh"'}>${img ? "" : '<span aria-hidden="true">▧</span>'}</a><div class="product-info"><span class="product-cat">${safe(p.Category?.name || "Nông sản")}</span><h3><a href="/san-pham/${p.id}">${safe(p.name)}</a></h3><div class="product-price-row"><div><span class="price">${money(p.price)}</span>${Number(p.oldprice) > Number(p.price) ? `<span class="old">${money(p.oldprice)}</span>` : ""}</div><button type="button" class="add" data-add="${p.id}" aria-label="${available ? `Thêm ${safe(p.name)} vào giỏ hàng` : `${safe(p.name)} đã hết hàng`}" ${available ? "" : "disabled"}>${available ? "+" : "Hết hàng"}</button></div>${available ? `<span class="stock in-stock"><b>Số lượng còn lại:</b> ${Number(p.quantity).toLocaleString("vi-VN")} ${safe(productUnit(p.unit))}</span>` : ""}</div></article>`;
}
function renderProducts() {
  const grid = $("#productGrid");
  if (!state.products.length) {
    grid.innerHTML =
      '<div class="empty-state"><span aria-hidden="true">⌕</span><h3>Chưa tìm thấy sản phẩm</h3><p>Thử từ khóa khác hoặc xem lại tất cả sản phẩm.</p></div>';
    return;
  }
  grid.innerHTML = state.products.map(productCard).join("");
}

async function loadGroupedProducts() {
  const host = document.querySelector("#categoryProductRows");
  if (!host) return;
  try {
    const response = await fetch("/api/storefront/grouped");
    if (!response.ok) throw new Error();
    const data = await response.json();
    state.categories = data.categories || [];
    state.products = state.categories.flatMap((category) => category.products || []);
    host.innerHTML = state.categories.map((category) => `
      <section class="category-product-row" aria-labelledby="category-${category.id}">
        <div class="category-row-head">
          <div><span>DANH MỤC</span><h3 id="category-${category.id}">${safe(category.name)}</h3></div>
          <div class="category-row-actions">
            <a href="/san-pham?category=${category.id}">Xem tất cả</a>
            <button type="button" data-product-scroll="left" data-scroll-target="category-track-${category.id}" aria-label="Cuộn ${safe(category.name)} sang trái">←</button>
            <button type="button" data-product-scroll="right" data-scroll-target="category-track-${category.id}" aria-label="Cuộn ${safe(category.name)} sang phải">→</button>
          </div>
        </div>
        <div class="category-product-track" id="category-track-${category.id}">${category.products.map(productCard).join("")}</div>
      </section>`).join("") || '<div class="empty-state"><h3>Chưa có sản phẩm</h3></div>';
  } catch (_error) {
    host.innerHTML = '<div class="empty-state error"><h3>Chưa thể tải sản phẩm</h3><button type="button" onclick="location.reload()">Thử lại</button></div>';
  }
}
function renderPagination() {
  const el = $("#pagination");
  if (state.totalPages <= 1) {
    el.innerHTML = "";
    return;
  }
  let html = `<button data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""}>‹</button>`;
  for (let i = 1; i <= state.totalPages; i++)
    html += `<button data-page="${i}" class="${i === state.page ? "active" : ""}">${i}</button>`;
  html += `<button data-page="${state.page + 1}" ${state.page === state.totalPages ? "disabled" : ""}>›</button>`;
  el.innerHTML = html;
}
async function loadProducts({ resetFilters = false } = {}) {
  if (resetFilters) {
    state.page = 1;
    state.category = "all";
    state.search = "";
  }
  $("#productGrid").innerHTML =
    '<div class="product-skeleton" aria-label="Đang tải sản phẩm">' +
    Array.from({ length: 4 }, () => "<span></span>").join("") +
    "</div>";
  const params = new URLSearchParams({ page: state.page, limit: 8 });
  if (state.category !== "all") params.set("category", state.category);
  if (state.search) params.set("search", state.search);
  try {
    const response = await fetch("/api/storefront?" + params);
    if (!response.ok) throw new Error();
    const data = await response.json();
    state.products = data.products;
    state.categories = data.categories;
    state.totalPages = data.pagination.totalPages;
    state.page = data.pagination.page;
    if (!$("#filters").dataset.ready) {
      $("#filters").innerHTML =
        `<button class="${state.category === "all" ? "active" : ""}" data-category="all">Tất cả</button>` +
        state.categories
          .map(
            (c) =>
              `<button class="${String(c.id) === String(state.category) ? "active" : ""}" data-category="${c.id}">${safe(c.name)}</button>`,
          )
          .join("");
      $("#filters").dataset.ready = "1";
      $("#categories").innerHTML =
        state.categories
          .slice(0, 5)
          .map(
            (c) =>
              `<button class="category" data-cat="${c.id}" aria-label="Xem danh mục ${safe(c.name)}"><div class="category-image" role="img" aria-label="${safe(c.name)}"><span aria-hidden="true">♧</span></div><b>${safe(c.name)}</b></button>`,
          )
          .join("") ||
        '<div class="empty-state"><p>Chưa có danh mục sản phẩm.</p></div>';
    }
    document
      .querySelectorAll("[data-category]")
      .forEach((b) =>
        b.classList.toggle(
          "active",
          String(b.dataset.category) === String(state.category),
        ),
      );
    renderProducts();
    renderPagination();
  } catch (e) {
    $("#productGrid").innerHTML =
      '<div class="empty-state error"><h3>Chưa thể tải sản phẩm</h3><p>Vui lòng kiểm tra kết nối và thử lại sau.</p><button type="button" onclick="location.reload()">Thử lại</button></div>';
    $("#pagination").innerHTML = "";
  }
}
function renderCart() {
  localStorage.setItem("nong-san-cart", JSON.stringify(state.cart));
  const cartCount = $("#cartCount");
  const cartItems = $("#cartItems");
  const cartTotal = $("#cartTotal");
  if (cartCount) {
    cartCount.textContent = state.cart.reduce((n, x) => n + Number(x.qty || 0), 0);
  }
  if (cartItems) cartItems.innerHTML = state.cart.length
    ? state.cart
        .map(
          (x) =>
            `<div class="cart-row">${x.image ? `<img src="${safe(x.image)}" alt="">` : "<div>Không ảnh</div>"}<div><b>${safe(x.name)}</b><small>${x.qty} × ${money(x.price)}</small></div><button data-remove="${x.id}">×</button></div>`,
        )
        .join("")
    : '<div class="empty"><h3>Giỏ hàng đang trống</h3></div>';
  if (cartTotal) {
    cartTotal.textContent = money(
      state.cart.reduce((n, x) => n + Number(x.price) * Number(x.qty), 0),
    );
  }
  renderCartPage();
}

function renderCartPage() {
  const box = document.querySelector("#cartPageContent");
  if (!box) return;
  if (!state.cart.length) {
    box.innerHTML = `<div class="cart-page-empty"><div aria-hidden="true">🛒</div><h2>Giỏ hàng đang trống</h2><p>Bạn chưa chọn sản phẩm nào. Hãy khám phá nông sản tươi đang có tại cửa hàng.</p><a href="/san-pham">Khám phá sản phẩm <span>→</span></a></div>`;
    return;
  }
  const count = state.cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  let total = state.cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
  box.innerHTML = `<div class="cart-page-grid">
    <section class="cart-products-panel" aria-label="Sản phẩm trong giỏ">
      <div class="cart-panel-title"><h2>Sản phẩm đã chọn</h2><span>${count} sản phẩm</span></div>
      <div class="cart-page-items">${state.cart.map((item) => `<article class="cart-page-item">
        <a class="cart-item-image${item.image ? "" : " no-image"}" href="${item.type === "combo" ? "/combo-nha-hang" : `/san-pham/${item.id}`}" ${item.image ? `style="background-image:url('${safe(item.image)}')"` : ""} aria-label="Xem ${safe(item.name)}">${item.image ? "" : "🌿"}</a>
        <div class="cart-item-info"><span>${item.type === "combo" ? "Combo nhà hàng · Miễn phí giao hàng" : "Nông sản tươi"}</span><h3><a href="${item.type === "combo" ? "/combo-nha-hang" : `/san-pham/${item.id}`}">${safe(item.name)}</a></h3><strong>${money(item.price)}</strong></div>
        <div class="cart-item-actions"><label>Số lượng</label><div class="cart-quantity"><button type="button" data-cart-decrease="${item.id}" aria-label="Giảm số lượng">−</button><b>${Number(item.qty)}</b><button type="button" data-cart-increase="${item.id}" aria-label="Tăng số lượng">+</button></div><button class="cart-remove" type="button" data-cart-page-remove="${item.id}">Xóa</button></div>
        <div class="cart-item-subtotal"><span>Thành tiền</span><strong>${money(Number(item.price) * Number(item.qty))}</strong></div>
      </article>`).join("")}</div>
    </section>
    <aside class="cart-summary">
      <span class="cart-summary-kicker">Tóm tắt đơn hàng</span><h2>Thanh toán</h2>
      <div class="cart-summary-row"><span>Sản phẩm (${count})</span><b>${money(total)}</b></div>
      <div class="cart-summary-row"><span>Phí giao hàng</span><b>Tính ở bước sau</b></div>
      ${state.cart.some((item) => item.type === "combo") ? '<div class="cart-summary-row"><span>Ưu đãi vận chuyển</span><b>Miễn phí nhờ Combo nhà hàng</b></div>' : ""}
      <div class="cart-summary-total"><span>Tổng tạm tính</span><strong>${money(total)}</strong></div>
      <a class="cart-checkout-button" href="/thanh-toan">Tiến hành thanh toán <span>→</span></a>
      <div class="cart-assurance"><i>✓</i><p><b>Thanh toán an toàn</b><small>Thông tin đơn hàng được bảo mật.</small></p></div>
    </aside>
  </div>`;
}
window.addEventListener("cart:updated", (event) => {
  state.cart = JSON.parse(localStorage.getItem("nong-san-cart") || "[]");
  renderCart();
  if (event.detail?.message) toast(event.detail.message);
});
document.addEventListener("click", (e) => {
  const scrollButton = e.target.closest("[data-product-scroll]");
  if (scrollButton) {
    const track = document.getElementById(scrollButton.dataset.scrollTarget);
    track?.scrollBy({
      left: (scrollButton.dataset.productScroll === "left" ? -1 : 1) * Math.max(280, track.clientWidth * 0.8),
      behavior: "smooth",
    });
    return;
  }
  const cartDecrease = e.target.closest("[data-cart-decrease]");
  const cartIncrease = e.target.closest("[data-cart-increase]");
  const cartPageRemove = e.target.closest("[data-cart-page-remove]");
  if (cartDecrease || cartIncrease || cartPageRemove) {
    const id = (cartDecrease || cartIncrease || cartPageRemove).dataset.cartDecrease || (cartDecrease || cartIncrease || cartPageRemove).dataset.cartIncrease || (cartDecrease || cartIncrease || cartPageRemove).dataset.cartPageRemove;
    const item = state.cart.find((entry) => String(entry.id) === String(id));
    if (cartPageRemove) state.cart = state.cart.filter((entry) => String(entry.id) !== String(id));
    else if (item && cartDecrease) item.qty = Math.max(Number(item.minimumQuantity || 1), Number(item.qty) - 1);
    else if (item && cartIncrease) item.qty = Number(item.qty) + 1;
    renderCart();
    return;
  }
  const page = e.target.closest("#pagination button[data-page]");
  if (page && !page.disabled) {
    state.page = Number(page.dataset.page);
    loadProducts();
    location.hash = "products";
    return;
  }
  const filter = e.target.closest("[data-category],[data-cat]");
  if (filter) {
    state.category = String(
      filter.dataset.category || filter.dataset.cat || "all",
    );
    state.page = 1;
    document
      .querySelectorAll("[data-category]")
      .forEach((b) =>
        b.classList.toggle(
          "active",
          String(b.dataset.category) === state.category,
        ),
      );
    if (location.pathname === "/san-pham") {
      const url = new URL(location.href);
      state.category === "all"
        ? url.searchParams.delete("category")
        : url.searchParams.set("category", state.category);
      url.searchParams.delete("page");
      history.replaceState(null, "", url);
    }
    loadProducts();
    location.hash = "products";
    return;
  }
  const add = e.target.closest("[data-add]");
  if (add) {
    const p = state.products.find((x) => x.id == add.dataset.add);
    if (!p || p.quantity <= 0) return toast("Sản phẩm đang hết hàng");
    const old = state.cart.find((x) => x.id === p.id);
    old
      ? old.qty++
      : state.cart.push({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          image: productImage(p),
          qty: 1,
        });
    renderCart();
    toast("Đã thêm vào giỏ hàng");
  }
  const remove = e.target.closest("[data-remove]");
  if (remove) {
    state.cart = state.cart.filter((x) => x.id != remove.dataset.remove);
    renderCart();
  }
});
$("#searchForm").onsubmit = (e) => {
  e.preventDefault();
  state.search = $("#searchInput").value.trim();
  if (location.pathname === "/") {
    location.href = `/san-pham${state.search ? `?search=${encodeURIComponent(state.search)}` : ""}`;
    return;
  }
  state.page = 1;
  loadProducts();
  location.hash = "products";
};
const drawer = (v) => {
  $("#cartDrawer").classList.toggle("open", v);
  $("#backdrop").classList.toggle("open", v);
};
$("#cartBtn").onclick = () => drawer(true);
$("#backdrop").onclick = () => drawer(false);
$(".drawer .close").onclick = () => drawer(false);
$("#chatFab").onclick = () => {
  const isOpen = $("#chat").classList.toggle("open");
  $("#chatFab").setAttribute("aria-expanded", String(isOpen));
  if (isOpen) setTimeout(() => $("#chatForm input").focus(), 180);
};
$("#chatClose").onclick = () => {
  $("#chat").classList.remove("open");
  $("#chatFab").setAttribute("aria-expanded", "false");
  $("#chatFab").focus();
};
const chatHistory = [];
const quickChatAnswers = {
  "Cửa hàng đang có những sản phẩm nào?": "Bạn có thể xem toàn bộ nông sản đang bán tại mục Sản phẩm. Dùng ô tìm kiếm ở đầu trang để tìm nhanh theo tên; sản phẩm còn hàng sẽ có nút thêm vào giỏ.",
  "Phí giao hàng được tính như thế nào?": "Phí giao hàng được tính theo địa chỉ nhận hàng và sẽ hiển thị rõ ở bước thanh toán trước khi bạn xác nhận đơn.",
  "Hướng dẫn tôi cách đặt hàng": "Cách đặt hàng:\n• Chọn sản phẩm và nhấn nút + để thêm vào giỏ.\n• Mở giỏ hàng, kiểm tra và điều chỉnh số lượng.\n• Nhấn Thanh toán, chọn địa chỉ nhận hàng và hoàn tất thanh toán.",
};
const appendChatMessage = (role, text, extraClass = "") => {
  const body = $("#chat .chat-body");
  const message = document.createElement("div");
  message.className = `${role === "user" ? "chat-user" : "bot"} ${extraClass}`.trim();
  message.textContent = text;
  body.appendChild(message);
  body.scrollTop = body.scrollHeight;
  return message;
};
const renderChatAnswer = (element, text) => {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let html = "";
  let inList = false;
  for (const line of lines) {
    const bullet = line.match(/^[•*-]\s*(.+)$/);
    if (bullet) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${safe(bullet[1])}</li>`;
      continue;
    }
    if (inList) { html += "</ul>"; inList = false; }
    html += `<p>${safe(line)}</p>`;
  }
  if (inList) html += "</ul>";
  element.innerHTML = html || `<p>${safe(text)}</p>`;
};
const appendChatProducts = (products = [], afterElement) => {
  if (!products.length) return;
  const list = document.createElement("div");
  list.className = "chat-products";
  list.setAttribute("aria-label", "Sản phẩm gợi ý");
  list.innerHTML = products.map((product) => {
    const image = product.image || "";
    return `<article class="chat-product">
      <a href="/san-pham/${product.id}" class="chat-product-image" ${image ? `style="background-image:url('${safe(image)}')"` : ""} aria-label="Xem ${safe(product.name)}">${image ? "" : "🌿"}</a>
      <div class="chat-product-info"><a href="/san-pham/${product.id}">${safe(product.name)}</a><b>${money(product.price)}</b><small>Còn ${Number(product.quantity).toLocaleString("vi-VN")} ${safe(productUnit(product.unit))}</small></div>
      <button type="button" data-chat-add="${product.id}" aria-label="Thêm ${safe(product.name)} vào giỏ">+</button>
    </article>`;
  }).join("");
  list._products = products;
  afterElement.insertAdjacentElement("afterend", list);
};
const appendChatRecipe = (recipe, afterElement) => {
  if (!recipe) return afterElement;
  const card = document.createElement("section");
  card.className = "chat-recipe";
  card.innerHTML = `<h4>${safe(recipe.name)}</h4>
    <details open><summary>Nguyên liệu</summary><ul>${(recipe.ingredients || []).map((item) => `<li><b>${safe(item.name || item)}</b>${item.amount ? ` — ${safe(item.amount)}` : ""}</li>`).join("")}</ul></details>
    <details><summary>Các bước nấu</summary><ol>${(recipe.steps || []).map((step) => `<li>${safe(step)}</li>`).join("")}</ol></details>
    ${(recipe.missingIngredients || []).length ? `<div class="chat-recipe-missing"><b>Cửa hàng chưa có:</b> ${recipe.missingIngredients.map(safe).join(", ")}</div>` : ""}
    ${(recipe.safetyNotes || []).length ? `<details class="chat-recipe-safety"><summary>Lưu ý an toàn</summary><ul>${recipe.safetyNotes.map((note) => `<li>${safe(note)}</li>`).join("")}</ul></details>` : ""}`;
  afterElement.insertAdjacentElement("afterend", card);
  return card;
};
async function sendChatMessage(message) {
  const text = String(message || "").trim();
  if (!text) return;
  appendChatMessage("user", text);
  const loading = appendChatMessage("model", "Đang trả lời…", "chat-loading");
  const form = $("#chatForm");
  const input = form.querySelector("input");
  const button = form.querySelector("button");
  input.disabled = true;
  button.disabled = true;
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: chatHistory }),
    });
    const result = await response.json();
    if (response.status === 401) {
      loading.textContent = "Bạn cần đăng nhập để sử dụng trợ lý. Đang chuyển đến trang đăng nhập…";
      setTimeout(() => { location.href = "/dang-nhap?returnTo=/"; }, 1200);
      return;
    }
    if (!response.ok) throw new Error(result.message || "Trợ lý chưa thể trả lời.");
    loading.classList.remove("chat-loading");
    renderChatAnswer(loading, result.data.answer);
    const recipeCard = appendChatRecipe(result.data.recipe, loading);
    appendChatProducts(result.data.products, recipeCard);
    chatHistory.push({ role: "user", text }, { role: "model", text: result.data.answer });
    if (chatHistory.length > 8) chatHistory.splice(0, chatHistory.length - 8);
  } catch (error) {
    loading.classList.remove("chat-loading");
    loading.classList.add("chat-error");
    loading.textContent = error.message;
  } finally {
    input.disabled = false;
    button.disabled = false;
    input.focus();
    $("#chat .chat-body").scrollTop = $("#chat .chat-body").scrollHeight;
  }
}
$("#chatForm").onsubmit = (e) => {
  e.preventDefault();
  const input = e.currentTarget.querySelector("input");
  const message = input.value;
  e.target.reset();
  sendChatMessage(message);
};
$("#chat .quick").addEventListener("click", (event) => {
  const button = event.target.closest("[data-chat-question]");
  if (!button) return;
  const question = button.dataset.chatQuestion;
  const answer = quickChatAnswers[question];
  if (!answer) return sendChatMessage(question);
  appendChatMessage("user", button.textContent.trim());
  const response = appendChatMessage("model", "");
  renderChatAnswer(response, answer);
  chatHistory.push({ role: "user", text: question }, { role: "model", text: answer });
  if (chatHistory.length > 8) chatHistory.splice(0, chatHistory.length - 8);
  $("#chat .chat-body").scrollTop = $("#chat .chat-body").scrollHeight;
});
$("#chat .chat-body").addEventListener("click", (event) => {
  const button = event.target.closest("[data-chat-add]");
  if (!button) return;
  const list = button.closest(".chat-products");
  const product = list?._products?.find((item) => Number(item.id) === Number(button.dataset.chatAdd));
  if (!product || Number(product.quantity) <= 0) return toast("Sản phẩm đang hết hàng");
  const existing = state.cart.find((item) => Number(item.id) === Number(product.id));
  if (existing) {
    if (existing.qty >= Number(product.quantity)) return toast("Đã đạt số lượng còn trong kho");
    existing.qty += 1;
  } else {
    state.cart.push({ id: product.id, name: product.name, price: Number(product.price), image: product.image || "", qty: 1 });
  }
  renderCart();
  button.classList.add("added");
  button.textContent = "✓";
  setTimeout(() => { button.classList.remove("added"); button.textContent = "+"; }, 1200);
  toast(`Đã thêm ${product.name} vào giỏ hàng`);
});
$(".checkout").onclick = () => {
  location.href = "/thanh-toan";
};
renderCart();
const currentPage = renderRoute();
if (currentPage === "home") loadGroupedProducts();
import("/js/banner.js");
import("/js/header.js");
import("/js/suppliers.js?v=3");
import("/js/home-extras.js");
import("/js/promotion.js");
import("/js/auth.js");
import("/js/profile.js");
import("/js/recipe-assistant.js");
