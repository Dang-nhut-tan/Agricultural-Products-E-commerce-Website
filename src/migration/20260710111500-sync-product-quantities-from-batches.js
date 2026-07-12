"use strict";

module.exports = {
  async up(queryInterface) {
    // Đồng bộ dữ liệu cũ: tổng tồn kho bằng tổng số lượng còn lại của các lô.
    await queryInterface.sequelize.query(`
      UPDATE products AS p
      SET p.quantity = (
        SELECT COALESCE(SUM(pb.remaining_quantity), 0)
        FROM product_batches AS pb
        WHERE pb.product_id = p.id
      )
    `);
  },

  async down() {
    // Không thể khôi phục giá trị nhập tay trước đó một cách đáng tin cậy.
  },
};
