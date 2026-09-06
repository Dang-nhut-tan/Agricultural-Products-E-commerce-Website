"use strict";

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert("categories", [
      {
        name: "CI Test Category",
        created_at: now,
        updated_at: now,
      },
    ]);

    const [categories] = await queryInterface.sequelize.query(
      "SELECT id FROM categories WHERE name = 'CI Test Category' LIMIT 1",
    );

    await queryInterface.bulkInsert("products", [
      {
        name: "CI Test Product",
        price: 10000,
        oldprice: 12000,
        image: "https://example.com/product.jpg",
        description: "Product used by Newman tests in CI",
        quantity: 10,
        sold_count: 0,
        unit: "kg",
        origin: "Vietnam",
        category_id: categories[0].id,
        status: 1,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("products", { name: "CI Test Product" });
    await queryInterface.bulkDelete("categories", { name: "CI Test Category" });
  },
};
