"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable("cart_items");
    await queryInterface.dropTable("carts");
    await queryInterface.dropTable("wishlist_items");
    await queryInterface.dropTable("wishlists");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable("carts", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("cart_items", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      cart_id: {
        type: Sequelize.INTEGER,
        references: { model: "carts", key: "id" },
        onDelete: "CASCADE",
      },
      product_id: {
        type: Sequelize.INTEGER,
        references: { model: "products", key: "id" },
        onDelete: "CASCADE",
      },
      snapshot_name: { type: Sequelize.STRING },
      quantity: { type: Sequelize.INTEGER, defaultValue: 1 },
      price_at_add: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("wishlists", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("wishlist_items", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      wishlist_id: {
        type: Sequelize.INTEGER,
        references: { model: "wishlists", key: "id" },
        onDelete: "CASCADE",
      },
      product_id: {
        type: Sequelize.INTEGER,
        references: { model: "products", key: "id" },
        onDelete: "CASCADE",
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },
};
