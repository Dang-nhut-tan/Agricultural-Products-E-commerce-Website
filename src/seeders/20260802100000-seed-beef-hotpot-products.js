"use strict";

const products = [
  {
    name: "Thịt bò ba chỉ thái lát", price: 189000, oldprice: 209000, quantity: 40, unit: "500 g",
    origin: "Việt Nam", category: "Thịt",
    image: "https://lcarecipes.com/wp-content/uploads/2023/12/Beef-Yakiniku-Recipe-Card-1.jpg",
    description: "Ba chỉ bò thái lát mỏng, phù hợp để nhúng lẩu, nướng hoặc xào.",
  },
  {
    name: "Xương ống bò", price: 69000, oldprice: 79000, quantity: 35, unit: "kg",
    origin: "Việt Nam", category: "Thịt",
    image: "https://lcarecipes.com/wp-content/uploads/2023/12/Beef-Yakiniku-Recipe-Card-1.jpg",
    description: "Xương ống bò dùng ninh nước dùng lẩu ngọt tự nhiên.",
  },
  {
    name: "Cải thảo", price: 32000, oldprice: 0, quantity: 55, unit: "kg",
    origin: "Đà Lạt", category: "Rau",
    image: "https://recipe1.ezmember.co.kr/cache/recipe/2023/07/03/576bbc4a0351c6420b879322628471c11.jpg",
    description: "Cải thảo tươi, vị ngọt nhẹ, thích hợp ăn kèm các món lẩu.",
  },
  {
    name: "Nấm hương tươi", price: 58000, oldprice: 65000, quantity: 30, unit: "300 g",
    origin: "Đà Lạt", category: "Rau",
    image: "https://recipe1.ezmember.co.kr/cache/recipe/2023/07/03/3e33667a2b93f6b2db6e84e1c8f542281.jpg",
    description: "Nấm hương tươi thơm, tạo vị umami cho nước lẩu.",
  },
  {
    name: "Nấm kim châm", price: 24000, oldprice: 28000, quantity: 60, unit: "200 g",
    origin: "Đà Lạt", category: "Rau",
    image: "https://recipe1.ezmember.co.kr/cache/recipe/2023/07/03/394c2697c68f60635cabb8b4fc8660381.jpg",
    description: "Nấm kim châm giòn ngọt, đóng gói tiện dùng cho món lẩu.",
  },
  {
    name: "Hành tây", price: 29000, oldprice: 0, quantity: 48, unit: "kg",
    origin: "Đà Lạt", category: "Rau",
    image: "https://recipe1.ezmember.co.kr/cache/recipe/2023/07/03/ea6405de9c66df301eaf874fc597d6b51.jpg",
    description: "Hành tây tươi giúp nước dùng lẩu bò có vị ngọt thanh.",
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    let [categories] = await queryInterface.sequelize.query(
      "SELECT id, name FROM categories WHERE name IN ('Rau', 'Thịt') AND deleted_at IS NULL",
    );
    const existingNames = new Set(categories.map((item) => item.name));
    const missingCategories = ["Rau", "Thịt"]
      .filter((name) => !existingNames.has(name))
      .map((name) => ({ name, created_at: now, updated_at: now }));
    if (missingCategories.length) {
      await queryInterface.bulkInsert("categories", missingCategories);
      [categories] = await queryInterface.sequelize.query(
        "SELECT id, name FROM categories WHERE name IN ('Rau', 'Thịt') AND deleted_at IS NULL",
      );
    }
    const categoryIds = Object.fromEntries(categories.map((item) => [item.name, item.id]));

    for (const [index, product] of products.entries()) {
      const [existing] = await queryInterface.sequelize.query(
        "SELECT id FROM products WHERE name = :name AND deleted_at IS NULL LIMIT 1",
        { replacements: { name: product.name } },
      );
      if (existing.length) continue;

      await queryInterface.bulkInsert("products", [{
        name: product.name, price: product.price, oldprice: product.oldprice, image: product.image,
        description: product.description, specification: "Bảo quản lạnh và sử dụng sớm sau khi mở gói.",
        quantity: product.quantity, sold_count: 0, status: 1, unit: product.unit,
        origin: product.origin, category_id: categoryIds[product.category], created_at: now, updated_at: now,
      }]);
      const [created] = await queryInterface.sequelize.query(
        "SELECT id FROM products WHERE name = :name AND deleted_at IS NULL LIMIT 1",
        { replacements: { name: product.name } },
      );
      await queryInterface.bulkInsert("product_batches", [{
        product_id: created[0].id, batch_code: `LAU-BO-${String(index + 1).padStart(2, "0")}`,
        initial_quantity: product.quantity, remaining_quantity: product.quantity,
        import_price: Math.round(product.price * 0.72), origin: product.origin,
        created_at: now, updated_at: now,
      }]);
    }
  },

  async down(queryInterface) {
    const names = products.map((product) => product.name);
    await queryInterface.bulkDelete("products", { name: names });
  },
};
