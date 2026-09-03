const { test, expect } = require("@playwright/test");
const AuthPage = require("./pages/AuthPage");
const ProfilePage = require("./pages/ProfilePage");
const CartPage = require("./pages/CartPage");
const { randomUser, deleteTestUser } = require("./helpers/testData");

async function registerUser(request, user) {
  return request.post("/api/auth/register", {
    data: {
      ...user,
      passwordConfirmation: user.password,
    },
  });
}

test.describe("Các hành trình tài khoản và mua sắm của người dùng", () => {
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
