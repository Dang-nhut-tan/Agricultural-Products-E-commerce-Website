require("dotenv").config();
const { test, expect, db, findBy, exists } = require("./helpers/adminFixture");

test.describe("Quản trị nhà cung cấp bằng AdminJS", () => {
  test.setTimeout(180_000);

  test("Quản trị viên thêm, sửa, xóa và kiểm tra dữ liệu bắt buộc", async ({ adminContext }) => {
    const { admin, data } = adminContext;

    await test.step("Thêm một nhà cung cấp mới với tên hợp lệ", async () => {
      await admin.openNew("brands");
      await admin.fill("name", data.brand.name);
      await admin.saveSuccessfully();
      expect(await exists(db.Brand, { name: data.brand.name })).toBe(true);
    });

    await test.step("Không cho phép tạo nhà cung cấp có tên đã tồn tại", async () => {
      await admin.openNew("brands");
      await admin.fill("name", data.brand.name);
      expect(await admin.saveExpectingValidationError()).toBe(true);
      expect(await db.Brand.count({ where: { name: data.brand.name }, paranoid: false })).toBe(1);
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
});
