require("dotenv").config();
const { test, expect } = require("@playwright/test");
const AdminResourcePage = require("./pages/AdminResourcePage");
const { db, uniqueAdminData, findBy, exists, cleanupAdminData } = require("./helpers/adminTestData");

test.describe("Quản trị từng nhóm dữ liệu bằng AdminJS", () => {
  test.setTimeout(180_000);
  let data;

  test.beforeEach(async ({ page, browserName }) => {
    data = uniqueAdminData(browserName);
    await new AdminResourcePage(page).login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  });

  test.afterEach(async () => cleanupAdminData(data));

  test("Quản trị viên thêm, sửa, xóa và kiểm tra dữ liệu bắt buộc tại tab danh mục", async ({ page }) => {
    const admin = new AdminResourcePage(page);
    await test.step("Thêm một danh mục mới với tên hợp lệ", async () => {
      await admin.openNew("categories");
      await admin.fill("name", data.category.name);
      await admin.saveSuccessfully();
      expect(await exists(db.Category, { name: data.category.name })).toBe(true);
    });
    const category = await findBy(db.Category, { name: data.category.name });
    await test.step("Sửa tên danh mục và lưu thay đổi thành công", async () => {
      await admin.openEdit("categories", category.id);
      await admin.fill("name", data.category.updatedName);
      await admin.saveSuccessfully();
      expect(await exists(db.Category, { name: data.category.updatedName })).toBe(true);
    });
    await test.step("Xóa danh mục vừa tạo khỏi hệ thống", async () => {
      await admin.deleteRecord("categories", category.id);
      expect(await exists(db.Category, { id: category.id })).toBe(false);
    });
    await test.step("Không cho phép lưu danh mục khi thiếu tên bắt buộc", async () => {
      await admin.openNew("categories");
      expect(await admin.saveExpectingValidationError()).toBe(true);
    });
  });

  test("Quản trị viên thêm, sửa, xóa và kiểm tra dữ liệu bắt buộc tại tab nhà cung cấp", async ({ page }) => {
    const admin = new AdminResourcePage(page);
    await test.step("Thêm một nhà cung cấp mới với tên hợp lệ", async () => {
      await admin.openNew("brands");
      await admin.fill("name", data.brand.name);
      await admin.saveSuccessfully();
      expect(await exists(db.Brand, { name: data.brand.name })).toBe(true);
    });
    const brand = await findBy(db.Brand, { name: data.brand.name });
    await test.step("Sửa tên nhà cung cấp và lưu thay đổi thành công", async () => {
      await admin.openEdit("brands", brand.id);
      await admin.fill("name", data.brand.updatedName);
      await admin.saveSuccessfully();
      expect(await exists(db.Brand, { name: data.brand.updatedName })).toBe(true);
    });
    await test.step("Xóa nhà cung cấp vừa tạo khỏi hệ thống", async () => {
      await admin.deleteRecord("brands", brand.id);
      expect(await exists(db.Brand, { id: brand.id })).toBe(false);
    });
    await test.step("Không cho phép lưu nhà cung cấp khi thiếu tên bắt buộc", async () => {
      await admin.openNew("brands");
      expect(await admin.saveExpectingValidationError()).toBe(true);
    });
  });

  test("Quản trị viên thêm, sửa, xóa và kiểm tra dữ liệu bắt buộc tại tab người dùng", async ({ page }) => {
    const admin = new AdminResourcePage(page);
    await test.step("Thêm một người dùng mới với đầy đủ thông tin bắt buộc", async () => {
      await admin.openNew("users");
      await admin.fill("name", data.user.name);
      await admin.fill("email", data.user.email);
      await admin.fill("phone", data.user.phone);
      await admin.fill("failed_login_attempts", 0);
      await admin.select("Trạng thái", "Đang hoạt động");
      await admin.select("Vai trò", "Khách hàng");
      await admin.fill("password", data.user.password);
      await admin.saveSuccessfully();
      expect(await exists(db.User, { email: data.user.email })).toBe(true);
    });
    const user = await findBy(db.User, { email: data.user.email });
    await test.step("Sửa tên người dùng và lưu thay đổi thành công", async () => {
      await admin.openEdit("users", user.id);
      await admin.fill("name", data.user.updatedName);
      await admin.saveSuccessfully();
      expect(await exists(db.User, { email: data.user.email, name: data.user.updatedName })).toBe(true);
    });
    await test.step("Xóa người dùng vừa tạo khỏi hệ thống", async () => {
      await admin.deleteRecord("users", user.id);
      expect(await exists(db.User, { id: user.id })).toBe(false);
    });
    await test.step("Không cho phép lưu người dùng khi thiếu thông tin bắt buộc", async () => {
      await admin.openNew("users");
      await admin.fill("name", data.user.name);
      await admin.fill("email", data.user.email);
      expect(await admin.saveExpectingValidationError()).toBe(true);
    });
  });

  test("Quản trị viên thêm, sửa, xóa và kiểm tra giá trị không hợp lệ tại tab sản phẩm", async ({ page }) => {
    const admin = new AdminResourcePage(page);
    await db.Category.create({ name: data.category.updatedName });
    await db.Brand.create({ name: data.brand.updatedName });
    await test.step("Thêm một sản phẩm mới với danh mục và nhà cung cấp đã có", async () => {
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
      expect(await exists(db.Product, { name: data.product.name })).toBe(true);
    });
    const product = await findBy(db.Product, { name: data.product.name });
    await test.step("Sửa tên và giá sản phẩm rồi lưu thay đổi thành công", async () => {
      await admin.openEdit("products", product.id);
      await admin.fill("name", data.product.updatedName);
      await admin.fill("price", 16000);
      await admin.saveSuccessfully();
      expect(await exists(db.Product, { name: data.product.updatedName, price: 16000 })).toBe(true);
    });
    await test.step("Xóa sản phẩm vừa tạo khỏi hệ thống", async () => {
      await admin.deleteRecord("products", product.id);
      expect(await exists(db.Product, { id: product.id })).toBe(false);
    });
    await test.step("Không cho phép lưu sản phẩm có giá âm", async () => {
      await admin.openNew("products");
      await admin.fill("price", -1);
      expect(await admin.saveExpectingValidationError()).toBe(true);
    });
  });

  test("Quản trị viên thêm, sửa, xóa và kiểm tra dữ liệu bắt buộc tại tab tin tức", async ({ page }) => {
    const admin = new AdminResourcePage(page);
    await test.step("Thêm một bài viết mới với tiêu đề và nội dung hợp lệ", async () => {
      await admin.openNew("news");
      await admin.fill("title", data.news.title);
      await admin.fillRichText("Nội dung tin tức được tạo bởi Playwright");
      await admin.saveSuccessfully();
      expect(await exists(db.News, { title: data.news.title })).toBe(true);
    });
    const news = await findBy(db.News, { title: data.news.title });
    await test.step("Sửa tiêu đề bài viết và lưu thay đổi thành công", async () => {
      await admin.openEdit("news", news.id);
      await admin.fill("title", data.news.updatedTitle);
      await admin.saveSuccessfully();
      expect(await exists(db.News, { title: data.news.updatedTitle })).toBe(true);
    });
    await test.step("Xóa bài viết vừa tạo khỏi hệ thống", async () => {
      await admin.deleteRecord("news", news.id);
      expect(await exists(db.News, { id: news.id })).toBe(false);
    });
    await test.step("Không cho phép lưu bài viết khi thiếu tiêu đề", async () => {
      await admin.openNew("news");
      await admin.fillRichText("Nội dung không có tiêu đề");
      expect(await admin.saveExpectingValidationError()).toBe(true);
    });
  });

  test("Quản trị viên thêm, sửa, xóa và kiểm tra dữ liệu không hợp lệ tại tab banner", async ({ page }) => {
    const admin = new AdminResourcePage(page);
    await test.step("Thêm một banner mới với trạng thái hiển thị", async () => {
      await admin.openNew("banner");
      await admin.fill("name", data.banner.name);
      await admin.fill("sort_order", 0);
      await admin.select("Trạng thái", "Đang hiển thị");
      await admin.saveSuccessfully();
      expect(await exists(db.Banner, { name: data.banner.name })).toBe(true);
    });
    const banner = await findBy(db.Banner, { name: data.banner.name });
    await test.step("Sửa tên và thứ tự banner rồi lưu thay đổi thành công", async () => {
      await admin.openEdit("banner", banner.id);
      await admin.fill("name", data.banner.updatedName);
      await admin.fill("sort_order", 1);
      await admin.saveSuccessfully();
      expect(await exists(db.Banner, { name: data.banner.updatedName, sort_order: 1 })).toBe(true);
    });
    await test.step("Xóa banner vừa tạo khỏi hệ thống", async () => {
      await admin.deleteRecord("banner", banner.id);
      expect(await exists(db.Banner, { id: banner.id })).toBe(false);
    });
    await test.step("Không cho phép lưu banner có thứ tự không phải số", async () => {
      await admin.openNew("banner");
      await admin.fill("sort_order", "không-phải-số");
      expect(await admin.saveExpectingValidationError()).toBe(true);
    });
  });

  test("Quản trị viên thêm, sửa, xóa và kiểm tra giá trị không hợp lệ tại tab mã giảm giá", async ({ page }) => {
    const admin = new AdminResourcePage(page);
    await test.step("Thêm một mã giảm giá mới với đầy đủ điều kiện áp dụng", async () => {
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
      expect(await exists(db.Coupon, { code: data.coupon.code })).toBe(true);
    });
    const coupon = await findBy(db.Coupon, { code: data.coupon.code });
    await test.step("Sửa mã và số lượng phát hành rồi lưu thay đổi thành công", async () => {
      await admin.openEdit("coupons", coupon.id);
      await admin.fill("code", data.coupon.updatedCode);
      await admin.fill("quantity", 20);
      await admin.saveSuccessfully();
      expect(await exists(db.Coupon, { code: data.coupon.updatedCode, quantity: 20 })).toBe(true);
    });
    await test.step("Xóa mã giảm giá vừa tạo khỏi hệ thống", async () => {
      await admin.deleteRecord("coupons", coupon.id);
      expect(await exists(db.Coupon, { id: coupon.id })).toBe(false);
    });
    await test.step("Không cho phép lưu mã giảm giá có số lượng âm", async () => {
      await admin.openNew("coupons");
      await admin.fill("discount_type", 1);
      await admin.fill("quantity", -1);
      expect(await admin.saveExpectingValidationError()).toBe(true);
    });
  });
});
