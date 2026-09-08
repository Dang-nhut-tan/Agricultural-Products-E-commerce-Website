require("dotenv").config();
const { test, expect, db, findBy, exists } = require("./helpers/adminFixture");

test.describe("Quản trị danh mục bằng AdminJS", () => {
  test.setTimeout(180_000);

  test("Quản trị viên thêm, sửa, xóa và kiểm tra dữ liệu bắt buộc", async ({ adminContext }) => {
    const { admin, data } = adminContext;

    await test.step("Thêm một danh mục mới với tên hợp lệ", async () => {
      await admin.openNew("categories");
      await admin.fill("name", data.category.name);
      await admin.saveSuccessfully();
      expect(await exists(db.Category, { name: data.category.name })).toBe(true);
    });

    await test.step("Không cho phép tạo danh mục có tên đã tồn tại", async () => {
      await admin.openNew("categories");
      await admin.fill("name", data.category.name);
      expect(await admin.saveExpectingValidationError()).toBe(true);
      expect(await db.Category.count({ where: { name: data.category.name }, paranoid: false })).toBe(1);
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
});
