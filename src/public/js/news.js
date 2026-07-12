if(location.pathname==='/tin-tuc'){
  const main=document.querySelector('main');
  const safe=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  main.innerHTML='<section class="news-page container"><div class="loading">Đang tải tin tức…</div></section>';
  fetch('/api/news').then(response=>response.json()).then(result=>{
    const news=result.data||[];
    const cards=news.map(item=>`<article class="news-item"><a class="news-item-image" href="/tin-tuc/${item.id}" ${item.image?`style="background-image:url('${item.image.replace(/'/g,'%27')}')"`:''}>${item.image?'':'Chưa có ảnh'}</a><div class="news-item-body"><small>${new Date(item.createdAt).toLocaleDateString('vi-VN')}</small><h2><a href="/tin-tuc/${item.id}">${safe(item.title)}</a></h2><p>${safe(String(item.content||'').replace(/<[^>]*>/g,'').slice(0,150))}</p><a class="news-more" href="/tin-tuc/${item.id}">Đọc tiếp →</a></div></article>`).join('');
    main.innerHTML=`<section class="news-page container">${news.length?`<div class="news-list">${cards}</div>`:'<div class="clean-empty"><span>📰</span><h2>Chưa có bài viết</h2><p>Bài viết sẽ xuất hiện tại đây sau khi được thêm trong trang quản trị.</p><a href="/san-pham">Khám phá sản phẩm</a></div>'}</section>`;
  }).catch(()=>{main.innerHTML='<section class="news-page container"><div class="clean-empty"><h2>Không thể tải tin tức</h2><p>Vui lòng thử lại sau.</p></div></section>'});
}
