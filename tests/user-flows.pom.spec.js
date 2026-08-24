const { test, expect } = require("@playwright/test");
const AuthPage = require("./pages/AuthPage");
const ProfilePage = require("./pages/ProfilePage");
const CartPage = require("./pages/CartPage");
const { randomUser, deleteTestUser } = require("./helpers/testData");

test.describe("Luồng người dùng theo Page Object Model", () => {
  let user;

  test.beforeEach(async ({ browserName }) => {
    user = randomUser(browserName);
  });

  test.afterEach(async () => {
    await deleteTestUser(user.email);
  });

  test("đăng ký tài khoản mới", async ({ page }) => {
    const auth = new AuthPage(page);
    const profile = new ProfilePage(page);

    await auth.openRegister();
    await auth.register(user);
    await profile.waitUntilReady();

    await expect(profile.profileView).toContainText(user.name);
    await expect(profile.profileView).toContainText(user.email);
  });

  test("đăng nhập, sửa hồ sơ, thêm và xóa địa chỉ", async ({ page, request }) => {
    const registerResponse = await request.post("/api/auth/register", {
      data: {
        ...user,
        passwordConfirmation: user.password,
      },
    });
    expect(registerResponse.status()).toBe(201);
    await request.post("/api/auth/logout");

    const auth = new AuthPage(page);
    const profile = new ProfilePage(page);
    const updatedName = `${user.name} Updated`;
    const updatedPhone = "0987654321";
    const extraAddress = {
      receiverName: updatedName,
      address: "456 Le Loi",
      ward: "Ben Nghe",
      district: "Quan 1",
      province: "TP Ho Chi Minh",
    };

    await auth.openLogin();
    await auth.login(user.email, user.password);
    await profile.waitUntilReady();
    await profile.updateProfile(updatedName, updatedPhone);

    await expect(profile.profileView).toContainText(updatedName);
    await expect(profile.profileView).toContainText(updatedPhone);

    await profile.addAddress(extraAddress);
    await expect(profile.addressList).toContainText(extraAddress.address);

    await profile.deleteAddress(extraAddress.address);
    await expect(profile.addressList).not.toContainText(extraAddress.address);

    await profile.logout();
    await expect(page).toHaveURL(/\/dang-nhap$/);
  });

  test("thêm, tăng, giảm và xóa sản phẩm trong giỏ", async ({ page }) => {
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
