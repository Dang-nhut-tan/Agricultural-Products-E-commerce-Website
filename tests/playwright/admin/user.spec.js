require("dotenv").config();
const { test, expect, db, findBy, exists } = require("./helpers/adminFixture");

test.describe("Quản trị người dùng bằng AdminJS", () => {
  test.setTimeout(180_000);

  test("Quản trị viên thêm, sửa, xóa và kiểm tra dữ liệu bắt buộc", async ({ adminContext }) => {
    const { admin, data } = adminContext;

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

    await test.step("Không cho phép tạo người dùng có email đã tồn tại", async () => {
      await admin.openNew("users");
      await admin.fill("name", `${data.user.name} Duplicate`);
      await admin.fill("email", data.user.email);
      await admin.fill("phone", data.user.phone);
      await admin.fill("failed_login_attempts", 0);
      await admin.select("Trạng thái", "Đang hoạt động");
      await admin.select("Vai trò", "Khách hàng");
      await admin.fill("password", data.user.password);
      expect(await admin.saveExpectingValidationError()).toBe(true);
      expect(await db.User.count({ where: { email: data.user.email } })).toBe(1);
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
});
