const express = require("express");
const session = require("express-session");
const configViewEngine = require("./config/viewEngine");
const serverConfig = require("./config/server");
const createAdmin = require("./admin/admin");
const configRoutes = require("./routes");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

async function startServer() {
  const app = express();
  app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec),
);
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
  configRoutes(app);

  app.listen(serverConfig.port, serverConfig.hostname, () => {
    console.log(`Server đang chạy tại http://${serverConfig.hostname}:${serverConfig.port}`);
    console.log(`Trang quản trị: http://${serverConfig.hostname}:${serverConfig.port}${admin.options.rootPath}`);
  });
}

startServer().catch((error) => {
  console.error("Không thể khởi động server:", error);
  process.exit(1);
});
