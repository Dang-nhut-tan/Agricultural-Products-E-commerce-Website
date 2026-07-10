const models = require("../models");

// Tên tiếng Việt hiển thị ở thanh menu bên trái.
const resourceNames = {
  User: "Người dùng", UserAddress: "Địa chỉ người dùng", Category: "Danh mục",
  Brand: "Thương hiệu", Product: "Sản phẩm", ProductBatch: "Lô sản phẩm",
  ProductImage: "Ảnh sản phẩm", Feedback: "Đánh giá", Cart: "Giỏ hàng",
  CartItem: "Sản phẩm trong giỏ", Order: "Đơn hàng", OrderDetail: "Chi tiết đơn hàng",
  OrderHistory: "Lịch sử đơn hàng", Payment: "Thanh toán", Shipment: "Vận chuyển",
  News: "Tin tức", NewsDetail: "Sản phẩm trong tin", Banner: "Banner",
  BannerDetail: "Sản phẩm trong banner", Coupon: "Mã giảm giá",
  OrderCoupon: "Mã giảm giá của đơn", CouponUser: "Mã giảm giá của khách",
  Wishlist: "Danh sách yêu thích", WishlistItem: "Sản phẩm yêu thích",
  InventoryTransaction: "Giao dịch kho",
};

// AdminJS dùng tên bảng làm mã resource, nên ánh xạ mã đó sang tên tiếng Việt.
const resourceLabels = Object.fromEntries(
  Object.entries(resourceNames).map(([modelName, label]) => [
    models[modelName].getTableName(),
    label,
  ])
);

// AdminJS hiển thị icon theo nhóm điều hướng, vì vậy gom các mục liên quan
// vào từng nhóm để Người dùng, Sản phẩm, Đơn hàng... có icon dễ nhận biết.
const navigationByModel = {
  User: { name: "Người dùng", icon: "Users" },
  UserAddress: { name: "Người dùng", icon: "Users" },
  Category: { name: "Sản phẩm", icon: "Package" },
  Brand: { name: "Sản phẩm", icon: "Package" },
  Product: { name: "Sản phẩm", icon: "Package" },
  ProductBatch: { name: "Sản phẩm", icon: "Package" },
  ProductImage: { name: "Sản phẩm", icon: "Package" },
  Feedback: { name: "Đánh giá", icon: "MessageSquare" },
  Cart: { name: "Giỏ hàng", icon: "ShoppingCart" },
  CartItem: { name: "Giỏ hàng", icon: "ShoppingCart" },
  Order: { name: "Đơn hàng", icon: "ClipboardList" },
  OrderDetail: { name: "Đơn hàng", icon: "ClipboardList" },
  OrderHistory: { name: "Đơn hàng", icon: "ClipboardList" },
  Payment: { name: "Thanh toán", icon: "CreditCard" },
  Shipment: { name: "Vận chuyển", icon: "Truck" },
  News: { name: "Nội dung", icon: "Newspaper" },
  NewsDetail: { name: "Nội dung", icon: "Newspaper" },
  Banner: { name: "Nội dung", icon: "Newspaper" },
  BannerDetail: { name: "Nội dung", icon: "Newspaper" },
  Coupon: { name: "Khuyến mãi", icon: "Gift" },
  OrderCoupon: { name: "Khuyến mãi", icon: "Gift" },
  CouponUser: { name: "Khuyến mãi", icon: "Gift" },
  Wishlist: { name: "Yêu thích", icon: "Heart" },
  WishlistItem: { name: "Yêu thích", icon: "Heart" },
  InventoryTransaction: { name: "Giao dịch kho", icon: "Warehouse" },
};

// Giỏ hàng là dữ liệu tạm của khách, không cần quản lý trong AdminJS.
const hiddenAdminModels = [
  "Cart",
  "CartItem",
  "Wishlist",
  "WishlistItem",
  "Payment",
];

// Dữ liệu do khách hàng tự quản lý: admin chỉ xem, không thêm/sửa/xóa.
const readOnlyAdminModels = [
  "UserAddress",
  "Feedback",
];

const readOnlyActions = {
  new: { isAccessible: false, isVisible: false },
  edit: { isAccessible: false, isVisible: false },
  delete: { isAccessible: false, isVisible: false },
  bulkDelete: { isAccessible: false, isVisible: false },
};

// Trường kỹ thuật phục vụ soft delete, không cần hiển thị cho admin.
const hiddenTechnicalProperties = {
  deleted_at: { isVisible: false },
  deletedAt: { isVisible: false },
};

// Form parser đôi khi trả một giá trị dưới dạng mảng. Hàm này luôn lấy
// một giá trị đơn để Sequelize nhận đúng kiểu dữ liệu.
const firstValue = (value) => Array.isArray(value) ? value[0] : value;

const normalizeNewUser = async (request) => {
  if (request.method !== "post") return request;

  const payload = request.payload || {};
  request.payload = {
    ...payload,
    email: String(firstValue(payload.email) || "").trim(),
    name: String(firstValue(payload.name) || "").trim(),
    phone: String(firstValue(payload.phone) || "").trim(),
    avatar: String(firstValue(payload.avatar) || "").trim(),
    password: String(firstValue(payload.password) || ""),
    role: Number(firstValue(payload.role) ?? 2),
    status: Number(firstValue(payload.status) ?? 1),
  };

  return request;
};

// Dùng import() vì AdminJS v7 là ESM, còn dự án đang dùng CommonJS (require).
async function createAdmin() {
  const [{ default: AdminJS }, AdminJSExpress, AdminJSSequelize] = await Promise.all([
    import("adminjs"), import("@adminjs/express"), import("@adminjs/sequelize"),
  ]);

  AdminJS.registerAdapter({
    Resource: AdminJSSequelize.Resource,
    Database: AdminJSSequelize.Database,
  });

  // Đưa toàn bộ Sequelize model vào trang quản trị.
  const resources = Object.keys(resourceNames)
    .filter((modelName) => !hiddenAdminModels.includes(modelName))
    .map((modelName) => ({
    resource: models[modelName],
    options: {
      navigation: navigationByModel[modelName],
      properties: {
        ...hiddenTechnicalProperties,
        ...(modelName === "User" ? {
        // Không hiển thị hoặc cho sửa mật khẩu đã mã hóa.
        password_hash: { isVisible: false },
        // Mật khẩu được model User tự mã hóa vào password_hash trước khi lưu.
        password: {
          label: "Mật khẩu",
          type: "password",
          isRequired: true,
          isVisible: { list: false, filter: false, show: false, edit: true },
        },
        avatar: { label: "Ảnh đại diện (không bắt buộc)" },
        // availableValues biến ô nhập số thành combobox nhưng vẫn lưu số vào database.
        role: {
          label: "Vai trò",
          availableValues: [
            { value: 1, label: "Quản trị viên" },
            { value: 2, label: "Khách hàng" },
          ],
        },
        status: {
          label: "Trạng thái",
          availableValues: [
            { value: 1, label: "Đang hoạt động" },
            { value: 0, label: "Đã khóa" },
          ],
        },
        } : {}),
      },
      // Chuẩn hóa dữ liệu form trước khi action mặc định của AdminJS tạo user.
      actions: readOnlyAdminModels.includes(modelName)
        ? readOnlyActions
        : modelName === "User"
          ? { new: { before: normalizeNewUser } }
          : undefined,
    },
    }));

  const admin = new AdminJS({
    rootPath: "/admin",
    resources,
    branding: { companyName: "Quản trị Nông Sản", withMadeWithLove: false },
    locale: {
      language: "vi",
      availableLanguages: ["vi"],
      translations: { vi: {
        actions: { new: "Thêm mới", edit: "Chỉnh sửa", show: "Xem", delete: "Xóa", bulkDelete: "Xóa mục đã chọn", list: "Danh sách" },
        buttons: { save: "Lưu", addNewItem: "Thêm mục mới", filter: "Lọc", filterActive: "Bộ lọc ({{count}})", applyChanges: "Áp dụng", resetFilter: "Đặt lại", logout: "Đăng xuất", login: "Đăng nhập", createFirstRecord: "Tạo dữ liệu đầu tiên", cancel: "Hủy", confirm: "Xác nhận" },
        labels: { navigation: "Điều hướng", pages: "Trang", selectedRecords: "Đã chọn ({{selected}})", filters: "Bộ lọc", dashboard: "Tổng quan", ...resourceLabels },
        properties: { length: "Độ dài", from: "Từ", to: "Đến" },
        messages: { successfullyDeleted: "Đã xóa dữ liệu", successfullyUpdated: "Đã cập nhật dữ liệu", successfullyCreated: "Đã tạo dữ liệu mới", thereWereValidationErrors: "Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại", noRecords: "Chưa có dữ liệu", noRecordsInResource: "Mục này chưa có dữ liệu", noRecordsSelected: "Bạn chưa chọn dữ liệu", confirmDelete: "Bạn có chắc muốn xóa mục này?", invalidCredentials: "Email hoặc mật khẩu không đúng", welcomeOnBoard_title: "Trang quản trị", welcomeOnBoard_subtitle: "Quản lý dữ liệu cửa hàng tại một nơi." },
        components: { Login: { welcomeHeader: "Xin chào", welcomeMessage: "Đăng nhập để vào trang quản trị", properties: { email: "Email", password: "Mật khẩu" }, loginButton: "Đăng nhập" } },
      } },
    },
  });

  // Tài khoản mặc định chỉ giúp chạy nhanh; hãy đặt biến môi trường khi deploy.
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
