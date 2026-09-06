class AuthPage {
  constructor(page) {
    this.page = page;
    this.form = page.locator("#authForm");
    this.error = page.locator("#authError");
  }

  async openRegister() {
    await this.page.goto("/dang-ky");
    await this.form.waitFor();
  }

  async openLogin() {
    await this.page.goto("/dang-nhap");
    await this.form.waitFor();
  }

  async register(user) {
    await this.form.locator('[name="name"]').fill(user.name);
    await this.form.locator('[name="phone"]').fill(user.phone);
    await this.form.locator('[name="address"]').fill(user.address);
    await this.form.locator('[name="ward"]').fill(user.ward);
    await this.form.locator('[name="district"]').fill(user.district);
    await this.form.locator('[name="province"]').fill(user.province);
    await this.form.locator('[name="email"]').fill(user.email);
    await this.form.locator('[name="password"]').fill(user.password);
    await this.form
      .locator('[name="passwordConfirmation"]')
      .fill(user.password);

    await Promise.all([
      this.page.waitForURL("**/tai-khoan"),
      this.form.getByRole("button", { name: "Đăng ký" }).click(),
    ]);
  }

  async login(email, password) {
    await this.form.locator('[name="email"]').fill(email);
    await this.form.locator('[name="password"]').fill(password);

    await Promise.all([
      this.page.waitForURL("**/tai-khoan"),
      this.form.getByRole("button", { name: "Đăng nhập" }).click(),
    ]);
  }
}

module.exports = AuthPage;
