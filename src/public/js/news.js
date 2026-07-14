const newsDetailMatch = location.pathname.match(/^\/tin-tuc\/(\d+)$/);
if (location.pathname === "/tin-tuc" || newsDetailMatch) {
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
  main.innerHTML =
    '<section class="news-page container"><div class="loading">Đang tải tin tức…</div></section>';

  if (newsDetailMatch) {
    fetch("/api/news/" + newsDetailMatch[1])
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(({ data: item }) => {
        main.innerHTML = `<article class="news-detail container"><a class="news-back" href="/tin-tuc">← Quay lại tin tức</a><header class="news-detail-header"><span>${new Date(item.createdAt).toLocaleDateString("vi-VN")}</span><h1>${safe(item.title)}</h1></header>${item.image ? `<img class="news-detail-image" src="${safe(item.image)}" alt="${safe(item.title)}">` : ""}<div class="news-detail-content">${item.content || "<p>Nội dung đang được cập nhật.</p>"}</div></article>`;
      })
      .catch(() => {
        main.innerHTML =
          '<div class="clean-empty"><h2>Không tìm thấy bài viết</h2><p>Bài viết không tồn tại hoặc đã bị xóa.</p><a href="/tin-tuc">Về trang tin tức</a></div>';
      });
  } else {
    fetch("/api/news")
      .then((response) => response.json())
      .then(({ data = [] }) => {
        const cards = data
          .map(
            (item) =>
              `<article class="news-item"><a class="news-item-image" href="/tin-tuc/${item.id}" ${item.image ? `style="background-image:url('${item.image.replace(/'/g, "%27")}')"` : ""}>${item.image ? "" : "Chưa có ảnh"}</a><div class="news-item-body"><small>${new Date(item.createdAt).toLocaleDateString("vi-VN")}</small><h2><a href="/tin-tuc/${item.id}">${safe(item.title)}</a></h2><p>${safe(
                String(item.content || "")
                  .replace(/<[^>]*>/g, "")
                  .slice(0, 150),
              )}</p><a class="news-more" href="/tin-tuc/${item.id}">Đọc tiếp →</a></div></article>`,
          )
          .join("");
        main.innerHTML = `<section class="news-page container">${data.length ? `<div class="news-list">${cards}</div>` : '<div class="clean-empty"><span>📰</span><h2>Chưa có bài viết</h2><p>Bài viết sẽ xuất hiện tại đây sau khi được thêm trong trang quản trị.</p></div>'}</section>`;
      })
      .catch(() => {
        main.innerHTML =
          '<div class="clean-empty"><h2>Không thể tải tin tức</h2></div>';
      });
  }
}
