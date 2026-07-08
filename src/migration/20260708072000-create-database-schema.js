"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING, allowNull: false },
      name: { type: Sequelize.STRING },
      role: { type: Sequelize.INTEGER, defaultValue: 2 },
      avatar: { type: Sequelize.STRING },
      phone: { type: Sequelize.STRING },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("user_addresses", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      receiver_name: { type: Sequelize.STRING },
      phone: { type: Sequelize.STRING },
      address: { type: Sequelize.TEXT },
      ward: { type: Sequelize.STRING },
      district: { type: Sequelize.STRING },
      province: { type: Sequelize.STRING },
      is_default: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("categories", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      image: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("brands", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      image: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("products", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      oldprice: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      image: { type: Sequelize.TEXT },
      description: { type: Sequelize.TEXT },
      specification: { type: Sequelize.TEXT },
      quantity: { type: Sequelize.INTEGER, defaultValue: 0 },
      sold_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      unit: { type: Sequelize.STRING },
      origin: { type: Sequelize.STRING },
      brand_id: { type: Sequelize.INTEGER, references: { model: "brands", key: "id" }, onDelete: "SET NULL" },
      category_id: { type: Sequelize.INTEGER, references: { model: "categories", key: "id" }, onDelete: "SET NULL" },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("product_batches", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: { type: Sequelize.INTEGER, references: { model: "products", key: "id" }, onDelete: "CASCADE" },
      batch_code: { type: Sequelize.STRING, unique: true },
      initial_quantity: { type: Sequelize.INTEGER, defaultValue: 0 },
      remaining_quantity: { type: Sequelize.INTEGER, defaultValue: 0 },
      harvest_date: { type: Sequelize.DATE },
      expiry_date: { type: Sequelize.DATE },
      origin: { type: Sequelize.STRING },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("product_images", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: { type: Sequelize.INTEGER, references: { model: "products", key: "id" }, onDelete: "CASCADE" },
      image: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("feedback", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: { type: Sequelize.INTEGER, references: { model: "products", key: "id" }, onDelete: "CASCADE" },
      user_id: { type: Sequelize.INTEGER, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      star: { type: Sequelize.INTEGER },
      content: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("carts", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("cart_items", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      cart_id: { type: Sequelize.INTEGER, references: { model: "carts", key: "id" }, onDelete: "CASCADE" },
      product_id: { type: Sequelize.INTEGER, references: { model: "products", key: "id" }, onDelete: "CASCADE" },
      quantity: { type: Sequelize.INTEGER, defaultValue: 1 },
      price_at_add: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("orders", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, references: { model: "users", key: "id" }, onDelete: "SET NULL" },
      address_id: { type: Sequelize.INTEGER, references: { model: "user_addresses", key: "id" }, onDelete: "SET NULL" },
      status: { type: Sequelize.INTEGER, defaultValue: 0 },
      note: { type: Sequelize.TEXT },
      subtotal: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      shipping_fee: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      discount: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      total: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("order_details", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: { type: Sequelize.INTEGER, references: { model: "orders", key: "id" }, onDelete: "CASCADE" },
      product_id: { type: Sequelize.INTEGER, references: { model: "products", key: "id" }, onDelete: "SET NULL" },
      batch_id: { type: Sequelize.INTEGER, references: { model: "product_batches", key: "id" }, onDelete: "SET NULL" },
      price: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      quantity: { type: Sequelize.INTEGER, defaultValue: 1 },
      unit: { type: Sequelize.STRING },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("order_histories", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: { type: Sequelize.INTEGER, references: { model: "orders", key: "id" }, onDelete: "CASCADE" },
      from_status: { type: Sequelize.INTEGER },
      to_status: { type: Sequelize.INTEGER },
      changed_by_user_id: { type: Sequelize.INTEGER, references: { model: "users", key: "id" }, onDelete: "SET NULL" },
      reason: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("payments", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: { type: Sequelize.INTEGER, references: { model: "orders", key: "id" }, onDelete: "CASCADE" },
      method: { type: Sequelize.STRING },
      status: { type: Sequelize.INTEGER, defaultValue: 0 },
      amount: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      paid_at: { type: Sequelize.DATE },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("shipments", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: { type: Sequelize.INTEGER, references: { model: "orders", key: "id" }, onDelete: "CASCADE" },
      receiver_name: { type: Sequelize.STRING },
      phone: { type: Sequelize.STRING },
      address: { type: Sequelize.TEXT },
      shipping_status: { type: Sequelize.INTEGER, defaultValue: 0 },
      shipping_fee: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      delivery_time: { type: Sequelize.DATE },
      tracking_code: { type: Sequelize.STRING },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("news", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      title: { type: Sequelize.STRING, allowNull: false },
      image: { type: Sequelize.TEXT },
      content: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("news_details", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: { type: Sequelize.INTEGER, references: { model: "products", key: "id" }, onDelete: "CASCADE" },
      news_id: { type: Sequelize.INTEGER, references: { model: "news", key: "id" }, onDelete: "CASCADE" },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("banner", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING },
      image: { type: Sequelize.TEXT },
      status: { type: Sequelize.INTEGER, defaultValue: 1 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("banner_details", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: { type: Sequelize.INTEGER, references: { model: "products", key: "id" }, onDelete: "CASCADE" },
      banner_id: { type: Sequelize.INTEGER, references: { model: "banner", key: "id" }, onDelete: "CASCADE" },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("coupons", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      code: { type: Sequelize.STRING, allowNull: false, unique: true },
      discount_type: { type: Sequelize.INTEGER, allowNull: false },
      discount_value: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      min_order_value: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      start_date: { type: Sequelize.DATE },
      end_date: { type: Sequelize.DATE },
      quantity: { type: Sequelize.INTEGER, defaultValue: 0 },
      status: { type: Sequelize.INTEGER, defaultValue: 1 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });

    await queryInterface.createTable("order_coupons", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      order_id: { type: Sequelize.INTEGER, references: { model: "orders", key: "id" }, onDelete: "CASCADE" },
      coupon_id: { type: Sequelize.INTEGER, references: { model: "coupons", key: "id" }, onDelete: "CASCADE" },
      discount_amount: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("order_coupons");
    await queryInterface.dropTable("coupons");
    await queryInterface.dropTable("banner_details");
    await queryInterface.dropTable("banner");
    await queryInterface.dropTable("news_details");
    await queryInterface.dropTable("news");
    await queryInterface.dropTable("shipments");
    await queryInterface.dropTable("payments");
    await queryInterface.dropTable("order_histories");
    await queryInterface.dropTable("order_details");
    await queryInterface.dropTable("orders");
    await queryInterface.dropTable("cart_items");
    await queryInterface.dropTable("carts");
    await queryInterface.dropTable("feedback");
    await queryInterface.dropTable("product_images");
    await queryInterface.dropTable("product_batches");
    await queryInterface.dropTable("products");
    await queryInterface.dropTable("brands");
    await queryInterface.dropTable("categories");
    await queryInterface.dropTable("user_addresses");
    await queryInterface.dropTable("users");
  },
};
