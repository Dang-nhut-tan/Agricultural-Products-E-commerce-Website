const db = require("../models");
const ProductRespone = require("../dtos/respone/product/productRespone");
const { Op } = db.Sequelize;

async function getProducts(req, res) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 24);
  const where = { status: 1 };
  if (req.query.category) where.category_id = req.query.category;
  if (req.query.search)
    where.name = { [Op.like]: `%${req.query.search.trim()}%` };
  const { rows, count } = await db.Product.findAndCountAll({
    where,
    distinct: true,
    include: [db.Category, db.Brand, db.ProductImage],
    limit,
    offset: (page - 1) * limit,
  });
  res.json({
    data: rows.map((product) => new ProductRespone(product)),
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.max(Math.ceil(count / limit), 1),
    },
  });
}

async function getProductById(req, res) {
  const product = await db.Product.findOne({
    where: { id: req.params.id, status: 1 },
    include: [db.Category, db.Brand, db.ProductImage],
  });
  if (!product)
    return res.status(404).json({ message: "Không tìm thấy sản phẩm." });
  res.status(200).json({ data: new ProductRespone(product) });
}

module.exports = { getProducts, getProductById };
