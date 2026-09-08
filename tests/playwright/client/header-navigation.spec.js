const { test, expect } = require("@playwright/test");
const HeaderPage = require("./pages/HeaderPage");

test.describe("Người dùng điều hướng bằng header", () => {
  let headerPage;

  test.beforeEach(async ({ page }) => {
    headerPage = new HeaderPage(page);
  });

  test("Người dùng chọn logo để trở về trang chủ", async ({ page }) => {
    await test.step("Bước 1: Người dùng đang ở trang liên hệ", async () => {
      await headerPage.open("/lien-he");
    });

    await test.step("Bước 2: Người dùng chọn logo Nông Sản Xanh", async () => {
      await expect(headerPage.logo).toBeVisible();
      await headerPage.openLogo();
    });

    await test.step("Bước 3: Kiểm tra hệ thống trở về trang chủ", async () => {
      await expect(page).toHaveURL(/\/$/);
    });
  });

  test("Người dùng chọn Sản phẩm trên thanh điều hướng", async ({ page }) => {
    await headerPage.open("/lien-he");
    await headerPage.openNavigationLink("Sản phẩm");

    await expect(page).toHaveURL(/\/san-pham$/);
    await expect(headerPage.navigationLink("Sản phẩm")).toHaveAttribute("aria-current", "page");
  });

  test("Người dùng chọn Khuyến mãi trên header của trang nội dung", async ({ page }) => {
    await headerPage.open("/tin-tuc");
    await headerPage.openNavigationLink("Khuyến mãi");

    await expect(page).toHaveURL(/\/khuyen-mai$/);
  });

  test("Người dùng chọn Liên hệ và header đánh dấu đúng trang hiện tại", async ({ page }) => {
    await headerPage.open("/san-pham");
    await headerPage.openNavigationLink("Liên hệ");

    await expect(page).toHaveURL(/\/lien-he$/);
    await expect(headerPage.navigationLink("Liên hệ")).toHaveAttribute("aria-current", "page");
  });

  test("Người dùng mở giỏ hàng từ header của trang nội dung", async ({ page }) => {
    await headerPage.open("/tin-tuc");
    await headerPage.openCart();

    await expect(page).toHaveURL(/\/gio-hang$/);
  });

  test("Người dùng mở trang đăng nhập từ nút Tài khoản", async ({ page }) => {
    await headerPage.open("/tin-tuc");
    await headerPage.openAccount();

    await expect(page).toHaveURL(/\/dang-nhap$/);
  });
});

test.describe("Người dùng thao tác với header trang chủ", () => {
  let headerPage;

  test.beforeEach(async ({ page }) => {
    headerPage = new HeaderPage(page);
    await headerPage.open("/");
  });

  test("Người dùng chọn Khuyến mãi để đến khu sản phẩm trên trang chủ", async ({ page }) => {
    await headerPage.openNavigationLink("Khuyến mãi");

    await expect(page).toHaveURL(/\/#products$/);
    await expect(page.locator("#products")).toBeVisible();
  });

  test("Người dùng mở giỏ hàng dạng drawer từ header trang chủ", async () => {
    await headerPage.openCart();

    await expect(headerPage.cartDrawer).toHaveClass(/open/);
    await expect(headerPage.backdrop).toHaveClass(/open/);
  });

  test("Người dùng có thể mở và đóng menu điều hướng trên màn hình nhỏ", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await expect(headerPage.mobileMenu).toHaveAttribute("aria-expanded", "false");

    await headerPage.toggleMobileMenu();
    await expect(headerPage.mobileMenu).toHaveAttribute("aria-expanded", "true");
    await expect(headerPage.navigation).toHaveClass(/open/);

    await headerPage.toggleMobileMenu();
    await expect(headerPage.mobileMenu).toHaveAttribute("aria-expanded", "false");
    await expect(headerPage.navigation).not.toHaveClass(/open/);
  });
});
