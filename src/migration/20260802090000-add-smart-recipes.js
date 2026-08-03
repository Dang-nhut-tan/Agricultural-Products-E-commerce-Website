"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("recipes", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      aliases: { type: Sequelize.TEXT },
      ingredients: { type: Sequelize.TEXT("long"), allowNull: false },
      steps: { type: Sequelize.TEXT("long"), allowNull: false },
      safety_notes: { type: Sequelize.TEXT },
      image: { type: Sequelize.TEXT },
      source: { type: Sequelize.STRING, defaultValue: "pdf" },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await queryInterface.createTable("recipe_product_links", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      recipe_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "recipes", key: "id" }, onDelete: "CASCADE" },
      ingredient_name: { type: Sequelize.STRING, allowNull: false },
      aliases: { type: Sequelize.TEXT },
      product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "products", key: "id" }, onDelete: "CASCADE" },
      priority: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("recipe_product_links");
    await queryInterface.dropTable("recipes");
  },
};
