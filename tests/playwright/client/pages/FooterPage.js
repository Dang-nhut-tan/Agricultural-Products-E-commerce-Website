const TestClientBase = require("../base/TestClientBase");

class FooterPage extends TestClientBase {
  constructor(page) {
    super(page);
    this.footer = page.locator("body > footer");
  }

  async openHome() {
    await this.page.goto("/");
    await this.footer.waitFor();
  }

  footerLink(linkName) {
    return this.footer.getByRole("link", {
      name: linkName,
      exact: true,
    });
  }

  async openPageFromFooter(linkName) {
    await this.footerLink(linkName).click();
  }
}

module.exports = FooterPage;
