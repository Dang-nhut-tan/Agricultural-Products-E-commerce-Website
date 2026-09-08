const {
  normalizeCode,
  validateCouponRecord,
  calculateDiscount,
} = require("../../../src/services/couponService");

const activeCoupon = (overrides = {}) => Object.assign({
  code: "SALE10",
  status: 1,
  discount_type: 1,
  discount_value: 10,
  min_order_value: 100000,
  quantity: 100,
  used_quantity: 2,
  start_date: "2026-01-01T00:00:00.000Z",
  end_date: "2026-12-31T23:59:59.999Z",
}, overrides);

describe("Quy tắc áp dụng mã giảm giá", () => {
  const now = new Date("2026-09-02T00:00:00.000Z");

  it("chuẩn hóa mã trước khi tra cứu", () => {
    expect(normalizeCode(" sale10 ")).toBe("SALE10");
  });

  it("tính mức giảm theo phần trăm và số tiền cố định nhưng không vượt quá tạm tính", () => {
    expect(calculateDiscount(activeCoupon(), 250000)).toBe(25000);
    expect(calculateDiscount(activeCoupon({ discount_type: 2, discount_value: 300000 }), 250000)).toBe(250000);
  });

  it("từ chối mã giảm giá nằm ngoài thời gian hiệu lực", () => {
    expect(validateCouponRecord(activeCoupon({ start_date: "2026-10-01" }), 200000, now)).toMatch(/chưa đến/);
    expect(validateCouponRecord(activeCoupon({ end_date: "2026-08-01" }), 200000, now)).toMatch(/hết hạn/);
  });

  it("từ chối mã đã hết lượt và đơn hàng chưa đạt giá trị tối thiểu", () => {
    expect(validateCouponRecord(activeCoupon({ used_quantity: 100 }), 200000, now)).toMatch(/hết lượt/);
    expect(validateCouponRecord(activeCoupon(), 99999, now)).toMatch(/tối thiểu/);
  });

  it.each([
    ["đúng thời điểm bắt đầu", { start_date: now.toISOString() }],
    ["đúng thời điểm kết thúc", { end_date: now.toISOString() }],
    ["đơn hàng đúng giá trị tối thiểu", {}, 100000],
    ["còn đúng một lượt sử dụng", { used_quantity: 99 }],
  ])("chấp nhận coupon tại biên %s", (_label, overrides, subtotal = 200000) => {
    expect(validateCouponRecord(activeCoupon(overrides), subtotal, now)).toBeNull();
  });

  it.each([
    ["ngay trước thời điểm bắt đầu", { start_date: "2026-09-02T00:00:00.001Z" }, /chưa đến/],
    ["ngay sau thời điểm kết thúc", { end_date: "2026-09-01T23:59:59.999Z" }, /hết hạn/],
    ["vượt số lượt cho phép", { used_quantity: 101 }, /hết lượt/],
  ])("từ chối coupon tại biên %s", (_label, overrides, message) => {
    expect(validateCouponRecord(activeCoupon(overrides), 200000, now)).toMatch(message);
  });

  it.each([
    ["0 phần trăm", 0, 0],
    ["100 phần trăm", 100, 200000],
    ["trên 100 phần trăm", 101, 200000],
  ])("giới hạn mức giảm tại biên %s", (_label, discountValue, expected) => {
    const coupon = activeCoupon({ discount_value: discountValue });
    expect(calculateDiscount(coupon, 200000)).toBe(expected);
  });

  it("coi tạm tính âm là phân vùng không hợp lệ và không tạo tiền giảm", () => {
    expect(calculateDiscount(activeCoupon(), -1)).toBe(0);
  });
});
