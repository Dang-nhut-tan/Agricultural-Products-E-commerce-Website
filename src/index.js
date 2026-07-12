const express = require("express");
const session = require("express-session");
const path = require("path");
const configViewEngine = require("./config/viewEngine");
const serverConfig = require("./config/server");
const createAdmin = require("./admin/admin");
const { Product, ProductImage, Category, Brand, Sequelize } = require("./models");
const { Op } = Sequelize;
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const bannerRoutes = require("./routes/bannerRoutes");
const newsRoutes = require("./routes/newsRoutes");
const brandRoutes = require("./routes/brandRoutes");
const authRoutes = require("./routes/authRoutes");

async function startServer() {
  const app = express();

  // Khởi tạo trang quản trị tại /admin trước các middleware đọc req.body.
  const { admin, router: adminRouter } = await createAdmin();
  app.use(admin.options.rootPath, adminRouter);

  app.use(express.json({ limit: "5mb" }));
  // Đọc dữ liệu gửi từ HTML Form và chuyển thành req.body.
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    name: "nong-san.sid",
    secret: process.env.SESSION_SECRET || "nong-san-development-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 604800000 },
  }));
  configViewEngine(app);
  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/banners", bannerRoutes);
  app.use("/api/news", newsRoutes);
  app.use("/api/brands", brandRoutes);

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "index.html"));
  });
  app.get("/nha-cung-cap", (req, res) => res.sendFile(path.join(__dirname, "views", "index.html")));
  app.get("/nha-cung-cap/:id", (req, res) => res.sendFile(path.join(__dirname, "views", "index.html")));
  app.get("/khuyen-mai/:id", (req, res) => res.sendFile(path.join(__dirname, "views", "index.html")));
  app.get("/tin-tuc/:id", (req, res) => res.sendFile(path.join(__dirname, "views", "index.html")));
  ["/san-pham", "/san-pham/:id", "/gio-hang", "/thanh-toan", "/dang-nhap", "/dang-ky", "/tai-khoan", "/don-hang", "/gioi-thieu", "/tin-tuc", "/lien-he"].forEach((route) => {
    app.get(route, (req, res) => res.sendFile(path.join(__dirname, "views", "index.html")));
  });

  app.get("/api/storefront", async (req, res) => {
    try {
      const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 8, 1), 24);
      const categoryId = Number.parseInt(req.query.category, 10);
      const search = String(req.query.search || "").trim();
      const where = { status: 1 };
      if (categoryId) where.category_id = categoryId;
      if (search) where.name = { [Op.like]: `%${search}%` };
      const [{ rows: products, count: total }, categories, brands] = await Promise.all([
        Product.findAndCountAll({ where, distinct: true, include: [Category, Brand, { model: ProductImage, required: false }], order: [["createdAt", "DESC"]], limit, offset: (page - 1) * limit }),
        Category.findAll({ order: [["name", "ASC"]] }),
        Brand.findAll({ order: [["name", "ASC"]] }),
      ]);
      res.json({ products, categories, brands, pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) } });
    } catch (error) {
      console.error("Không thể tải dữ liệu cửa hàng:", error);
      res.status(500).json({ message: "Không thể tải dữ liệu từ MySQL." });
    }
  });

  app.listen(serverConfig.port, serverConfig.hostname, () => {
    console.log(`Server đang chạy tại http://${serverConfig.hostname}:${serverConfig.port}`);
    console.log(`Trang quản trị: http://${serverConfig.hostname}:${serverConfig.port}${admin.options.rootPath}`);
  });
}

startServer().catch((error) => {
  console.error("Không thể khởi động server:", error);
  process.exit(1);
});
