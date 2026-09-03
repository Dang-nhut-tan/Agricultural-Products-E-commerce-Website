const path = require("path");
const models = require("../models");
const { buildResources, resourceLabels } = require("./resources");
const locale = require("./locale");
const dashboardHandler = require("./dashboard-handler");

// Khởi tạo AdminJS. Dùng import() vì AdminJS v7 là ESM,
// còn dự án hiện tại đang sử dụng CommonJS (require).
async function createAdmin() {
  const [{ default: AdminJS, ComponentLoader, buildFeature }, AdminJSExpress, AdminJSSequelize, AdminJSUpload] =
    await Promise.all([
      import("adminjs"),
      import("@adminjs/express"),
      import("@adminjs/sequelize"),
      import("@adminjs/upload"),
    ]);

  AdminJS.registerAdapter({
    Resource: AdminJSSequelize.Resource,
    Database: AdminJSSequelize.Database,
  });

  // ComponentLoader đóng gói dashboard React để AdminJS hiển thị trên trình duyệt.
  const componentLoader = new ComponentLoader();
  const dashboardComponent = componentLoader.add(
    "StoreDashboard",
    path.join(__dirname, "components", "dashboard.jsx")
  );
  const imagePreviewComponent = componentLoader.add(
    "ImagePreview",
    path.join(__dirname, "components", "image-preview.jsx")
  );
  const quickComboComponent = componentLoader.add(
    "QuickCombo",
    path.join(__dirname, "components", "quick-combo.jsx")
  );

  const admin = new AdminJS({
    rootPath: "/admin",
    resources: buildResources(
      models,
      componentLoader,
      AdminJSUpload.default,
      buildFeature,
      imagePreviewComponent,
      quickComboComponent
    ),
    componentLoader,
    dashboard: {
      component: dashboardComponent,
      handler: dashboardHandler,
    },
    branding: {
      companyName: "Quản trị Nông Sản Xanh",
      withMadeWithLove: false,
      theme: {
        colors: {
          primary100: "#168554",
          primary80: "#2f9669",
          primary60: "#68b18a",
          primary20: "#d9f0e4",
          filterBg: "#f5f8f6",
        },
      },
    },
    locale: locale(resourceLabels),
  });

  // Component tùy chỉnh phải được bundle ở môi trường phát triển; nếu không,
  // AdminJS chỉ thấy tên component và hiển thị lỗi noActionComponent.
  if (process.env.NODE_ENV !== "production") {
    admin.watch().catch((error) => {
      console.error("Không thể bundle component AdminJS:", error);
    });
  } else {
    await admin.initialize();
  }

  // Tài khoản mặc định chỉ dùng để phát triển; hãy đổi biến môi trường khi deploy.
  const account = {
    email: process.env.ADMIN_EMAIL || "admin@example.com",
    password: process.env.ADMIN_PASSWORD || "admin123",
  };

  const router = AdminJSExpress.default.buildAuthenticatedRouter(admin, {
    authenticate: async (email, password) =>
      email === account.email && password === account.password ? { email } : null,
    cookieName: "adminjs",
    cookiePassword: process.env.ADMIN_COOKIE_SECRET || "change-this-secret",
  }, null, { resave: false, saveUninitialized: false });

  return { admin, router };
}

module.exports = createAdmin;
