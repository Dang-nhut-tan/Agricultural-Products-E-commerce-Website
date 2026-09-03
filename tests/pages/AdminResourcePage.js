class AdminResourcePage {
  constructor(page) {
    this.page = page;
  }

  async login(email, password) {
    await this.page.goto("/admin/login");
    await this.page.locator('input[name="email"]').fill(email);
    await this.page.locator('input[name="password"]').fill(password);
    await Promise.all([
      this.page.waitForURL(/\/admin\/?$/),
      this.page.getByRole("button", { name: "Đăng nhập" }).click(),
    ]);
  }

  async openNew(resource) {
    await this.page.goto(`/admin/resources/${resource}/actions/new`);
    await this.page.getByRole("button", { name: "Lưu" }).waitFor();
  }

  async openEdit(resource, id) {
    await this.page.goto(`/admin/resources/${resource}/records/${id}/edit`);
    await this.page.getByRole("button", { name: "Lưu" }).waitFor();
  }

  async openShow(resource, id) {
    await this.page.goto(`/admin/resources/${resource}/records/${id}/show`);
  }

  field(name) {
    return this.page.locator(`[name="${name}"]`);
  }

  async fill(name, value) {
    const field = this.field(name);
    await field.fill(String(value));
  }

  fieldGroup(label) {
    return this.page
      .locator("label")
      .filter({ hasText: new RegExp(`^${label}$`) })
      .locator("..");
  }

  async select(label, option) {
    const input = this.fieldGroup(label).locator('[role="combobox"], input').last();
    await input.click();
    await input.fill(String(option));
    const choice = this.page.getByText(String(option), { exact: true }).last();
    await choice.waitFor();
    await choice.click();
  }

  async fillDate(label, value) {
    const input = this.fieldGroup(label).locator("input").last();
    await input.fill(value);
  }

  async fillRichText(value) {
    await this.page.locator('[contenteditable="true"]').fill(value);
  }

  async saveSuccessfully() {
    const currentUrl = this.page.url();
    await this.page.getByRole("button", { name: "Lưu" }).click();
    await this.page.waitForURL((url) => url.toString() !== currentUrl);
  }

  async saveExpectingValidationError() {
    const currentUrl = this.page.url();
    await this.page.getByRole("button", { name: "Lưu" }).click();
    await this.page.waitForTimeout(500);
    return this.page.url() === currentUrl;
  }

  async deleteRecord(resource, id) {
    await this.openShow(resource, id);
    const deleteAction = this.page.getByText("Xóa", { exact: true }).last();
    await deleteAction.click();

    const confirm = this.page.getByRole("button", { name: "Xác nhận" });
    await confirm.waitFor();
    await confirm.click();
    await this.page.waitForURL(new RegExp(`/admin/resources/${resource}(/?$|/actions/list)`));
  }
}

module.exports = AdminResourcePage;
