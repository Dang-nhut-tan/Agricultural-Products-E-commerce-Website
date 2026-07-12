if(location.pathname==='/'){
  const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  fetch('/api/banners').then(response=>response.json()).then(({data=[]})=>{
    const hero=document.querySelector('.hero');
    if(!hero||!data.length)return;
    let active=0;
    const draw=()=>{
      const banner=data[active];
      const products=(banner.BannerDetails||[]).map(item=>item.Product).filter(item=>item&&item.status===1);
      const product=products[0];
      const image=banner.image||product?.image||'';
      const destination=products.length>1?`/khuyen-mai/${banner.id}`:product?`/san-pham/${product.id}`:'/#products';
      hero.innerHTML=`<div class="container banner-wrap"><article class="store-banner" data-banner-link="${destination}" ${image?`style="background-image:url('${image.replace(/'/g,'%27')}')"`:''}><div class="store-banner-overlay"></div><div class="store-banner-content"><span class="banner-badge">KHUYẾN MÃI NỔI BẬT</span><h1>${escapeHtml(banner.name)}</h1><p>${product?`Khám phá ${escapeHtml(product.name)} — nông sản được liên kết trực tiếp với banner này.`:'Khám phá các sản phẩm đang có tại cửa hàng.'}</p><a class="banner-button" href="${destination}">Mua ngay <b>›</b></a></div>${!image?'<div class="banner-missing">Banner chưa có ảnh Cloudinary</div>':''}</article>${data.length>1?`<div class="banner-dots">${data.map((_,index)=>`<button data-slide="${index}" class="${index===active?'active':''}" aria-label="Banner ${index+1}"></button>`).join('')}</div>`:''}</div>`;
      hero.querySelector('.store-banner').onclick=event=>{if(!event.target.closest('[data-slide]'))location.href=event.currentTarget.dataset.bannerLink};
      hero.querySelectorAll('[data-slide]').forEach(button=>button.onclick=event=>{event.stopPropagation();active=Number(button.dataset.slide);draw()});
    };
    draw();
    if(data.length>1)setInterval(()=>{active=(active+1)%data.length;draw()},3000);
  }).catch(error=>console.error('Không thể tải banner:',error));
}
