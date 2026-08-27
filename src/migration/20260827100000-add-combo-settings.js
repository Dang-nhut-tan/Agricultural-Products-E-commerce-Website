"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("combo_settings", {
      id: { type: Sequelize.INTEGER, primaryKey: true },
      minimum_quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.bulkInsert("combo_settings", [{ id: 1, minimum_quantity: 1, created_at: new Date(), updated_at: new Date() }]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("combo_settings");
  },
};
