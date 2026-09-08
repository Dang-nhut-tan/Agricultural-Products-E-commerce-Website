const { test, expect } = require("@playwright/test");
const AuthPage = require("./pages/AuthPage");
const ProfilePage = require("./pages/ProfilePage");
const CartPage = require("./pages/CartPage");
const { randomUser, deleteTestUser } = require("./helpers/testData");

async function registerUser(request, user) {
  return request.post("/api/auth/register", {
    data: Object.assign({}, user, {
      passwordConfirmation: user.password,
    }),
  });
}

test.describe("Các hành trình tài khoản và mua sắm của người dùng", () => {
  test.setTimeout(60_000);

  let user;

  test.beforeEach(async ({ browserName }) => {
    user = randomUser(browserName);
  });

  test.afterEach(async () => {
    await deleteTestUser(user.email);
  });

  test("Người dùng đăng ký tài khoản mới", async ({ page }) => {
    const auth = new AuthPage(page);
    const profile = new ProfilePage(page);

    await auth.openRegister();
    await auth.register(user);
    await profile.waitUntilReady();

    await expect(profile.profileView).toContainText(user.name);
    await expect(profile.profileView).toContainText(user.email);
  });

  test("Người chưa đăng nhập mở trang hồ sơ sẽ được chuyển đến trang đăng nhập", async ({ page }) => {
    await page.goto("/tai-khoan");

    await expect(page).toHaveURL(/\/dang-nhap$/);
  });

  test("Người dùng hủy chỉnh sửa hồ sơ và địa chỉ thì dữ liệu không bị thay đổi", async ({ page, request }) => {
    const auth = new AuthPage(page);
    const profile = new ProfilePage(page);
    const response = await registerUser(request, user);
    expect(response.status()).toBe(201);
    await request.post("/api/auth/logout");
    await auth.openLogin();
    await auth.login(user.email, user.password);
    await profile.waitUntilReady();

    await profile.openProfileForm();
    await profile.profileForm.locator('[name="name"]').fill("Tên không được lưu");
    await profile.cancelProfileChanges();
    await expect(profile.profileView).toContainText(user.name);
    await expect(profile.profileView).not.toContainText("Tên không được lưu");

    await profile.openAddressForm();
    await profile.addressForm.locator('[name="receiver_name"]').fill("Địa chỉ không được lưu");
    await profile.cancelAddressChanges();
    await expect(profile.addressForm).toBeHidden();
    await expect(profile.addressList).not.toContainText("Địa chỉ không được lưu");
  });

  test("Trang hồ sơ chặn dữ liệu rỗng ở các trường bắt buộc", async ({ page, request }) => {
    const auth = new AuthPage(page);
    const profile = new ProfilePage(page);
    const response = await registerUser(request, user);
    expect(response.status()).toBe(201);
    await request.post("/api/auth/logout");
    await auth.openLogin();
    await auth.login(user.email, user.password);
    await profile.waitUntilReady();

    await profile.openProfileForm();
    const nameInput = profile.profileForm.locator('[name="name"]');
    await nameInput.fill("");
    await profile.profileForm.getByRole("button", { name: "Lưu thông tin" }).click();
    expect(await nameInput.evaluate((input) => input.validity.valueMissing)).toBe(true);
    await expect(profile.profileForm).toBeVisible();

    await profile.cancelProfileChanges();
    await profile.openAddressForm();
    const receiverInput = profile.addressForm.locator('[name="receiver_name"]');
    await profile.addressForm.getByRole("button", { name: "Lưu địa chỉ" }).click();
    expect(await receiverInput.evaluate((input) => input.validity.valueMissing)).toBe(true);
    await expect(profile.addressForm).toBeVisible();
  });

  test("Người dùng mở lịch sử mua hàng từ trang hồ sơ", async ({ page, request }) => {
    const auth = new AuthPage(page);
    const profile = new ProfilePage(page);
    const response = await registerUser(request, user);
    expect(response.status()).toBe(201);
    await request.post("/api/auth/logout");
    await auth.openLogin();
    await auth.login(user.email, user.password);
    await profile.waitUntilReady();

    await expect(profile.orderHistoryLink).toBeVisible();
    await profile.openOrderHistory();
    await expect(page).toHaveURL(/\/don-hang$/);
  });

  test("Người dùng đăng nhập và cập nhật thông tin cá nhân tại trang hồ sơ", async ({ page, request }) => {
    const auth = new AuthPage(page);
    const profile = new ProfilePage(page);
    const updatedName = `${user.name} Updated`;
    const updatedPhone = "0987654321";

    await test.step("Điều kiện ban đầu: người dùng đã có tài khoản hợp lệ", async () => {
      const response = await registerUser(request, user);
      expect(response.status()).toBe(201);
      await request.post("/api/auth/logout");
    });

    await test.step("Bước 1: Người dùng đăng nhập và mở trang hồ sơ cá nhân", async () => {
      await auth.openLogin();
      await auth.login(user.email, user.password);
      await profile.waitUntilReady();
    });

    await test.step("Bước 2: Người dùng sửa họ tên và số điện thoại", async () => {
      await profile.updateProfile(updatedName, updatedPhone);
    });

    await test.step("Bước 3: Kiểm tra thông tin cá nhân mới được hiển thị trên hồ sơ", async () => {
      await expect(profile.profileView).toContainText(updatedName);
      await expect(profile.profileView).toContainText(updatedPhone);
    });
  });

  test("Người dùng đăng nhập, thêm và xóa địa chỉ giao hàng", async ({ page, request }) => {
    const auth = new AuthPage(page);
    const profile = new ProfilePage(page);
    const extraAddress = {
      receiverName: user.name,
      address: "456 Le Loi",
      ward: "Ben Nghe",
      district: "Quan 1",
      province: "TP Ho Chi Minh",
    };

    const registerResponse = await registerUser(request, user);
    expect(registerResponse.status()).toBe(201);
    await request.post("/api/auth/logout");
    await auth.openLogin();
    await auth.login(user.email, user.password);
    await profile.waitUntilReady();

    await profile.addAddress(extraAddress);
    await expect(profile.addressList).toContainText(extraAddress.address);

    await profile.deleteAddress(extraAddress.address);
    await expect(profile.addressList).not.toContainText(extraAddress.address);

    await profile.logout();
    await expect(page).toHaveURL(/\/dang-nhap$/);
  });

  test("Người dùng đã đăng nhập bình luận vào một sản phẩm đang bán", async ({ request }) => {
    let product;
    const comment = `Bình luận Playwright ${Date.now()}`;
    const star = 5;

    await test.step("Điều kiện ban đầu: người dùng đã đăng nhập và hệ thống có sản phẩm đang bán", async () => {
      const registerResponse = await registerUser(request, user);
      expect(registerResponse.status()).toBe(201);

      const productResponse = await request.get("/api/products?limit=24");
      expect(productResponse.status()).toBe(200);
      const products = (await productResponse.json()).data;
      [product] = products;
      expect(product, "Cần có ít nhất một sản phẩm đang bán").toBeTruthy();
    });

    let createdFeedback;
    await test.step("Bước 1: Người dùng gửi nội dung bình luận và số sao cho sản phẩm", async () => {
      const response = await request.post(`/api/products/${product.id}/comments`, {
        data: { content: comment, star },
      });
      expect(response.status()).toBe(201);
      createdFeedback = (await response.json()).data;
    });

    await test.step("Bước 2: Kiểm tra hệ thống lưu đúng nội dung, số sao và người bình luận", async () => {
      expect(createdFeedback).toMatchObject({
        content: comment,
        star,
      });
      expect(createdFeedback.User).toMatchObject({ name: user.name });
    });

    await test.step("Bước 3: Kiểm tra bình luận mới xuất hiện trong danh sách bình luận của sản phẩm", async () => {
      const response = await request.get(`/api/products/${product.id}/comments`);
      expect(response.status()).toBe(200);
      const feedback = (await response.json()).data;
      expect(feedback).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: createdFeedback.id, content: comment, star }),
      ]));
    });
  });

  test("Người dùng thêm, tăng, giảm và xóa sản phẩm trong giỏ", async ({ page }) => {
    const cart = new CartPage(page);

    await cart.addFirstAvailableProduct();
    await cart.open();
    await expect(cart.items).toHaveCount(1);
    await expect.poll(() => cart.quantity()).toBe(1);

    await cart.increase();
    await expect.poll(() => cart.quantity()).toBe(2);

    await cart.decrease();
    await expect.poll(() => cart.quantity()).toBe(1);

    await cart.remove();
    await expect(cart.items).toHaveCount(0);
    await expect(cart.emptyCart).toBeVisible();
  });
});
