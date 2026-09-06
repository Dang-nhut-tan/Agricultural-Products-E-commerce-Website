"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("coupon_users", ["coupon_id", "user_id"], {
      unique: true,
      name: "coupon_users_coupon_user_unique",
    });
    await queryInterface.addIndex("order_coupons", ["order_id"], {
      unique: true,
      name: "order_coupons_order_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("order_coupons", "order_coupons_order_unique");
    await queryInterface.removeIndex("coupon_users", "coupon_users_coupon_user_unique");
  },
};
