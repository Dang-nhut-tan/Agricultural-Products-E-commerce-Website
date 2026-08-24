class CartPage {
  constructor(page) {
    this.page = page;
    this.items = page.locator(".cart-page-item");
    this.emptyCart = page.locator(".cart-page-empty");
  }

  async addFirstAvailableProduct() {
    await this.page.goto("/");
    const addButton = this.page.locator('button[data-add]:not([disabled])').first();
    await addButton.waitFor();
    await addButton.click();
  }

  async open() {
    await this.page.goto("/gio-hang");
  }

  firstItem() {
    return this.items.first();
  }

  async quantity() {
    return Number(await this.firstItem().locator(".cart-quantity b").innerText());
  }

  async increase() {
    await this.firstItem().getByRole("button", { name: "Tăng số lượng" }).click();
  }

  async decrease() {
    await this.firstItem().getByRole("button", { name: "Giảm số lượng" }).click();
  }

  async remove() {
    await this.firstItem().getByRole("button", { name: "Xóa" }).click();
  }
}

module.exports = CartPage;
