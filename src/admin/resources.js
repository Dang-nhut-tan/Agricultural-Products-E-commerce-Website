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

const { cloudinaryProvider, createUploadPath } = require("./cloudinary-provider");

// Model và cột sẽ nhận URL ảnh sau khi admin chọn file từ máy tính.
const imagePropertyByModel = {
  User: "avatar",
  Category: "image",
  Brand: "image",
  Product: "image",
  ProductImage: "image",
  News: "image",
  Banner: "image",
};

// Chỉ giữ các cột hữu ích để bảng không bị dài và rối.
const listPropertiesByModel = {
  User: ["id", "avatar", "name", "email", "phone", "status", "role"],
  Category: ["id", "image", "name", "createdAt"],
  Brand: ["id", "image", "name", "createdAt"],
  Product: ["id", "image", "name", "price", "quantity", "status"],
  ProductImage: ["id", "image", "product_id", "sort_order"],
  News: ["id", "image", "title", "createdAt"],
  Banner: ["id", "image", "name", "status", "sort_order"],
};

const navigationByModel = {
  User: { name: "Người dùng", icon: "Users" }, UserAddress: { name: "Người dùng", icon: "Users" },
  Category: { name: "Sản phẩm", icon: "Package" }, Brand: { name: "Sản phẩm", icon: "Package" },
  Product: { name: "Sản phẩm", icon: "Package" }, ProductBatch: { name: "Sản phẩm", icon: "Package" },
  ProductImage: { name: "Sản phẩm", icon: "Package" }, Feedback: { name: "Đánh giá", icon: "MessageSquare" },
  Cart: { name: "Giỏ hàng", icon: "ShoppingCart" }, CartItem: { name: "Giỏ hàng", icon: "ShoppingCart" },
  Order: { name: "Đơn hàng", icon: "ClipboardList" }, OrderDetail: { name: "Đơn hàng", icon: "ClipboardList" },
  OrderHistory: { name: "Đơn hàng", icon: "ClipboardList" }, Payment: { name: "Thanh toán", icon: "CreditCard" },
  Shipment: { name: "Vận chuyển", icon: "Truck" }, News: { name: "Nội dung", icon: "Newspaper" },
  NewsDetail: { name: "Nội dung", icon: "Newspaper" }, Banner: { name: "Nội dung", icon: "Newspaper" },
  BannerDetail: { name: "Nội dung", icon: "Newspaper" }, Coupon: { name: "Khuyến mãi", icon: "Gift" },
  OrderCoupon: { name: "Khuyến mãi", icon: "Gift" }, CouponUser: { name: "Khuyến mãi", icon: "Gift" },
  Wishlist: { name: "Yêu thích", icon: "Heart" }, WishlistItem: { name: "Yêu thích", icon: "Heart" },
  InventoryTransaction: { name: "Giao dịch kho", icon: "Warehouse" },
};

const hiddenModels = [
  "Cart",
  "CartItem",
  "Wishlist",
  "WishlistItem",
  "Payment",
  "ProductImage",
];
const readOnlyModels = ["UserAddress", "Feedback", "InventoryTransaction"];
const readOnlyActions = {
  new: { isAccessible: false, isVisible: false }, edit: { isAccessible: false, isVisible: false },
  delete: { isAccessible: false, isVisible: false }, bulkDelete: { isAccessible: false, isVisible: false },
};
const hiddenTechnicalProperties = {
  deleted_at: { isVisible: false }, deletedAt: { isVisible: false },
};

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

// AdminJS gửi ô ngày trống thành chuỗi rỗng, Sequelize sẽ đổi thành "Invalid date".
const normalizeShipment = async (request) => {
  if (request.method !== "post") return request;
  const payload = request.payload || {};
  request.payload = {
    ...payload,
    order_id: Number(firstValue(payload.order_id)),
    shipping_status: Number(firstValue(payload.shipping_status) ?? 0),
    shipping_fee: Number(firstValue(payload.shipping_fee) || 0),
    delivery_time: firstValue(payload.delivery_time) || null,
    tracking_code: String(firstValue(payload.tracking_code) || "").trim() || null,
  };
  return request;
};

const userProperties = {
  password_hash: { isVisible: false },
  password: {
    label: "Mật khẩu", type: "password", isRequired: true,
    isVisible: { list: false, filter: false, show: false, edit: true },
  },
  avatar: { label: "Ảnh đại diện (không bắt buộc)" },
  role: {
    label: "Vai trò",
    availableValues: [{ value: 1, label: "Quản trị viên" }, { value: 2, label: "Khách hàng" }],
  },
  status: {
    label: "Trạng thái",
    availableValues: [
      { value: 1, label: "Đang hoạt động" },
      { value: 0, label: "Không hoạt động" },
      { value: 2, label: "Đã cấm" },
    ],
  },
};

const statusProperty = (availableValues) => ({
  status: { label: "Trạng thái", availableValues },
});

const activeStatus = statusProperty([
  { value: 1, label: "Đang hoạt động" },
  { value: 0, label: "Không hoạt động" },
]);
const visibleStatus = statusProperty([
  { value: 1, label: "Đang hiển thị" },
  { value: 0, label: "Đang ẩn" },
]);
const productStatus = statusProperty([
  { value: 0, label: "Đang ẩn" },
  { value: 1, label: "Đang bán" },
  { value: 2, label: "Ngừng bán" },
]);
productStatus.quantity = {
  label: "Tổng tồn kho (tự động)",
  isVisible: { list: true, show: true, edit: false, filter: true },
};
const orderStatusValues = [
  { value: 0, label: "Đã nhận đơn" },
  { value: 1, label: "Đang chuẩn bị đơn" },
  { value: 2, label: "Đã giao cho đơn vị vận chuyển" },
  { value: 3, label: "Đang giao" },
  { value: 4, label: "Đã hoàn thành" },
  { value: 5, label: "Đã hủy" },
];
const orderStatus = statusProperty(orderStatusValues);
const orderHistoryStatus = {
  from_status: { label: "Trạng thái cũ", availableValues: orderStatusValues },
  to_status: { label: "Trạng thái mới", availableValues: orderStatusValues },
};
const paymentStatus = statusProperty([
  { value: 0, label: "Chưa thanh toán" },
  { value: 1, label: "Đã thanh toán" },
  { value: 2, label: "Thanh toán thất bại" },
  { value: 3, label: "Đã hoàn tiền" },
]);
const shipmentStatus = {
  shipping_status: {
    label: "Trạng thái vận chuyển",
    availableValues: [
      { value: 0, label: "Đang chuẩn bị đơn" },
      { value: 1, label: "Đã giao cho đơn vị vận chuyển" },
      { value: 2, label: "Đang giao" },
      { value: 3, label: "Đã giao" },
      { value: 4, label: "Giao thất bại" },
      { value: 5, label: "Hoàn hàng" },
    ],
  },
};
const productBatchProperties = {
  // Mã lô được model tự sinh từ ID, admin không cần nhập hoặc sửa tay.
  batch_code: {
    isVisible: { list: true, show: true, edit: false, filter: true },
  },
  import_price: {
    label: "Giá nhập / đơn vị",
    type: "number",
  },
};

const propertiesByModel = {
  User: userProperties,
  Product: productStatus,
  ProductBatch: productBatchProperties,
  Order: orderStatus,
  OrderHistory: orderHistoryStatus,
  Payment: paymentStatus,
  Shipment: shipmentStatus,
  Banner: visibleStatus,
  Coupon: activeStatus,
  News: {
    content: {
      label: "Nội dung",
      type: "richtext",
      isVisible: { list: false, filter: false, show: true, edit: true },
    },
  },
  OrderDetail: {
    cost_price: {
      label: "Giá vốn tại thời điểm bán",
      isVisible: { list: true, filter: false, show: true, edit: false },
    },
  },
  InventoryTransaction: {
    type: {
      availableValues: [
        { value: "IN", label: "Nhập kho" },
        { value: "OUT", label: "Xuất kho" },
        { value: "ADJUST", label: "Điều chỉnh" },
      ],
    },
    reference_type: {
      availableValues: [
        { value: "purchase", label: "Nhập hàng" },
        { value: "order", label: "Đơn hàng" },
        { value: "adjust", label: "Điều chỉnh" },
      ],
    },
  },
};

const buildResources = (
  models,
  componentLoader,
  uploadFeature,
  buildFeature,
  imagePreviewComponent
) => Object.keys(resourceNames)
  .filter((modelName) => !hiddenModels.includes(modelName))
  .map((modelName) => {
    const imageProperty = imagePropertyByModel[modelName];
    // Trang chi tiết của resource có ảnh luôn đặt ảnh lên đầu.
    const showProperties = imageProperty ? [
      imageProperty,
      ...Object.keys(models[modelName].rawAttributes).filter((property) =>
        ![imageProperty, "password_hash", "password", "deleted_at", "deletedAt"].includes(property)
      ),
    ] : undefined;
    const features = imageProperty ? [
      uploadFeature({
        componentLoader,
        provider: cloudinaryProvider,
        properties: {
          key: imageProperty,
          file: "uploadImage",
          filePath: "imagePreview",
          filesToDelete: "imageToDelete",
        },
        uploadPath: createUploadPath(modelName.toLowerCase()),
        validation: {
          mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          // Cho phép ảnh từ máy/điện thoại tối đa 10 MB.
          maxSize: 10 * 1024 * 1024,
        },
      }),
      // Feature chạy sau upload để thay URL dài bằng thumbnail trong bảng.
      buildFeature({
        properties: {
          uploadImage: {
            isVisible: { list: false, show: false, edit: true, filter: false },
          },
          [imageProperty]: {
            label: "Ảnh",
            isVisible: { list: true, show: true, edit: false, filter: false },
            components: {
              list: imagePreviewComponent,
              show: imagePreviewComponent,
            },
          },
        },
      }),
    ] : [];

    return {
      resource: models[modelName],
      features,
      options: {
      navigation: navigationByModel[modelName],
      ...(listPropertiesByModel[modelName] ? {
        listProperties: listPropertiesByModel[modelName],
      } : {}),
      ...(showProperties ? { showProperties } : {}),
      properties: {
        ...hiddenTechnicalProperties,
        ...(propertiesByModel[modelName] || {}),
        ...(imageProperty ? {
          // Hiện ảnh ở danh sách/chi tiết nhưng ẩn ô nhập URL trong form.
          [imageProperty]: {
            isVisible: { list: true, show: true, edit: false, filter: false },
          },
          uploadImage: { label: "Ảnh từ máy tính" },
        } : {}),
      },
      actions: readOnlyModels.includes(modelName)
        ? readOnlyActions
        : modelName === "User"
          ? { new: { before: normalizeNewUser } }
          : modelName === "Shipment"
            ? {
              new: { before: normalizeShipment },
              edit: { before: normalizeShipment },
            }
            : undefined,
      },
    };
  });

// AdminJS dùng tên bảng làm resource id.
const models = require("../models");
const resourceLabels = Object.fromEntries(
  Object.entries(resourceNames).map(([name, label]) => [models[name].getTableName(), label])
);

module.exports = { buildResources, resourceLabels };
