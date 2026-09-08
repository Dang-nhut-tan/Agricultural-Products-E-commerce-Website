const TestClientBase = require("../base/TestClientBase");

class ProfilePage extends TestClientBase {
  constructor(page) {
    super(page);
    this.profileView = page.locator("#profileView");
    this.profileForm = page.locator("#profileForm");
    this.addressForm = page.locator("#addressForm");
    this.addressList = page.locator("#addressList");
    this.orderHistoryLink = page.locator(".account-orders-link");
  }

  async waitUntilReady() {
    await this.page.waitForURL("**/tai-khoan");
    await this.profileView.waitFor();
    await this.page.waitForFunction(() => {
      const editButton = document.querySelector("#editProfileButton");
      const addressButton = document.querySelector("#showAddressForm");
      return typeof editButton?.onclick === "function"
        && typeof addressButton?.onclick === "function";
    });
  }

  async updateProfile(name, phone) {
    await this.openProfileForm();
    await this.profileForm.locator('[name="name"]').fill(name);
    await this.profileForm.locator('[name="phone"]').fill(phone);

    await Promise.all([
      this.page.waitForEvent("load"),
      this.profileForm.getByRole("button", { name: "Lưu thông tin" }).click(),
    ]);
    await this.profileView.waitFor();
  }

  async openProfileForm() {
    await this.page.locator("#editProfileButton").click();
    await this.profileForm.waitFor();
  }

  async cancelProfileChanges() {
    await this.profileForm.locator("#cancelProfileButton").click();
    await this.profileView.waitFor();
  }

  async openAddressForm() {
    await this.page.locator("#showAddressForm").click();
    await this.addressForm.waitFor();
  }

  async cancelAddressChanges() {
    await this.addressForm.locator("#cancelAddressButton").click();
    await this.page.locator("#showAddressForm").waitFor();
  }

  async openOrderHistory() {
    await Promise.all([
      this.page.waitForURL("**/don-hang"),
      this.orderHistoryLink.click(),
    ]);
  }

  async addAddress(address) {
    await this.openAddressForm();
    await this.addressForm
      .locator('[name="receiver_name"]')
      .fill(address.receiverName);
    await this.addressForm.locator('[name="address"]').fill(address.address);
    await this.addressForm.locator('[name="ward"]').fill(address.ward);
    await this.addressForm.locator('[name="district"]').fill(address.district);
    await this.addressForm.locator('[name="province"]').fill(address.province);
    await this.addressForm.getByRole("button", { name: "Lưu địa chỉ" }).click();
    await this.addressList
      .locator(".address-card", { hasText: address.address })
      .waitFor();
  }

  async deleteAddress(addressText) {
    const card = this.addressList.locator(".address-card", {
      hasText: addressText,
    });
    await card.getByRole("button", { name: "Xóa" }).click();
    await card.waitFor({ state: "detached" });
  }

  async logout() {
    await Promise.all([
      this.page.waitForURL("**/dang-nhap"),
      this.page.locator("#profileLogout").click(),
    ]);
  }
}

module.exports = ProfilePage;
