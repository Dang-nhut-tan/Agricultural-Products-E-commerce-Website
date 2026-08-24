require("dotenv").config();
const { test, expect } = require("@playwright/test");
const AdminResourcePage = require("./pages/AdminResourcePage");
const {
  db,
  uniqueAdminData,
  findBy,
  exists,
  cleanupAdminData,
} = require("./helpers/adminTestData");

test.describe("CRUD AdminJS theo Page Object Model", () => {
  test.setTimeout(180_000);
  let data;

  test.beforeEach(async ({ page, browserName }) => {
    data = uniqueAdminData(browserName);
    const admin = new AdminResourcePage(page);
    await admin.login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  });

  test.afterEach(async () => {
    await cleanupAdminData(data);
  });

  test("thêm, sửa và xóa tất cả resource nghiệp vụ", async ({ page }) => {
    const admin = new AdminResourcePage(page);

    await admin.openNew("categories");
    await admin.fill("name", data.category.name);
    await admin.saveSuccessfully();
    const category = await findBy(db.Category, { name: data.category.name });
    await admin.openEdit("categories", category.id);
    await admin.fill("name", data.category.updatedName);
    await admin.saveSuccessfully();
    expect(await exists(db.Category, { name: data.category.updatedName })).toBe(true);

    await admin.openNew("brands");
    await admin.fill("name", data.brand.name);
    await admin.saveSuccessfully();
    const brand = await findBy(db.Brand, { name: data.brand.name });
    await admin.openEdit("brands", brand.id);
    await admin.fill("name", data.brand.updatedName);
    await admin.saveSuccessfully();
    expect(await exists(db.Brand, { name: data.brand.updatedName })).toBe(true);

    await admin.openNew("users");
    await admin.fill("name", data.user.name);
    await admin.fill("email", data.user.email);
    await admin.fill("phone", data.user.phone);
    await admin.fill("failed_login_attempts", 0);
    await admin.select("Trạng thái", "Đang hoạt động");
    await admin.select("Vai trò", "Khách hàng");
    await admin.fill("password", data.user.password);
    await admin.saveSuccessfully();
    const user = await findBy(db.User, { email: data.user.email });
    await admin.openEdit("users", user.id);
    await admin.fill("name", data.user.updatedName);
    await admin.saveSuccessfully();
    expect(await exists(db.User, { email: data.user.email, name: data.user.updatedName })).toBe(true);

    await admin.openNew("products");
    await admin.fill("name", data.product.name);
    await admin.select("Danh mục", data.category.updatedName);
    await admin.select("Thương hiệu", data.brand.updatedName);
    await admin.fill("origin", "Việt Nam");
    await admin.fill("unit", "kg");
    await admin.select("Trạng thái", "Đang bán");
    await admin.fill("sold_count", 0);
    await admin.fill("specification", "Loại 1");
    await admin.fill("description", "Sản phẩm Playwright");
    await admin.fill("oldprice", 20000);
    await admin.fill("price", 15000);
    await admin.saveSuccessfully();
    const product = await findBy(db.Product, { name: data.product.name });
    await admin.openEdit("products", product.id);
    await admin.fill("name", data.product.updatedName);
    await admin.fill("price", 16000);
    await admin.saveSuccessfully();
    expect(await exists(db.Product, { name: data.product.updatedName, price: 16000 })).toBe(true);

    await admin.openNew("news");
    await admin.fill("title", data.news.title);
    await admin.fillRichText("Nội dung tin tức được tạo bởi Playwright");
    await admin.saveSuccessfully();
    const news = await findBy(db.News, { title: data.news.title });
    await admin.openEdit("news", news.id);
    await admin.fill("title", data.news.updatedTitle);
    await admin.saveSuccessfully();
    expect(await exists(db.News, { title: data.news.updatedTitle })).toBe(true);

    await admin.openNew("banner");
    await admin.fill("name", data.banner.name);
    await admin.fill("sort_order", 0);
    await admin.select("Trạng thái", "Đang hiển thị");
    await admin.saveSuccessfully();
    const banner = await findBy(db.Banner, { name: data.banner.name });
    await admin.openEdit("banner", banner.id);
    await admin.fill("name", data.banner.updatedName);
    await admin.fill("sort_order", 1);
    await admin.saveSuccessfully();
    expect(await exists(db.Banner, { name: data.banner.updatedName, sort_order: 1 })).toBe(true);

    await admin.openNew("coupons");
    await admin.select("Trạng thái", "Đang hoạt động");
    await admin.fill("used_quantity", 0);
    await admin.fill("quantity", 10);
    await admin.fillDate("Ngày bắt đầu", "2026-08-24");
    await admin.fillDate("Ngày kết thúc", "2026-12-31");
    await admin.fill("min_order_value", 0);
    await admin.fill("discount_value", 10);
    await admin.fill("discount_type", 1);
    await admin.fill("code", data.coupon.code);
    await admin.saveSuccessfully();
    const coupon = await findBy(db.Coupon, { code: data.coupon.code });
    await admin.openEdit("coupons", coupon.id);
    await admin.fill("code", data.coupon.updatedCode);
    await admin.fill("quantity", 20);
    await admin.saveSuccessfully();
    expect(await exists(db.Coupon, { code: data.coupon.updatedCode, quantity: 20 })).toBe(true);

    await admin.deleteRecord("products", product.id);
    expect(await exists(db.Product, { id: product.id })).toBe(false);
    await admin.deleteRecord("news", news.id);
    expect(await exists(db.News, { id: news.id })).toBe(false);
    await admin.deleteRecord("banner", banner.id);
    expect(await exists(db.Banner, { id: banner.id })).toBe(false);
    await admin.deleteRecord("coupons", coupon.id);
    expect(await exists(db.Coupon, { id: coupon.id })).toBe(false);
    await admin.deleteRecord("users", user.id);
    expect(await exists(db.User, { id: user.id })).toBe(false);
    await admin.deleteRecord("categories", category.id);
    expect(await exists(db.Category, { id: category.id })).toBe(false);
    await admin.deleteRecord("brands", brand.id);
    expect(await exists(db.Brand, { id: brand.id })).toBe(false);
  });

  test("từ chối dữ liệu thiếu hoặc sai bắt buộc", async ({ page }) => {
    const admin = new AdminResourcePage(page);
    const invalidCases = [
      ["categories", async () => {}],
      ["brands", async () => {}],
      ["users", async () => {
        await admin.fill("name", data.user.name);
        await admin.fill("email", data.user.email);
      }],
      ["products", async () => {
        await admin.fill("price", -1);
      }],
      ["news", async () => {
        await admin.fillRichText("Thiếu tiêu đề");
      }],
      ["banner", async () => {
        await admin.fill("sort_order", "không-phải-số");
      }],
      ["coupons", async () => {
        await admin.fill("discount_type", 1);
        await admin.fill("quantity", -1);
      }],
    ];

    for (const [resource, fillInvalid] of invalidCases) {
      await admin.openNew(resource);
      await fillInvalid();
      expect(await admin.saveExpectingValidationError()).toBe(true);
    }
  });
});
