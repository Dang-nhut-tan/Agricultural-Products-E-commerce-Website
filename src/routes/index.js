const authRoutes = require("./authRoutes");
const productRoutes = require("./productRoutes");
const categoryRoutes = require("./categoryRoutes");
const bannerRoutes = require("./bannerRoutes");
const newsRoutes = require("./newsRoutes");
const brandRoutes = require("./brandRoutes");
const storefrontRoutes = require("./storefrontRoutes");
const couponRoutes = require("./couponRoutes");
const userRoutes = require("./userRoutes");
const viewRoutes = require("./viewRoutes");

function configRoutes(app) {
  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/banners", bannerRoutes);
  app.use("/api/news", newsRoutes);
  app.use("/api/brands", brandRoutes);
  app.use("/api/storefront", storefrontRoutes);
  app.use("/api/coupons", couponRoutes);
  app.use("/api/users", userRoutes);
  app.use(viewRoutes);

  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) return next(error);
    return res.status(500).json({ message: "Đã xảy ra lỗi máy chủ." });
  });
}

module.exports = configRoutes;
