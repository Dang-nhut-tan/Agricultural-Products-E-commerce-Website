const TestClientBase = require("../base/TestClientBase");

class HeaderPage extends TestClientBase {
  constructor(page) {
    super(page);
    this.header = page.locator("body > header");
    this.logo = this.header.locator(".modern-logo");
    this.navigation = this.header.locator("#primaryNav");
    this.cart = this.header.locator(".modern-cart");
    this.account = this.header.locator(".modern-account");
    this.mobileMenu = this.header.locator("#mobileMenu");
    this.cartDrawer = page.locator("#cartDrawer");
    this.backdrop = page.locator("#backdrop");
  }

  async open(path) {
    await this.page.goto(path);
    await this.header.waitFor();
  }

  navigationLink(linkName) {
    return this.navigation.getByRole("link", {
      name: linkName,
      exact: true,
    });
  }

  async openLogo() {
    await this.logo.click();
  }

  async openNavigationLink(linkName) {
    await this.navigationLink(linkName).click();
  }

  async openCart() {
    await this.cart.click();
  }

  async openAccount() {
    await this.account.click();
  }

  async toggleMobileMenu() {
    await this.mobileMenu.click();
  }
}

module.exports = HeaderPage;
