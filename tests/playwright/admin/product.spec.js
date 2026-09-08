require("dotenv").config();
const { test, expect, db, findBy, exists } = require("./helpers/adminFixture");

test.describe("Quản trị sản phẩm bằng AdminJS", () => {
  test.setTimeout(180_000);

  test("Quản trị viên thêm, sửa, xóa và kiểm tra giá trị không hợp lệ", async ({ adminContext }) => {
    const { admin, data } = adminContext;
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

    await test.step("Không cho phép xóa tên bắt buộc khi cập nhật sản phẩm", async () => {
      await admin.openEdit("products", product.id);
      await admin.fill("name", "");
      expect(await admin.saveExpectingValidationError()).toBe(true);
      expect(await exists(db.Product, {
        id: product.id,
        name: data.product.updatedName,
        price: 16000,
      })).toBe(true);
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
});
