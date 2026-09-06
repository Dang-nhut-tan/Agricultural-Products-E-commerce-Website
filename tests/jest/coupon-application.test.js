const {
  normalizeCode,
  validateCouponRecord,
  calculateDiscount,
} = require("../../src/services/couponService");

const activeCoupon = (overrides = {}) => ({
  code: "SALE10",
  status: 1,
  discount_type: 1,
  discount_value: 10,
  min_order_value: 100000,
  quantity: 100,
  used_quantity: 2,
  start_date: "2026-01-01T00:00:00.000Z",
  end_date: "2026-12-31T23:59:59.999Z",
  ...overrides,
});

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
});
