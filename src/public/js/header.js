const oldHeader=document.querySelector('header');
document.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="/css/menu.css"><link rel="stylesheet" href="/css/redesign.css"><link rel="stylesheet" href="/css/detail.css"><link rel="stylesheet" href="/css/home-products.css"><link rel="stylesheet" href="/css/banner-click.css"><link rel="stylesheet" href="/css/home-extras.css"><link rel="stylesheet" href="/css/promotion.css">');
document.body.dataset.page=location.pathname==='/san-pham'?'products':location.pathname.slice(1)||'home';
const oldTopbar=document.querySelector('.topbar');
if(oldTopbar)oldTopbar.remove();
if(oldHeader){
  oldHeader.innerHTML=`<div class="container modern-header"><a class="modern-logo" href="/"><span class="modern-logo-mark">🌱</span><span><b>NÔNG SẢN XANH</b><small>TIÊU CHUẨN 2026</small></span></a><form class="modern-search" id="modernSearch"><input id="modernSearchInput" placeholder="Tìm kiếm rau sạch, trái cây hữu cơ..."><button aria-label="Tìm kiếm">⌕</button></form><nav class="modern-nav"><a href="/" class="${location.pathname==='/'?'active':''}">Trang chủ</a><a href="/san-pham" class="${location.pathname.startsWith('/san-pham')?'active':''}">Sản phẩm</a><a href="/tin-tuc" class="${location.pathname==='/tin-tuc'?'active':''}">Tin tức</a><a class="sale" href="/san-pham">◇ Khuyến mãi</a></nav><button class="modern-cart" id="modernCart" aria-label="Giỏ hàng">🛒<i>${state.cart.reduce((n,x)=>n+x.qty,0)}</i></button><a class="modern-account" href="/dang-nhap"><span>N</span><b>Tài khoản</b></a><button class="mobile-menu" id="mobileMenu">☰</button></div>`;
  document.querySelector('#modernSearch').onsubmit=event=>{event.preventDefault();const value=document.querySelector('#modernSearchInput').value.trim();location.href='/san-pham?search='+encodeURIComponent(value)};
  document.querySelector('#modernCart').onclick=()=>{document.querySelector('#cartDrawer').classList.add('open');document.querySelector('#backdrop').classList.add('open')};
  document.querySelector('#mobileMenu').onclick=()=>document.querySelector('.modern-nav').classList.toggle('open');
  const productLink=[...document.querySelectorAll('.modern-nav a')].find(link=>link.textContent.trim()==='Sản phẩm');
  if(productLink){productLink.classList.toggle('active',location.pathname==='/san-pham');productLink.insertAdjacentHTML('afterend',`<a href="/nha-cung-cap" class="${location.pathname==='/nha-cung-cap'?'active':''}">Nhà cung cấp</a>`)}
  const saleLink=document.querySelector('.modern-nav .sale');if(saleLink)saleLink.href='/#products';
}
