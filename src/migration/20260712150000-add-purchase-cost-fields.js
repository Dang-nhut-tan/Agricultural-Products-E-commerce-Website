"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn("product_batches", "import_price", {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Giá nhập trên một đơn vị sản phẩm của lô",
      }, { transaction });

      await queryInterface.addColumn("order_details", "cost_price", {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Giá vốn được chốt tại thời điểm bán",
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn("order_details", "cost_price", { transaction });
      await queryInterface.removeColumn("product_batches", "import_price", { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
