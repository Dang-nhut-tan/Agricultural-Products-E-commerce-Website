const express = require("express");
const path = require("path");
const configViewEngine = require("./config/viewEngine");
const serverConfig = require("./config/server");
const createAdmin = require("./admin/admin");

async function startServer() {
  const app = express();

  // Khởi tạo trang quản trị tại /admin trước các middleware đọc req.body.
  const { admin, router: adminRouter } = await createAdmin();
  // Không dùng dashboard mặc định; vào admin sẽ mở danh sách người dùng ngay.
  app.get(admin.options.rootPath, (req, res) => {
    res.redirect(`${admin.options.rootPath}/resources/users`);
  });
  app.use(admin.options.rootPath, adminRouter);

  app.use(express.json());
  // Đọc dữ liệu gửi từ HTML Form và chuyển thành req.body.
  app.use(express.urlencoded({ extended: true }));
  configViewEngine(app);

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "index.html"));
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
