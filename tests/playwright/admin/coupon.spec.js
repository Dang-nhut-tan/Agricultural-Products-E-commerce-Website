require("dotenv").config();
const { test, expect, db, findBy, exists } = require("./helpers/adminFixture");

test.describe("Quản trị mã giảm giá bằng AdminJS", () => {
  test.setTimeout(180_000);

  async function fillCoupon(admin, code) {
    await admin.select("Trạng thái", "Đang hoạt động");
    await admin.fill("used_quantity", 0);
    await admin.fill("quantity", 10);
    await admin.fillDate("Ngày bắt đầu", "2026-08-24");
    await admin.fillDate("Ngày kết thúc", "2026-12-31");
    await admin.fill("min_order_value", 0);
    await admin.fill("discount_value", 10);
    await admin.fill("discount_type", 1);
    await admin.fill("code", code);
  }

  test("Quản trị viên thêm, sửa, xóa và kiểm tra giá trị không hợp lệ", async ({ adminContext }) => {
    const { admin, data } = adminContext;

    await test.step("Thêm một mã giảm giá mới với đầy đủ điều kiện áp dụng", async () => {
      await admin.openNew("coupons");
      await fillCoupon(admin, data.coupon.code);
      await admin.saveSuccessfully();
      expect(await exists(db.Coupon, { code: data.coupon.code })).toBe(true);
    });

    await test.step("Không cho phép tạo mã giảm giá có code đã tồn tại", async () => {
      await admin.openNew("coupons");
      await fillCoupon(admin, data.coupon.code.toLowerCase());
      expect(await admin.saveExpectingValidationError()).toBe(true);
      expect(await db.Coupon.count({ where: { code: data.coupon.code }, paranoid: false })).toBe(1);
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
