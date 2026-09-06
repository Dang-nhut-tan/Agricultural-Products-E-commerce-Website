const resourceNames = {
  User: "Người dùng", UserAddress: "Địa chỉ người dùng", Category: "Danh mục",
  Brand: "Thương hiệu", Product: "Sản phẩm", ProductBatch: "Lô sản phẩm",
  ProductImage: "Ảnh sản phẩm", Feedback: "Đánh giá", Order: "Đơn hàng", OrderDetail: "Chi tiết đơn hàng",
  OrderHistory: "Lịch sử đơn hàng", Payment: "Thanh toán", Shipment: "Vận chuyển",
  News: "Tin tức", NewsDetail: "Sản phẩm trong tin", Banner: "Banner",
  BannerDetail: "Sản phẩm trong banner", Coupon: "Mã giảm giá",
  OrderCoupon: "Mã giảm giá của đơn", CouponUser: "Mã giảm giá của khách",
  InventoryTransaction: "Giao dịch kho", RecipeSource: "Nguồn PDF công thức",
  Recipe: "Công thức món ăn", RecipeProductLink: "Liên kết nguyên liệu - sản phẩm",
  Combo: "Combo nhà hàng", ComboItem: "Sản phẩm trong combo",
  ComboSetting: "Cấu hình combo",
};

const { cloudinaryProvider, createUploadPath } = require("./cloudinary-provider");

const imagePropertyByModel = {
  User: "avatar",
  Brand: "image",
  Product: "image",
  ProductImage: "image",
  News: "image",
  Banner: "image",
  Recipe: "image",
  Combo: "image",
};

const listPropertiesByModel = {
  User: ["id", "avatar", "name", "email", "phone", "status", "role"],
  Category: ["id", "name", "createdAt"],
  Brand: ["id", "image", "name", "createdAt"],
  Product: ["id", "image", "name", "price", "quantity", "status"],
  ProductImage: ["id", "image", "product_id", "sort_order"],
  News: ["id", "image", "title", "createdAt"],
  Banner: ["id", "image", "name", "status", "sort_order"],
  Recipe: ["id", "image", "name", "source", "active", "updatedAt"],
  RecipeSource: ["id", "name", "file_name", "status", "error_message", "updatedAt"],
  Combo: ["id", "image", "name", "size", "calculated_price", "savings_display", "status", "availability_warning"],
  ComboItem: ["id", "combo_id", "product_id", "base_quantity"],
  ComboSetting: ["minimum_quantity", "updatedAt"],
};

const navigationByModel = {
  User: { name: "Người dùng", icon: "Users" }, UserAddress: { name: "Người dùng", icon: "Users" },
  Category: { name: "Sản phẩm", icon: "Package" }, Brand: { name: "Sản phẩm", icon: "Package" },
  Product: { name: "Sản phẩm", icon: "Package" }, ProductBatch: { name: "Sản phẩm", icon: "Package" },
  ProductImage: { name: "Sản phẩm", icon: "Package" }, Feedback: { name: "Nội dung & Đánh giá", icon: "Newspaper" },
  Order: { name: "Đơn hàng & Vận chuyển", icon: "ClipboardList" },
  Shipment: { name: "Đơn hàng & Vận chuyển", icon: "ClipboardList" },
  News: { name: "Nội dung & Đánh giá", icon: "Newspaper" },
  Banner: { name: "Nội dung & Đánh giá", icon: "Newspaper" },
  Coupon: { name: "Khuyến mãi", icon: "Gift" },
  InventoryTransaction: { name: "Kho & Công thức", icon: "Warehouse" },
  Recipe: { name: "Kho & Công thức", icon: "Warehouse" },
  RecipeSource: { name: "Kho & Công thức", icon: "Warehouse" },
  RecipeProductLink: { name: "Kho & Công thức", icon: "Warehouse" },
  Combo: { name: "Combo nhà hàng", icon: "ShoppingBag" },
  ComboSetting: { name: "Combo nhà hàng", icon: "ShoppingBag" },
};

const sidebarHiddenModels = [
  "OrderDetail",
  "OrderHistory",
  "Payment",
  "NewsDetail",
  "BannerDetail",
  "OrderCoupon",
  "CouponUser",
  "ComboItem",
];

const hiddenModels = [
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
const singletonSettingActions = {
  new: { isAccessible: false, isVisible: false },
  delete: { isAccessible: false, isVisible: false },
  bulkDelete: { isAccessible: false, isVisible: false },
};

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

const relatedListAction = (label, resourceId, foreignKey) => ({
  actionType: "record",
  label,
  icon: "View",
  component: false,
  handler: async (_request, _response, context) => ({
    record: context.record.toJSON(context.currentAdmin),
    redirectUrl: `/admin/resources/${resourceId}?filters.${foreignKey}=${encodeURIComponent(context.record.id())}`,
  }),
});

const relatedActionsByModel = {
  User: {
    addresses: relatedListAction("Địa chỉ người dùng", "user_addresses", "user_id"),
    assignedCoupons: relatedListAction("Mã giảm giá của khách", "coupon_users", "user_id"),
  },
  Order: {
    orderDetails: relatedListAction("Chi tiết đơn hàng", "order_details", "order_id"),
    orderHistory: relatedListAction("Lịch sử đơn hàng", "order_histories", "order_id"),
    payments: relatedListAction("Thanh toán", "payments", "order_id"),
    appliedCoupons: relatedListAction("Mã giảm giá đã dùng", "order_coupons", "order_id"),
  },
  News: {
    newsProducts: relatedListAction("Sản phẩm trong tin", "news_details", "news_id"),
  },
  Banner: {
    bannerProducts: relatedListAction("Sản phẩm trong banner", "banner_details", "banner_id"),
  },
  Coupon: {
    couponOrders: relatedListAction("Đơn hàng đã áp dụng", "order_coupons", "coupon_id"),
    couponUsers: relatedListAction("Khách hàng được nhận", "coupon_users", "coupon_id"),
  },
  Combo: {
    comboItems: relatedListAction("Sản phẩm trong combo", "combo_items", "combo_id"),
  },
};

const enrichComboRecords = async (response) => {
  const combos = await require("../services/comboService").findCombos({ includeUnavailable: true });
  const byId = new Map(combos.map((combo) => [String(combo.id), combo]));
  for (const record of response.records || (response.record ? [response.record] : [])) {
    const combo = byId.get(String(record.id));
    if (!combo) continue;
    record.params.retail_price = combo.retailPrice;
    record.params.calculated_price = combo.comboPrice;
    record.params.savings_display = `${combo.savings.toLocaleString("vi-VN")} ₫ (${combo.savingsPercent}%)`;
    record.params.availability_warning = combo.isAvailable
      ? `Đủ hàng: có thể bán ${combo.availableQuantity} combo`
      : combo.items.length
        ? `Đang tự ẩn: ${combo.items.filter((item) => item.availableSets < 1).map((item) => `thiếu ${item.name}`).join(", ") || "giá combo chưa thấp hơn giá lẻ"}`
        : "Đang tự ẩn: chưa có sản phẩm trong combo";
  }
  return response;
};

const quickComboAction = (component) => ({
  actionType: "resource",
  icon: "Add",
  label: "Tạo combo nhanh",
  component,
  handler: async (request) => {
    const db = require("../models");
    if (request.method === "get") {
      const products = await db.Product.findAll({
        where: { status: 1 },
        attributes: ["id", "name", "price", "quantity", "unit"],
        order: [["name", "ASC"]],
      });
      return { products: products.map((product) => product.get({ plain: true })) };
    }

    const payload = request.payload || {};
    const name = String(firstValue(payload.name) || "").trim();
    const description = String(firstValue(payload.description) || "").trim();
    const size = ["small", "medium", "large"].includes(firstValue(payload.size))
      ? firstValue(payload.size)
      : "small";
    const discountValue = Number(firstValue(payload.discount_value));
    let items;
    try {
      items = JSON.parse(String(firstValue(payload.items) || "[]"));
    } catch (_error) {
      items = [];
    }
    items = Array.isArray(items)
      ? items.filter((item) => Number.isInteger(Number(item.product_id)) && Number(item.base_quantity) > 0)
      : [];

    if (!name) return { notice: { type: "error", message: "Vui lòng nhập tên combo." } };
    if (!Number.isFinite(discountValue) || discountValue <= 0 || discountValue >= 100) {
      return { notice: { type: "error", message: "Phần trăm giảm giá phải lớn hơn 0 và nhỏ hơn 100." } };
    }
    if (!items.length) return { notice: { type: "error", message: "Vui lòng chọn ít nhất một sản phẩm và nhập số lượng." } };

    const productIds = [...new Set(items.map((item) => Number(item.product_id)))];
    const validProducts = await db.Product.count({ where: { id: productIds, status: 1 } });
    if (validProducts !== productIds.length) {
      return { notice: { type: "error", message: "Có sản phẩm không tồn tại hoặc đã ngừng bán." } };
    }

    const transaction = await db.sequelize.transaction();
    try {
      const combo = await db.Combo.create({
        name,
        description: description || null,
        size,
        quantity_multiplier: 1,
        price_mode: "percent",
        discount_value: discountValue,
        status: true,
        sort_order: 0,
      }, { transaction });
      await db.ComboItem.bulkCreate(items.map((item) => ({
        combo_id: combo.id,
        product_id: Number(item.product_id),
        base_quantity: Number(item.base_quantity),
      })), { transaction });
      await transaction.commit();
      return {
        notice: { type: "success", message: `Đã tạo combo “${name}” cùng ${items.length} sản phẩm.` },
        redirectUrl: `/admin/resources/combos/records/${combo.id}/show`,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
});

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
productStatus.name = { label: "Tên sản phẩm", isTitle: true };
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
  RecipeSource: {
    name: { label: "Tên nguồn / tài liệu" },
    file_path: { isVisible: false },
    file_name: { label: "Tên file", isVisible: { list: true, show: true, edit: false, filter: false } },
    mime_type: { isVisible: false },
    file_size: { label: "Dung lượng", isVisible: { list: false, show: true, edit: false, filter: false } },
    status: {
      label: "Trạng thái",
      isVisible: { list: true, show: true, edit: false, filter: true },
      availableValues: [
        { value: "processing", label: "Đang xử lý" },
        { value: "ready", label: "Hoàn tất" },
        { value: "error", label: "Có lỗi" },
      ],
    },
    error_message: { label: "Chi tiết lỗi", isVisible: { list: true, show: true, edit: false, filter: false } },
  },
  Combo: {
    name: {
      label: "Tên combo hiển thị cho khách",
      description: "Ví dụ: Combo rau củ cho quán ăn 30 suất.",
      isTitle: true,
    },
    description: {
      label: "Mô tả ngắn",
      description: "Nói ngắn gọn combo phù hợp với ai và dùng cho nhu cầu nào.",
    },
    size: {
      label: "Quy mô combo",
      description: "Chọn quy mô gần đúng để khách dễ so sánh các combo.",
      availableValues: [
        { value: "small", label: "Nhỏ - quán nhỏ" },
        { value: "medium", label: "Vừa - nhà hàng vừa" },
        { value: "large", label: "Lớn - bếp ăn số lượng lớn" },
      ],
    },
    quantity_multiplier: {
      label: "Hệ số nhân số lượng sản phẩm",
      description: "Thông thường để 1. Nhập 2 nếu muốn gấp đôi toàn bộ số lượng sản phẩm trong combo.",
    },
    price_mode: {
      label: "Cách đặt giá bán combo",
      description: "Chọn một cách tính; hệ thống tự lấy tổng giá bán lẻ của các sản phẩm.",
      availableValues: [
        { value: "percent", label: "Giảm theo % (dễ dùng nhất)" },
        { value: "fixed", label: "Trừ một số tiền cố định" },
        { value: "manual", label: "Tự nhập giá bán cuối cùng" },
      ],
    },
    discount_value: {
      label: "Mức giảm giá",
      description: "Nếu chọn giảm theo %, nhập 10 nghĩa là giảm 10%. Nếu chọn giảm cố định, nhập số tiền muốn trừ.",
    },
    manual_price: {
      label: "Giá bán tự nhập (đồng)",
      description: "Chỉ điền khi đã chọn “Tự nhập giá bán cuối cùng”; các cách tính khác để trống.",
    },
    minimum_quantity: { isVisible: false },
    serving_from: {
      label: "Phục vụ từ bao nhiêu suất",
      description: "Không bắt buộc. Ví dụ: 20.",
    },
    serving_to: {
      label: "Phục vụ tối đa bao nhiêu suất",
      description: "Không bắt buộc. Ví dụ: 30.",
    },
    usage_days: {
      label: "Dùng trong khoảng bao nhiêu ngày",
      description: "Không bắt buộc. Nhập số ngày dự kiến sử dụng hết combo.",
    },
    badge: {
      label: "Nhãn nổi bật",
      description: "Không bắt buộc. Ví dụ: Bán chạy, Tiết kiệm nhất.",
    },
    sort_order: {
      label: "Thứ tự hiển thị",
      description: "Số nhỏ xuất hiện trước. Có thể để 0.",
    },
    status: {
      label: "Có hiển thị cho khách không?",
      description: "Combo vẫn tự ẩn nếu thiếu sản phẩm hoặc giá combo không thấp hơn giá mua lẻ.",
      availableValues: [{ value: true, label: "Có - đang bán" }, { value: false, label: "Không - tạm ẩn" }],
    },
    retail_price: { label: "Tổng giá mua lẻ", isVisible: { list: true, show: true, edit: false, filter: false } },
    calculated_price: { label: "Giá combo hiện tại", isVisible: { list: true, show: true, edit: false, filter: false } },
    savings_display: { label: "Mức tiết kiệm", isVisible: { list: true, show: true, edit: false, filter: false } },
    availability_warning: { label: "Tồn kho / tự động ẩn", isVisible: { list: true, show: true, edit: false, filter: false } },
  },
  ComboItem: {
    combo_id: {
      label: "Chọn combo cần thêm sản phẩm",
      description: "Chọn tên combo từ danh sách, không cần nhớ mã số.",
      reference: "combos",
    },
    product_id: {
      label: "Chọn sản phẩm",
      description: "Chọn sản phẩm có sẵn từ danh sách.",
      reference: "products",
    },
    base_quantity: {
      label: "Số lượng sản phẩm trong 1 combo",
      description: "Nhập theo đơn vị bán của sản phẩm. Ví dụ sản phẩm tính bằng kg thì nhập 5 nghĩa là 5 kg.",
    },
  },
  ComboSetting: {
    id: { isVisible: false },
    minimum_quantity: {
      label: "Số combo tối thiểu khách phải mua",
      description: "Áp dụng chung cho tất cả combo nhà hàng. Ví dụ nhập 2 thì khách phải mua ít nhất 2 combo.",
    },
  },
};

const buildResources = (
  models,
  componentLoader,
  uploadFeature,
  buildFeature,
  imagePreviewComponent,
  quickComboComponent
) => Object.keys(resourceNames)
  .filter((modelName) => !hiddenModels.includes(modelName))
  .map((modelName) => {
    const isRecipeSource = modelName === "RecipeSource";
    const imageProperty = imagePropertyByModel[modelName];
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
          maxSize: 10 * 1024 * 1024,
        },
      }),
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
    ] : isRecipeSource ? [
      uploadFeature({
        componentLoader,
        provider: {
          local: {
            bucket: require("path").join(__dirname, "..", "pdf"),
            opts: {},
          },
        },
        properties: {
          key: "file_path",
          file: "uploadPdf",
          filename: "file_name",
          mimeType: "mime_type",
          size: "file_size",
        },
        uploadPath: (record, filename) => `${record.id()}-${Date.now()}-${filename}`,
        validation: { mimeTypes: ["application/pdf"], maxSize: 30 * 1024 * 1024 },
      }),
    ] : [];

    const rebuildAfter = async (response) => {
      const { rebuildRecipeIndex } = require("../services/recipeIndex");
      setTimeout(rebuildRecipeIndex, 500);
      return response;
    };

    return {
      resource: models[modelName],
      features,
      options: {
      navigation: sidebarHiddenModels.includes(modelName)
        ? false
        : navigationByModel[modelName],
      ...(listPropertiesByModel[modelName] ? {
        listProperties: listPropertiesByModel[modelName],
      } : {}),
      ...(showProperties ? { showProperties } : {}),
      properties: {
        ...hiddenTechnicalProperties,
        ...(propertiesByModel[modelName] || {}),
        ...(imageProperty ? {
          [imageProperty]: {
            isVisible: { list: true, show: true, edit: false, filter: false },
          },
          uploadImage: {
            label: modelName === "Combo" ? "Chọn ảnh đại diện cho combo" : "Ảnh từ máy tính",
            ...(modelName === "Combo" ? { description: "Không bắt buộc. Chọn ảnh rõ món ăn hoặc nguyên liệu có trong combo." } : {}),
          },
        } : {}),
        ...(isRecipeSource ? { uploadPdf: { label: "Chọn file PDF" } } : {}),
      },
      actions: {
        ...(readOnlyModels.includes(modelName) ? readOnlyActions : {}),
        ...(modelName === "User" ? { new: { before: normalizeNewUser } } : {}),
        ...(modelName === "Shipment" ? {
          new: { before: normalizeShipment },
          edit: { before: normalizeShipment },
        } : {}),
        ...(modelName === "ComboSetting" ? singletonSettingActions : {}),
        ...(modelName === "Combo" ? {
          list: { after: enrichComboRecords },
          show: { after: enrichComboRecords },
          quickNew: quickComboAction(quickComboComponent),
        } : {}),
        ...(isRecipeSource ? {
          new: { after: rebuildAfter }, edit: { after: rebuildAfter },
          delete: { after: rebuildAfter }, bulkDelete: { after: rebuildAfter },
        } : {}),
        ...(relatedActionsByModel[modelName] || {}),
      },
      },
    };
  });

const models = require("../models");
const resourceLabels = Object.fromEntries(
  Object.entries(resourceNames).map(([name, label]) => [models[name].getTableName(), label])
);

module.exports = { buildResources, resourceLabels };
