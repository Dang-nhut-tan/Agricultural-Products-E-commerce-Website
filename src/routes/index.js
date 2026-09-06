const authRoutes = require("./authRoutes");
const productRoutes = require("./productRoutes");
const categoryRoutes = require("./categoryRoutes");
const bannerRoutes = require("./bannerRoutes");
const newsRoutes = require("./newsRoutes");
const brandRoutes = require("./brandRoutes");
const storefrontRoutes = require("./storefrontRoutes");
const viewRoutes = require("./viewRoutes");
const paymentRoutes = require("./paymentRoutes");
const orderRoutes = require("./orderRoutes");
const recipeRoutes = require("./recipeRoutes");
const chatRoutes = require("./chatRoutes");
const comboRoutes = require("./comboRoutes");

function configRoutes(app) {
  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/banners", bannerRoutes);
  app.use("/api/news", newsRoutes);
  app.use("/api/brands", brandRoutes);
  app.use("/api/storefront", storefrontRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/recipes", recipeRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/combos", comboRoutes);
  app.use(viewRoutes);

  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) return next(error);
    const status = Number(error.status);
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      message: status >= 400 && status < 600
        ? error.message
        : "Đã xảy ra lỗi máy chủ.",
    });
  });
}

module.exports = configRoutes;
