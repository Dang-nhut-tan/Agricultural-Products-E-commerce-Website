const { test, expect } = require("@playwright/test");

test.describe("Bảo vệ các luồng cơ bản", () => {
  test("các trang công khai quan trọng tải thành công", async ({ page }) => {
    for (const path of ["/", "/san-pham", "/combo-nha-hang", "/tin-tuc", "/lien-he"]) {
      const response = await page.goto(path);
      expect(response, `Không nhận được response từ ${path}`).not.toBeNull();
      expect(response.status(), `${path} trả HTTP lỗi`).toBeLessThan(400);
      await expect(page.locator("body")).not.toBeEmpty();
    }
  });

  test("catalog công khai trả cấu trúc dữ liệu ổn định", async ({ request }) => {
    const endpoints = [
      { path: "/api/storefront", fields: ["products", "categories", "pagination"] },
      { path: "/api/storefront/grouped", fields: ["categories"] },
      { path: "/api/products", fields: ["data", "pagination"] },
      { path: "/api/categories", fields: ["data"] },
      { path: "/api/brands", fields: ["data"] },
      { path: "/api/combos", fields: ["data"] },
      { path: "/api/news", fields: ["data"] },
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint.path);
      expect(response.status(), `${endpoint.path} không thành công`).toBe(200);
      expect(response.headers()["content-type"]).toContain("application/json");
      const payload = await response.json();
      for (const field of endpoint.fields) expect(payload).toHaveProperty(field);
    }
  });

  test("API riêng tư từ chối người chưa đăng nhập", async ({ request }) => {
    const calls = [
      () => request.get("/api/orders"),
      () => request.get("/api/auth/addresses"),
      () => request.put("/api/auth/profile", { data: { name: "Test" } }),
      () => request.post("/api/chat", { data: { message: "Tư vấn sản phẩm" } }),
      () => request.post("/api/recipes/suggest", { data: { query: "canh chua" } }),
      () => request.post("/api/payments/paypal/orders", { data: { items: [], addressId: 1 } }),
    ];

    for (const call of calls) {
      const response = await call();
      expect(response.status()).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        message: expect.any(String),
      });
    }
  });

  test("API quản trị từ chối session khách hoặc chưa đăng nhập", async ({ request }) => {
    for (const endpoint of ["/api/users", "/api/coupons"]) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
    }

    for (const endpoint of ["/api/categories", "/api/brands", "/api/news", "/api/banners"]) {
      const response = await request.post(endpoint, { data: {} });
      expect(response.status()).toBe(401);
    }
  });

  test("đăng nhập sai hiển thị lỗi và không mở trang tài khoản", async ({ page }) => {
    await page.goto("/dang-nhap");
    await page.locator('#authForm [name="email"]').fill("khong-ton-tai@example.com");
    await page.locator('#authForm [name="password"]').fill("SaiMatKhau123");
    await page.locator("#authForm").getByRole("button").click();

    await expect(page.locator("#authError")).toBeVisible();
    await expect(page.locator("#authError")).not.toBeEmpty();
    await expect(page).toHaveURL(/\/dang-nhap$/);
  });

  test("trang quản trị chuyển người chưa xác thực về form đăng nhập", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });
});
