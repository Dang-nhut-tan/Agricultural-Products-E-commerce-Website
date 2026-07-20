const { test, expect } = require("@playwright/test");

test("API phản hồi khi chưa đăng nhập", async ({ request }) => {
  const response = await request.get("/api/auth/me");

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ message: "Bạn chưa đăng nhập." });
});
