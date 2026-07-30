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
  if (path === "/don-hang" || /^\/don-hang\/\d+$/.test(path)) {
    const orderId = path.split("/")[2];
    main.innerHTML = title(orderId ? `Đơn hàng #${safe(orderId)}` : "Lịch sử mua hàng") +
      `<section class="page-shell orders-page"><div class="container"><div id="ordersContent"><div class="panel orders-loading">Đang tải đơn hàng…</div></div></div></section>`;
    loadOrders(orderId);
    return "orders";
  }
  const pages = {
    "/gio-hang": [
      "Giỏ hàng",
      "Giỏ hàng của bạn được lưu trên trình duyệt. Mở biểu tượng giỏ hàng phía trên để xem và chỉnh sửa sản phẩm.",
    ],
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
            items: state.cart.map((item) => ({ id: item.id, quantity: item.qty })),
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
function renderProducts() {
  const grid = $("#productGrid");
  if (!state.products.length) {
    grid.innerHTML =
      '<div class="empty-state"><span aria-hidden="true">⌕</span><h3>Chưa tìm thấy sản phẩm</h3><p>Thử từ khóa khác hoặc xem lại tất cả sản phẩm.</p></div>';
    return;
  }
  grid.innerHTML = state.products
    .map((p) => {
      const img = productImage(p);
      const available = Number(p.quantity) > 0;
      return `<article class="product"><a class="product-image ${img ? "" : "no-image"}" href="/san-pham/${p.id}" aria-label="Xem ${safe(p.name)}"${img ? ` style="background-image:url('${safe(img)}')" role="img"` : ' role="img" aria-label="Sản phẩm chưa có ảnh"'}>${img ? "" : '<span aria-hidden="true">▧</span>'}</a><div class="product-info"><span class="product-cat">${safe(p.Category?.name || "Nông sản")}</span><h3><a href="/san-pham/${p.id}">${safe(p.name)}</a></h3><div class="product-price-row"><div><span class="price">${money(p.price)}</span>${Number(p.oldprice) > Number(p.price) ? `<span class="old">${money(p.oldprice)}</span>` : ""}</div><button type="button" class="add" data-add="${p.id}" aria-label="${available ? `Thêm ${safe(p.name)} vào giỏ hàng` : `${safe(p.name)} đã hết hàng`}" ${available ? "" : "disabled"}>${available ? "+" : "Hết hàng"}</button></div>${available ? `<span class="stock in-stock"><b>Số lượng còn lại:</b> ${Number(p.quantity).toLocaleString("vi-VN")} ${safe(productUnit(p.unit))}</span>` : ""}</div></article>`;
    })
    .join("");
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
}
window.addEventListener("cart:updated", (event) => {
  state.cart = JSON.parse(localStorage.getItem("nong-san-cart") || "[]");
  renderCart();
  if (event.detail?.message) toast(event.detail.message);
});
document.addEventListener("click", (e) => {
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
$("#chatFab").onclick = () => $("#chat").classList.toggle("open");
$("#chatClose").onclick = () => $("#chat").classList.remove("open");
$("#chatForm").onsubmit = (e) => {
  e.preventDefault();
  e.target.reset();
  toast("Đã nhận tin nhắn");
};
$(".checkout").onclick = () => {
  location.href = "/thanh-toan";
};
renderCart();
const currentPage = renderRoute();
if (currentPage === "home") loadProducts();
import("/js/banner.js");
import("/js/header.js");
import("/js/suppliers.js");
import("/js/home-extras.js");
import("/js/promotion.js");
import("/js/auth.js");
import("/js/profile.js");
