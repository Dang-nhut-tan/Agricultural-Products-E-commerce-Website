require("dotenv").config();
const { test, expect, db, findBy, exists } = require("./helpers/adminFixture");

test.describe("Quản trị banner bằng AdminJS", () => {
  test.setTimeout(180_000);

  test("Quản trị viên thêm, sửa, xóa và kiểm tra dữ liệu không hợp lệ", async ({ adminContext }) => {
    const { admin, data } = adminContext;

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

    await test.step("Không cho phép xóa tên bắt buộc khi cập nhật banner", async () => {
      await admin.openEdit("banner", banner.id);
      await admin.fill("name", "");
      expect(await admin.saveExpectingValidationError()).toBe(true);
      expect(await exists(db.Banner, {
        id: banner.id,
        name: data.banner.updatedName,
        sort_order: 1,
      })).toBe(true);
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
});
