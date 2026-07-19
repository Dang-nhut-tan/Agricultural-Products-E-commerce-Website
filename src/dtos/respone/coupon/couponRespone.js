class CouponRespone {
  constructor(coupon) {
    const data = coupon?.toJSON ? coupon.toJSON() : coupon;

    this.id = data.id;
    this.code = data.code;
    this.discount_type = data.discount_type;
    this.discount_value = data.discount_value;
    this.min_order_value = data.min_order_value;
    this.start_date = data.start_date;
    this.end_date = data.end_date;
    this.quantity = data.quantity;
    this.used_quantity = data.used_quantity;
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

module.exports = CouponRespone;
