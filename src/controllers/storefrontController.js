const db = require("../models");

const { Op } = db.Sequelize;

async function getStorefront(req, res) {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 8, 1), 24);
    const categoryId = Number.parseInt(req.query.category, 10);
    const search = String(req.query.search || "").trim();
    const where = { status: 1 };

    if (categoryId) where.category_id = categoryId;
    if (search) where.name = { [Op.like]: `%${search}%` };

    const [{ rows: products, count: total }, categories] = await Promise.all([
      db.Product.findAndCountAll({
        where,
        distinct: true,
        include: [db.Category, db.Brand, { model: db.ProductImage, required: false }],
        order: [["createdAt", "DESC"]],
        limit,
        offset: (page - 1) * limit,
      }),
      db.Category.findAll({ order: [["name", "ASC"]] }),
    ]);

    res.json({
      products,
      categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    console.error("Không thể tải dữ liệu cửa hàng:", error);
    res.status(500).json({ message: "Không thể tải dữ liệu từ MySQL." });
  }
}

async function getGroupedStorefront(req, res) {
  try {
    const [categories, products] = await Promise.all([
      db.Category.findAll({ order: [["name", "ASC"]] }),
      db.Product.findAll({
        where: { status: 1 },
        include: [db.Category, db.Brand, { model: db.ProductImage, required: false }],
        order: [[db.Category, "name", "ASC"], ["name", "ASC"]],
      }),
    ]);
    const productsByCategory = new Map();
    for (const product of products) {
      const categoryId = Number(product.category_id);
      if (!productsByCategory.has(categoryId)) productsByCategory.set(categoryId, []);
      productsByCategory.get(categoryId).push(product);
    }
    res.json({
      categories: categories
        .map((category) => ({
          ...category.get({ plain: true }),
          products: productsByCategory.get(Number(category.id)) || [],
        }))
        .filter((category) => category.products.length),
    });
  } catch (error) {
    console.error("Không thể tải sản phẩm theo danh mục:", error);
    res.status(500).json({ message: "Không thể tải sản phẩm theo danh mục." });
  }
}

module.exports = { getStorefront, getGroupedStorefront };
