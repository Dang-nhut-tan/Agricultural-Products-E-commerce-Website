"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable("combos", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING, allowNull: false },
        description: { type: Sequelize.TEXT },
        image: { type: Sequelize.TEXT },
        size: { type: Sequelize.ENUM("small", "medium", "large"), allowNull: false, defaultValue: "small" },
        quantity_multiplier: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 1 },
        price_mode: { type: Sequelize.ENUM("percent", "fixed", "manual"), allowNull: false, defaultValue: "percent" },
        discount_value: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 10 },
        manual_price: { type: Sequelize.DECIMAL(12, 2) },
        minimum_quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        serving_from: { type: Sequelize.INTEGER },
        serving_to: { type: Sequelize.INTEGER },
        usage_days: { type: Sequelize.INTEGER },
        badge: { type: Sequelize.STRING },
        status: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      }, { transaction });
      await queryInterface.createTable("combo_items", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        combo_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "combos", key: "id" }, onDelete: "CASCADE" },
        product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "products", key: "id" }, onDelete: "RESTRICT" },
        base_quantity: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 1 },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      }, { transaction });
      await queryInterface.addConstraint("combo_items", {
        fields: ["combo_id", "product_id"], type: "unique", name: "combo_items_combo_product_unique", transaction,
      });
      await queryInterface.addColumn("order_details", "combo_id", { type: Sequelize.INTEGER, allowNull: true }, { transaction });
      await queryInterface.addColumn("order_details", "combo_name", { type: Sequelize.STRING, allowNull: true }, { transaction });
      await queryInterface.addColumn("order_details", "combo_quantity", { type: Sequelize.INTEGER, allowNull: true }, { transaction });
      const categoryColumns = await queryInterface.describeTable("categories");
      if (categoryColumns.image) await queryInterface.removeColumn("categories", "image", { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn("categories", "image", { type: Sequelize.TEXT }, { transaction });
      await queryInterface.removeColumn("order_details", "combo_quantity", { transaction });
      await queryInterface.removeColumn("order_details", "combo_name", { transaction });
      await queryInterface.removeColumn("order_details", "combo_id", { transaction });
      await queryInterface.dropTable("combo_items", { transaction });
      await queryInterface.dropTable("combos", { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
