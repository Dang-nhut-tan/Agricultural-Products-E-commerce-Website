const authRoutes = require("./authRoutes");
const productRoutes = require("./productRoutes");
const categoryRoutes = require("./categoryRoutes");
const bannerRoutes = require("./bannerRoutes");
const newsRoutes = require("./newsRoutes");
const brandRoutes = require("./brandRoutes");
const storefrontRoutes = require("./storefrontRoutes");
const viewRoutes = require("./viewRoutes");

function configRoutes(app) {
  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/banners", bannerRoutes);
  app.use("/api/news", newsRoutes);
  app.use("/api/brands", brandRoutes);
  app.use("/api/storefront", storefrontRoutes);
  app.use(viewRoutes);
}

module.exports = configRoutes;
