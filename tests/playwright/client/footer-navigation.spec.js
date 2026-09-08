const { test, expect } = require("@playwright/test");
const FooterPage = require("./pages/FooterPage");

const footerPages = [
  { linkName: "Sản phẩm", path: "/san-pham" },
  { linkName: "Về chúng tôi", path: "/gioi-thieu" },
  { linkName: "Tin tức", path: "/tin-tuc" },
  { linkName: "Liên hệ", path: "/lien-he" },
  { linkName: "Giỏ hàng", path: "/gio-hang" },
  { linkName: "Tài khoản", path: "/tai-khoan" },
];

test.describe("Người dùng điều hướng bằng chân trang", () => {
  let footerPage;

  test.beforeEach(async ({ page }) => {
    footerPage = new FooterPage(page);
    await footerPage.openHome();
  });

  for (const footerItem of footerPages) {
    test(`Người dùng chọn ${footerItem.linkName} và được chuyển đến đúng trang`, async ({ page }) => {
      await test.step("Bước 1: Kiểm tra liên kết được hiển thị trong chân trang", async () => {
        await expect(footerPage.footerLink(footerItem.linkName)).toBeVisible();
      });

      await test.step(`Bước 2: Người dùng chọn ${footerItem.linkName}`, async () => {
        await footerPage.openPageFromFooter(footerItem.linkName);
      });

      await test.step("Bước 3: Kiểm tra hệ thống chuyển đến đúng địa chỉ", async () => {
        await expect(page).toHaveURL(new RegExp(`${footerItem.path}$`));
      });
    });
  }
});
