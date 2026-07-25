const path = require("path");
const db = require("../models");

const { Op } = db.Sequelize;
const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
const decorateProduct = (instance) => {
  const product = instance.get({ plain: true });
  product.displayPrice = formatMoney(product.price);
  product.displayOldPrice =
    Number(product.oldprice) > Number(product.price)
      ? formatMoney(product.oldprice)
      : "";
  product.primaryImage =
    product.image ||
    [...(product.ProductImages || [])].sort(
      (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0),
    )[0]?.image ||
    "";
  return product;
};

const indexPage = path.join(__dirname, "..", "views", "legacy", "index.html");

function getIndexPage(req, res) {
  res.sendFile(indexPage);
}

function getContactPage(req, res) {
  res.render("pages/contact.njk", {
    pageTitle: "Liên hệ | Nông Sản Xanh",
    pageDescription:
      "Liên hệ Nông Sản Xanh để được hỗ trợ về sản phẩm, đơn hàng và hợp tác kinh doanh.",
    currentPath: req.path,
    contactMethods: [
      {
        icon: "☎",
        label: "Hotline",
        value: "1900 6868",
        note: "Hỗ trợ 08:00 – 20:00",
        href: "tel:19006868",
      },
      {
        icon: "@",
        label: "Email",
        value: "hello@nongsanxanh.vn",
        note: "Phản hồi trong vòng 24 giờ",
        href: "mailto:hello@nongsanxanh.vn",
      },
      {
        icon: "⌂",
        label: "Địa chỉ",
        value: "123 Đường Nông Sản, TP. Hồ Chí Minh",
        note: "Thứ Hai – Thứ Bảy",
      },
    ],
    contactSubjects: [
      "Hỏi về sản phẩm",
      "Hỗ trợ đơn hàng",
      "Góp ý dịch vụ",
      "Hợp tác kinh doanh",
      "Khác",
    ],
  });
}

async function getProductsPage(req, res, next) {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = 8;
    const categoryId = Number.parseInt(req.query.category, 10);
    const search = String(req.query.search || "").trim();
    const where = { status: 1 };

    if (categoryId) where.category_id = categoryId;
    if (search) where.name = { [Op.like]: `%${search}%` };

    const [{ rows: products, count: total }, categories] = await Promise.all([
      db.Product.findAndCountAll({
        where,
        distinct: true,
        include: [
          db.Category,
          db.Brand,
          { model: db.ProductImage, required: false },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset: (page - 1) * limit,
      }),
      db.Category.findAll({ order: [["name", "ASC"]] }),
    ]);

    const totalPages = Math.max(Math.ceil(total / limit), 1);
    res.render("pages/products/index.njk", {
      pageTitle: "Sản phẩm | Nông Sản Xanh",
      pageDescription: "Khám phá nông sản tươi sạch và rõ nguồn gốc.",
      currentPath: req.path,
      products: products.map(decorateProduct),
      categories: categories.map((category) => category.get({ plain: true })),
      selectedCategory: categoryId || "",
      search,
      pagination: {
        page,
        totalPages,
        previous: page > 1 ? page - 1 : null,
        next: page < totalPages ? page + 1 : null,
        pages: Array.from({ length: totalPages }, (_, index) => index + 1),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getProductDetailPage(req, res, next) {
  try {
    const product = await db.Product.findOne({
      where: { id: req.params.id, status: 1 },
      include: [
        db.Category,
        db.Brand,
        { model: db.ProductImage, required: false },
      ],
    });

    if (!product) return res.status(404).render("pages/not-found.njk", {
      pageTitle: "Không tìm thấy sản phẩm",
      pageDescription: "Sản phẩm không tồn tại hoặc đã ngừng bán.",
      currentPath: req.path,
    });

    const plainProduct = decorateProduct(product);
    plainProduct.images = [
      plainProduct.image,
      ...(plainProduct.ProductImages || []).map((item) => item.image),
    ].filter((image, index, images) => image && images.indexOf(image) === index);

    return res.render("pages/products/detail.njk", {
      pageTitle: `${plainProduct.name} | Nông Sản Xanh`,
      pageDescription:
        plainProduct.description || `Thông tin sản phẩm ${plainProduct.name}.`,
      currentPath: req.path,
      product: plainProduct,
    });
  } catch (error) {
    return next(error);
  }
}

async function getNewsPage(req, res, next) {
  try {
    const news = await db.News.findAll({ order: [["createdAt", "DESC"]] });
    res.render("pages/news/index.njk", {
      pageTitle: "Tin tức | Nông Sản Xanh",
      pageDescription: "Kiến thức nông sản và tin tức mới từ Nông Sản Xanh.",
      currentPath: req.path,
      news: news.map((item) => {
        const plainItem = item.get({ plain: true });
        plainItem.publishedDate = new Date(plainItem.createdAt).toLocaleDateString("vi-VN");
        return plainItem;
      }),
    });
  } catch (error) {
    next(error);
  }
}

async function getNewsDetailPage(req, res, next) {
  try {
    const item = await db.News.findByPk(req.params.id);
    if (!item) return res.status(404).render("pages/not-found.njk", {
      pageTitle: "Không tìm thấy bài viết",
      pageDescription: "Bài viết không tồn tại.",
      currentPath: req.path,
    });

    return res.render("pages/news/detail.njk", {
      pageTitle: `${item.title} | Nông Sản Xanh`,
      pageDescription: item.title,
      currentPath: req.path,
      item: {
        ...item.get({ plain: true }),
        publishedDate: new Date(item.createdAt).toLocaleDateString("vi-VN"),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getIndexPage,
  getContactPage,
  getProductsPage,
  getProductDetailPage,
  getNewsPage,
  getNewsDetailPage,
};
