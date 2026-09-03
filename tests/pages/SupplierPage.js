class SupplierPage {
  constructor(page) {
    this.page = page;
    this.menuLink = page
      .locator("#primaryNav")
      .getByRole("link", { name: "Nhà cung cấp", exact: true });
    this.productDetail = page.locator(".commerce-detail");
    this.supplierGrid = page.locator(".supplier-grid");
    this.supplierCards = this.supplierGrid.locator(".supplier-card");
    this.listSummary = page.locator(".supplier-page .supplier-section-head p").first();
    this.supplierProfile = page.locator(".supplier-profile");
    this.supplierProducts = page.locator(".supplier-detail-page .product-grid");
    this.supplierProductCards = this.supplierProducts.locator(".product");
    this.verifiedStatus = this.supplierProfile.locator(".supplier-verified");
    this.productCount = this.supplierProfile.locator(".supplier-profile-stat");
    this.productCountValue = this.productCount.locator("strong");
    this.backToListLink = page.getByRole("link", { name: "Tất cả nhà cung cấp" });
    this.errorState = page.locator(".supplier-state.error");
  }

  async openProduct(productId) {
    await this.page.goto(`/san-pham/${productId}`);
    await this.productDetail.waitFor();
  }

  productSupplier(name) {
    return this.productDetail.locator(".commerce-spec dd").filter({ hasText: name });
  }

  productTitle(name) {
    return this.productDetail.getByRole("heading", { name, level: 1 });
  }

  async openSupplierList() {
    await this.menuLink.click();
    await this.supplierGrid.waitFor();
  }

  supplierCard(name) {
    return this.page.locator(".supplier-card").filter({ hasText: name });
  }

  supplierName(name) {
    return this.supplierProfile.getByRole("heading", { name });
  }

  async listedSupplierCount() {
    return this.supplierCards.count();
  }

  async openSupplier(name) {
    await this.supplierCard(name).click();
    await this.supplierProfile.waitFor();
  }

  async openSupplierById(supplierId) {
    await this.page.goto(`/nha-cung-cap/${supplierId}`);
    await this.supplierProfile.waitFor();
  }

  // Gian hàng của nhà cung cấp không tồn tại chỉ hiển thị trạng thái lỗi.
  async openMissingSupplier(supplierId) {
    await this.page.goto(`/nha-cung-cap/${supplierId}`);
    await this.errorState.waitFor();
  }

  supplierProductCard(productName) {
    return this.supplierProductCards.filter({
      has: this.page.getByRole("link", { name: productName, exact: true }),
    });
  }

  async openSupplierProduct(productName) {
    await this.supplierProductCard(productName).locator(".product-info h3 a").click();
    await this.productDetail.waitFor();
  }

  async backToSupplierList() {
    await this.backToListLink.click();
    await this.supplierGrid.waitFor();
  }
}

module.exports = SupplierPage;
