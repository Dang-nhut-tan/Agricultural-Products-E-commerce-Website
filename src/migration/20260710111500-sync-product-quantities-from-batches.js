"use strict";

module.exports = {
  async up(queryInterface) {
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
  },
};
