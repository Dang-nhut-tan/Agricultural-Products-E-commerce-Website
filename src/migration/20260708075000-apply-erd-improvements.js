"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "status", {
      type: Sequelize.INTEGER,
      defaultValue: 1,
    });

    await queryInterface.addColumn("categories", "deleted_at", Sequelize.DATE);
    await queryInterface.addColumn("brands", "deleted_at", Sequelize.DATE);
    await queryInterface.addIndex("categories", ["name"], {
      unique: true,
      name: "categories_name_unique",
    });
    await queryInterface.addIndex("brands", ["name"], {
      unique: true,
      name: "brands_name_unique",
    });

    await queryInterface.addColumn("products", "status", {
      type: Sequelize.INTEGER,
      defaultValue: 1,
    });
    await queryInterface.addColumn("products", "deleted_at", Sequelize.DATE);

    await queryInterface.addColumn("product_images", "sort_order", {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });

    await queryInterface.addColumn("feedback", "order_detail_id", {
      type: Sequelize.INTEGER,
      references: { model: "order_details", key: "id" },
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("cart_items", "snapshot_name", Sequelize.STRING);
    await queryInterface.addColumn("order_details", "product_name", Sequelize.STRING);

    await queryInterface.addColumn("payments", "transaction_code", Sequelize.STRING);
    await queryInterface.addColumn("payments", "gateway_response", Sequelize.TEXT);

    await queryInterface.addColumn("shipments", "ward", Sequelize.STRING);
    await queryInterface.addColumn("shipments", "district", Sequelize.STRING);
    await queryInterface.addColumn("shipments", "province", Sequelize.STRING);

    await queryInterface.addColumn("news", "deleted_at", Sequelize.DATE);
    await queryInterface.addColumn("banner", "sort_order", {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });
    await queryInterface.addColumn("banner", "deleted_at", Sequelize.DATE);

    await queryInterface.addColumn("coupons", "used_quantity", {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });
    await queryInterface.addColumn("coupons", "deleted_at", Sequelize.DATE);

    await queryInterface.createTable("coupon_users", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      coupon_id: {
        type: Sequelize.INTEGER,
        references: { model: "coupons", key: "id" },
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      used_at: { type: Sequelize.DATE },
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

    await queryInterface.createTable("inventory_transactions", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      batch_id: {
        type: Sequelize.INTEGER,
        references: { model: "product_batches", key: "id" },
        onDelete: "CASCADE",
      },
      type: { type: Sequelize.STRING },
      quantity: { type: Sequelize.INTEGER, defaultValue: 0 },
      reference_type: { type: Sequelize.STRING },
      reference_id: { type: Sequelize.INTEGER },
      note: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("inventory_transactions");
    await queryInterface.dropTable("wishlist_items");
    await queryInterface.dropTable("wishlists");
    await queryInterface.dropTable("coupon_users");

    await queryInterface.removeColumn("coupons", "deleted_at");
    await queryInterface.removeColumn("coupons", "used_quantity");
    await queryInterface.removeColumn("banner", "deleted_at");
    await queryInterface.removeColumn("banner", "sort_order");
    await queryInterface.removeColumn("news", "deleted_at");
    await queryInterface.removeColumn("shipments", "province");
    await queryInterface.removeColumn("shipments", "district");
    await queryInterface.removeColumn("shipments", "ward");
    await queryInterface.removeColumn("payments", "gateway_response");
    await queryInterface.removeColumn("payments", "transaction_code");
    await queryInterface.removeColumn("order_details", "product_name");
    await queryInterface.removeColumn("cart_items", "snapshot_name");
    await queryInterface.removeColumn("feedback", "order_detail_id");
    await queryInterface.removeColumn("product_images", "sort_order");
    await queryInterface.removeColumn("products", "deleted_at");
    await queryInterface.removeColumn("products", "status");
    await queryInterface.removeIndex("brands", "brands_name_unique");
    await queryInterface.removeIndex("categories", "categories_name_unique");
    await queryInterface.removeColumn("brands", "deleted_at");
    await queryInterface.removeColumn("categories", "deleted_at");
    await queryInterface.removeColumn("users", "status");
  },
};
