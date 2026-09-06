class NewsPage {
  constructor(page) {
    this.page = page;
    this.menuLink = page
      .locator("#primaryNav")
      .getByRole("link", { name: "Tin tức", exact: true });
    this.heading = page.getByRole("heading", {
      name: /Chuyện nông sản và căn bếp Việt/,
    });
    this.listSummary = page.locator(".news-section-heading p");
    this.cards = page.locator(".news-card");
    this.detail = page.locator(".news-detail");
    this.detailTitle = this.detail.getByRole("heading", { level: 1 });
    this.detailContent = this.detail.locator(".news-detail-content");
    this.detailCategory = this.detail.locator(".news-detail-meta span");
    this.detailDate = this.detail.locator(".news-detail-meta time");
    this.articleSource = this.detail.locator(".news-detail-aside");
    this.articleSourceName = this.articleSource.locator("strong");
    this.backToListLink = this.detail.getByRole("link", {
      name: "Quay lại trang tin tức",
    });
    this.moreArticlesLink = this.detail.getByRole("link", {
      name: "Xem thêm bài viết",
    });
    this.notFoundHeading = page.getByRole("heading", {
      name: "Không tìm thấy nội dung",
    });
  }

  async openHome() {
    await this.page.goto("/");
    await this.menuLink.waitFor();
  }

  async openList() {
    await this.page.goto("/tin-tuc");
    await this.heading.waitFor();
  }

  async openListFromMenu() {
    await this.menuLink.click();
    await this.heading.waitFor();
  }

  cardByTitle(title) {
    return this.cards.filter({ hasText: title });
  }

  cardDateByTitle(title) {
    return this.cardByTitle(title).locator("time");
  }

  cardReadLinkByTitle(title) {
    return this.cardByTitle(title).getByRole("link", {
      name: "Đọc bài viết",
    });
  }

  async listedArticleCount() {
    return this.cards.count();
  }

  async openArticle(title) {
    await this.cardByTitle(title).getByRole("link", { name: title, exact: true }).click();
    await this.detail.waitFor();
  }

  async openArticleByReadLink(title) {
    await this.cardReadLinkByTitle(title).click();
    await this.detail.waitFor();
  }

  async openArticleById(id) {
    await this.page.goto(`/tin-tuc/${id}`);
    await this.detail.waitFor();
  }

  // Trả về response để test kiểm tra trạng thái khi bài viết không tồn tại.
  async openArticleUrl(id) {
    return this.page.goto(`/tin-tuc/${id}`);
  }

  async backToList() {
    await this.backToListLink.click();
    await this.heading.waitFor();
  }

  async openMoreArticles() {
    await this.moreArticlesLink.click();
    await this.heading.waitFor();
  }
}

module.exports = NewsPage;
