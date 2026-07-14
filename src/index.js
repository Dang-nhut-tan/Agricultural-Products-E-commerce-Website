const express = require("express");
const session = require("express-session");
const configViewEngine = require("./config/viewEngine");
const serverConfig = require("./config/server");
const createAdmin = require("./admin/admin");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const bannerRoutes = require("./routes/bannerRoutes");
const newsRoutes = require("./routes/newsRoutes");
const brandRoutes = require("./routes/brandRoutes");
const storefrontRoutes = require("./routes/storefrontRoutes");
const viewRoutes = require("./routes/viewRoutes");

async function startServer() {
  const app = express();
  const { admin, router: adminRouter } = await createAdmin();

  app.use(admin.options.rootPath, adminRouter);
  app.use(express.json({ limit: "5mb" }));
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
  app.use("/api/storefront", storefrontRoutes);
  app.use(viewRoutes);

  app.listen(serverConfig.port, serverConfig.hostname, () => {
    console.log(`Server đang chạy tại http://${serverConfig.hostname}:${serverConfig.port}`);
    console.log(`Trang quản trị: http://${serverConfig.hostname}:${serverConfig.port}${admin.options.rootPath}`);
  });
}

startServer().catch((error) => {
  console.error("Không thể khởi động server:", error);
  process.exit(1);
});
