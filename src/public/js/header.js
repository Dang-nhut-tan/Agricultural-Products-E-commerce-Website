const oldHeader = document.querySelector("header");
document.head.insertAdjacentHTML(
  "beforeend",
  '<link rel="stylesheet" href="/css/menu.css"><link rel="stylesheet" href="/css/redesign.css"><link rel="stylesheet" href="/css/home-products.css"><link rel="stylesheet" href="/css/banner-click.css"><link rel="stylesheet" href="/css/home-extras.css"><link rel="stylesheet" href="/css/promotion.css"><link rel="stylesheet" href="/css/image-ratios.css"><link rel="stylesheet" href="/css/news-detail.css"><link rel="stylesheet" href="/css/commerce-detail.css"><link rel="stylesheet" href="/css/comments.css"><link rel="stylesheet" href="/css/home-polish.css"><link rel="stylesheet" href="/css/storefront-v2.css">',
);
document.body.dataset.page =
  location.pathname === "/san-pham"
    ? "products"
    : location.pathname.slice(1) || "home";
const oldTopbar = document.querySelector(".topbar");
if (oldTopbar) oldTopbar.remove();
if (oldHeader) {
  oldHeader.innerHTML = `<div class="container modern-header"><a class="modern-logo" href="/" aria-label="Nông Sản Xanh - Trang chủ"><span class="modern-logo-mark" aria-hidden="true">🌱</span><span><b>NÔNG SẢN XANH</b><small>TƯƠI LÀNH MỖI NGÀY</small></span></a><form class="modern-search" id="modernSearch" role="search"><label class="sr-only" for="modernSearchInput">Tìm kiếm sản phẩm</label><input id="modernSearchInput" type="search" placeholder="Tìm rau, trái cây, nông sản..."><button type="submit" aria-label="Tìm kiếm"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg></button></form><nav class="modern-nav" id="primaryNav" aria-label="Điều hướng chính"><a href="/" class="${location.pathname === "/" ? "active" : ""}" ${location.pathname === "/" ? 'aria-current="page"' : ""}>Trang chủ</a><a href="/san-pham" class="${location.pathname.startsWith("/san-pham") ? "active" : ""}">Sản phẩm</a><a href="/tin-tuc" class="${location.pathname === "/tin-tuc" ? "active" : ""}">Tin tức</a><a class="sale" href="/#products">Khuyến mãi</a></nav><button type="button" class="modern-cart" id="modernCart" aria-label="Mở giỏ hàng, ${state.cart.reduce((n, x) => n + x.qty, 0)} sản phẩm"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2 11h10l3-7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg><i aria-hidden="true">${state.cart.reduce((n, x) => n + x.qty, 0)}</i></button><a class="modern-account" href="/dang-nhap" aria-label="Tài khoản"><span aria-hidden="true">N</span><b>Tài khoản</b></a><button type="button" class="mobile-menu" id="mobileMenu" aria-label="Mở menu" aria-controls="primaryNav" aria-expanded="false">☰</button></div>`;
  document.querySelector("#modernSearch").onsubmit = (event) => {
    event.preventDefault();
    const value = document.querySelector("#modernSearchInput").value.trim();
    location.href = "/san-pham?search=" + encodeURIComponent(value);
  };
  document.querySelector("#modernCart").onclick = () => {
    document.querySelector("#cartDrawer").classList.add("open");
    document.querySelector("#backdrop").classList.add("open");
  };
  document.querySelector("#mobileMenu").onclick = (event) => {
    const nav = document.querySelector(".modern-nav");
    const open = nav.classList.toggle("open");
    event.currentTarget.setAttribute("aria-expanded", String(open));
    event.currentTarget.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
  };
  const productLink = [...document.querySelectorAll(".modern-nav a")].find(
    (link) => link.textContent.trim() === "Sản phẩm",
  );
  if (productLink) {
    productLink.classList.toggle("active", location.pathname === "/san-pham");
    productLink.insertAdjacentHTML(
      "afterend",
      `<a href="/nha-cung-cap" class="${location.pathname === "/nha-cung-cap" ? "active" : ""}">Nhà cung cấp</a>`,
    );
  }
  const saleLink = document.querySelector(".modern-nav .sale");
  if (saleLink) saleLink.href = "/#products";
}
