"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("recipe_sources", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      file_path: { type: Sequelize.TEXT, allowNull: false },
      file_name: { type: Sequelize.STRING },
      mime_type: { type: Sequelize.STRING },
      file_size: { type: Sequelize.INTEGER },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: "processing" },
      error_message: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("recipe_sources");
  },
};
