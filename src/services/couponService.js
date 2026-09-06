const normalizeCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

function validateCouponRecord(coupon, subtotal, now = new Date()) {
  if (!coupon || Number(coupon.status) !== 1) {
    return "Mã giảm giá không tồn tại hoặc đã ngừng áp dụng.";
  }
  if (
    ![1, 2].includes(Number(coupon.discount_type)) ||
    Number(coupon.discount_value) <= 0
  ) {
    return "Mã giảm giá có cấu hình không hợp lệ.";
  }
  const startDate = coupon.start_date ? new Date(coupon.start_date) : null;
  const endDate = coupon.end_date ? new Date(coupon.end_date) : null;
  if (startDate && startDate > now)
    return "Mã giảm giá chưa đến thời gian áp dụng.";
  if (endDate && endDate < now) return "Mã giảm giá đã hết hạn.";
  if (Number(coupon.quantity) <= Number(coupon.used_quantity || 0)) {
    return "Mã giảm giá đã hết lượt sử dụng.";
  }
  if (Number(subtotal) < Number(coupon.min_order_value || 0)) {
    return `Đơn hàng phải đạt tối thiểu ${Number(coupon.min_order_value || 0).toLocaleString("vi-VN")} ₫ để dùng mã này.`;
  }
  return null;
}

function calculateDiscount(coupon, subtotal) {
  const amount = Math.max(0, Number(subtotal) || 0);
  const value = Math.max(0, Number(coupon.discount_value) || 0);
  const discount =
    Number(coupon.discount_type) === 1
      ? (amount * Math.min(value, 100)) / 100
      : value;
  return Math.min(amount, Math.round(discount));
}

module.exports = { normalizeCode, validateCouponRecord, calculateDiscount };
