const { Sequelize, DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const sanitizeRichText = require("../services/sanitizeHtml");
const env = process.env.NODE_ENV || "development";
const config = require("../config/config")[env];

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

const modelOptions = (tableName) => ({
  tableName,
  underscored: true,
});

const User = sequelize.define("User", {
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  // Trường ảo chỉ nhận mật khẩu từ form, không tạo thêm cột trong database.
  password: { type: DataTypes.VIRTUAL, set(value) { this.setDataValue("password", value); } },
  name: DataTypes.STRING,
  role: { type: DataTypes.INTEGER, defaultValue: 2 },
  status: { type: DataTypes.INTEGER, defaultValue: 1 },
  failed_login_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  locked_until: { type: DataTypes.DATE, allowNull: true },
  avatar: DataTypes.STRING,
  phone: DataTypes.STRING,
}, {
  ...modelOptions("users"),
  hooks: {
    // Tự mã hóa mật khẩu nhập từ AdminJS trước khi lưu người dùng.
    async beforeValidate(user) {
      if (user.password) {
        user.password_hash = await bcrypt.hash(user.password, 10);
      }
    },
  },
});

const UserAddress = sequelize.define("UserAddress", {
  user_id: DataTypes.INTEGER,
  receiver_name: DataTypes.STRING,
  phone: DataTypes.STRING,
  address: DataTypes.TEXT,
  ward: DataTypes.STRING,
  district: DataTypes.STRING,
  province: DataTypes.STRING,
  is_default: { type: DataTypes.BOOLEAN, defaultValue: false },
}, modelOptions("user_addresses"));

const Category = sequelize.define("Category", {
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  image: DataTypes.TEXT,
  deleted_at: DataTypes.DATE,
}, {
  tableName: "categories",
  underscored: true,
  paranoid: true,
  deletedAt: "deleted_at",
});

const Brand = sequelize.define("Brand", {
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  image: DataTypes.TEXT,
  deleted_at: DataTypes.DATE,
}, {
  tableName: "brands",
  underscored: true,
  paranoid: true,
  deletedAt: "deleted_at",
});

const Product = sequelize.define("Product", {
  name: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  oldprice: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  image: DataTypes.TEXT,
  description: DataTypes.TEXT,
  specification: DataTypes.TEXT,
  quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  sold_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.INTEGER, defaultValue: 1 },
  unit: DataTypes.STRING,
  origin: DataTypes.STRING,
  brand_id: DataTypes.INTEGER,
  category_id: DataTypes.INTEGER,
  deleted_at: DataTypes.DATE,
}, {
  tableName: "products",
  underscored: true,
  paranoid: true,
  deletedAt: "deleted_at",
});

// Tổng tồn kho sản phẩm luôn bằng tổng remaining_quantity của các lô.
const syncProductQuantity = async (productId, transaction) => {
  if (!productId) return;

  const quantity = await ProductBatch.sum("remaining_quantity", {
    where: { product_id: productId },
    transaction,
  });

  await Product.update(
    { quantity: quantity || 0 },
    { where: { id: productId }, transaction, hooks: false }
  );
};

const recordInventoryTransaction = async (batch, options, defaults) => {
  if (options.skipInventoryTransaction) return;

  const metadata = options.inventoryTransaction || {};
  const quantity = metadata.quantity ?? defaults.quantity;
  if (!quantity) return;

  await InventoryTransaction.create({
    batch_id: defaults.batchExists === false ? null : batch.id,
    type: metadata.type || defaults.type,
    quantity,
    reference_type: metadata.reference_type || defaults.reference_type,
    reference_id: metadata.reference_id ?? defaults.reference_id ?? batch.id,
    note: metadata.note || defaults.note,
  }, { transaction: options.transaction });
};

const ProductBatch = sequelize.define("ProductBatch", {
  product_id: DataTypes.INTEGER,
  batch_code: { type: DataTypes.STRING, unique: true },
  initial_quantity: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0 } },
  remaining_quantity: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0 } },
  import_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  harvest_date: DataTypes.DATE,
  expiry_date: DataTypes.DATE,
  origin: DataTypes.STRING,
}, {
  ...modelOptions("product_batches"),
  hooks: {
    beforeValidate(batch) {
      if (batch.isNewRecord && !batch.changed("remaining_quantity")) {
        batch.remaining_quantity = batch.initial_quantity;
      }
    },
    // Sau khi có ID tự tăng, tạo mã lô cố định như LO-000001.
    async afterCreate(batch, options) {
      if (!batch.batch_code) {
        batch.batch_code = `LO-${String(batch.id).padStart(6, "0")}`;
        await batch.save({
          fields: ["batch_code"],
          hooks: false,
          transaction: options.transaction,
        });
      }

      await syncProductQuantity(batch.product_id, options.transaction);
      await recordInventoryTransaction(batch, options, {
        type: "IN",
        quantity: batch.remaining_quantity,
        reference_type: "purchase",
        note: "Nhập kho khi tạo lô sản phẩm",
      });
    },
    async afterUpdate(batch, options) {
      const previousProductId = batch.previous("product_id");
      const previousQuantity = Number(batch.previous("remaining_quantity")) || 0;
      const currentQuantity = Number(batch.remaining_quantity) || 0;
      await syncProductQuantity(batch.product_id, options.transaction);

      // Nếu chuyển lô sang sản phẩm khác, cập nhật cả sản phẩm cũ.
      if (previousProductId && previousProductId !== batch.product_id) {
        await syncProductQuantity(previousProductId, options.transaction);
      }
      await recordInventoryTransaction(batch, options, {
        type: "ADJUST",
        quantity: currentQuantity - previousQuantity,
        reference_type: "adjust",
        note: "Điều chỉnh số lượng còn lại của lô",
      });
    },
    async afterDestroy(batch, options) {
      await syncProductQuantity(batch.product_id, options.transaction);
      await recordInventoryTransaction(batch, options, {
        type: "OUT",
        quantity: batch.remaining_quantity,
        reference_type: "adjust",
        reference_id: batch.id,
        note: "Xuất phần tồn còn lại khi xóa lô",
        batchExists: false,
      });
    },
  },
});

const ProductImage = sequelize.define("ProductImage", {
  product_id: DataTypes.INTEGER,
  image: DataTypes.TEXT,
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, modelOptions("product_images"));

const Feedback = sequelize.define("Feedback", {
  product_id: DataTypes.INTEGER,
  user_id: DataTypes.INTEGER,
  order_detail_id: DataTypes.INTEGER,
  star: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  content: { type: DataTypes.TEXT, allowNull: false },
}, {
  ...modelOptions("feedback"),
});

const Cart = sequelize.define("Cart", {
  user_id: DataTypes.INTEGER,
}, modelOptions("carts"));

const CartItem = sequelize.define("CartItem", {
  cart_id: DataTypes.INTEGER,
  product_id: DataTypes.INTEGER,
  snapshot_name: DataTypes.STRING,
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  price_at_add: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
}, modelOptions("cart_items"));

const Order = sequelize.define("Order", {
  user_id: DataTypes.INTEGER,
  address_id: DataTypes.INTEGER,
  status: { type: DataTypes.INTEGER, defaultValue: 0 },
  note: DataTypes.TEXT,
  subtotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  shipping_fee: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
}, {
  ...modelOptions("orders"),
  hooks: {
    async afterUpdate(order, options) {
      if (!order.changed("status")) return;
      if (Number(order.previous("status")) === Number(order.status)) return;
      const metadata = options.statusHistory || {};
      await OrderHistory.create({
        order_id: order.id,
        from_status: Number(order.previous("status")),
        to_status: Number(order.status),
        changed_by_user_id: metadata.userId || null,
        reason: metadata.reason || "Cập nhật trạng thái đơn hàng",
      }, { transaction: options.transaction });
      const shipmentStatusByOrder = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5 };
      const shippingStatus = shipmentStatusByOrder[Number(order.status)];
      if (shippingStatus !== undefined) {
        await Shipment.update(
          {
            shipping_status: shippingStatus,
            ...(shippingStatus === 3 ? { delivery_time: new Date() } : {}),
          },
          {
            where: { order_id: order.id },
            transaction: options.transaction,
            hooks: false,
          },
        );
      }
    },
  },
});

const OrderDetail = sequelize.define("OrderDetail", {
  order_id: DataTypes.INTEGER,
  product_id: DataTypes.INTEGER,
  batch_id: DataTypes.INTEGER,
  product_name: DataTypes.STRING,
  price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  cost_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  unit: DataTypes.STRING,
}, modelOptions("order_details"));

const OrderHistory = sequelize.define("OrderHistory", {
  order_id: DataTypes.INTEGER,
  from_status: DataTypes.INTEGER,
  to_status: DataTypes.INTEGER,
  changed_by_user_id: DataTypes.INTEGER,
  reason: DataTypes.TEXT,
}, {
  tableName: "order_histories",
  underscored: true,
  updatedAt: false,
});

const Payment = sequelize.define("Payment", {
  order_id: DataTypes.INTEGER,
  method: DataTypes.STRING,
  status: { type: DataTypes.INTEGER, defaultValue: 0 },
  amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  transaction_code: DataTypes.STRING,
  gateway_response: DataTypes.TEXT,
  paid_at: DataTypes.DATE,
}, modelOptions("payments"));

const Shipment = sequelize.define("Shipment", {
  order_id: DataTypes.INTEGER,
  receiver_name: DataTypes.STRING,
  phone: DataTypes.STRING,
  address: DataTypes.TEXT,
  ward: DataTypes.STRING,
  district: DataTypes.STRING,
  province: DataTypes.STRING,
  shipping_status: { type: DataTypes.INTEGER, defaultValue: 0 },
  shipping_fee: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  delivery_time: DataTypes.DATE,
  tracking_code: DataTypes.STRING,
}, {
  ...modelOptions("shipments"),
  hooks: {
    async afterUpdate(shipment, options) {
      if (!shipment.changed("shipping_status")) return;
      if (Number(shipment.previous("shipping_status")) === Number(shipment.shipping_status)) return;
      const orderStatusByShipment = { 2: 3, 3: 4 };
      const orderStatus = orderStatusByShipment[Number(shipment.shipping_status)];
      if (orderStatus === undefined) return;
      const order = await Order.findByPk(shipment.order_id, {
        transaction: options.transaction,
      });
      if (!order || Number(order.status) === orderStatus) return;
      await order.update({ status: orderStatus }, {
        transaction: options.transaction,
        statusHistory: {
          reason: orderStatus === 4
            ? "Đơn vị vận chuyển xác nhận đã giao hàng"
            : "Đơn hàng đã bàn giao cho đơn vị vận chuyển",
        },
      });
    },
  },
});

const News = sequelize.define("News", {
  title: { type: DataTypes.STRING, allowNull: false },
  image: DataTypes.TEXT,
  content: DataTypes.TEXT,
  deleted_at: DataTypes.DATE,
}, {
  tableName: "news",
  underscored: true,
  paranoid: true,
  deletedAt: "deleted_at",
  hooks: {
    beforeValidate(news) {
      if (news.changed("content")) {
        news.content = sanitizeRichText(news.content);
      }
    },
  },
});

const NewsDetail = sequelize.define("NewsDetail", {
  product_id: DataTypes.INTEGER,
  news_id: DataTypes.INTEGER,
}, modelOptions("news_details"));

const Banner = sequelize.define("Banner", {
  name: DataTypes.STRING,
  image: DataTypes.TEXT,
  status: { type: DataTypes.INTEGER, defaultValue: 1 },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  deleted_at: DataTypes.DATE,
}, {
  tableName: "banner",
  underscored: true,
  paranoid: true,
  deletedAt: "deleted_at",
});

const BannerDetail = sequelize.define("BannerDetail", {
  product_id: DataTypes.INTEGER,
  banner_id: DataTypes.INTEGER,
}, modelOptions("banner_details"));

const Coupon = sequelize.define("Coupon", {
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  discount_type: { type: DataTypes.INTEGER, allowNull: false },
  discount_value: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  min_order_value: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  start_date: DataTypes.DATE,
  end_date: DataTypes.DATE,
  quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  used_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.INTEGER, defaultValue: 1 },
  deleted_at: DataTypes.DATE,
}, {
  tableName: "coupons",
  underscored: true,
  paranoid: true,
  deletedAt: "deleted_at",
});

const OrderCoupon = sequelize.define("OrderCoupon", {
  order_id: DataTypes.INTEGER,
  coupon_id: DataTypes.INTEGER,
  discount_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
}, modelOptions("order_coupons"));

const CouponUser = sequelize.define("CouponUser", {
  coupon_id: DataTypes.INTEGER,
  user_id: DataTypes.INTEGER,
  used_at: DataTypes.DATE,
}, modelOptions("coupon_users"));

const Wishlist = sequelize.define("Wishlist", {
  user_id: DataTypes.INTEGER,
}, modelOptions("wishlists"));

const WishlistItem = sequelize.define("WishlistItem", {
  wishlist_id: DataTypes.INTEGER,
  product_id: DataTypes.INTEGER,
}, modelOptions("wishlist_items"));

const InventoryTransaction = sequelize.define("InventoryTransaction", {
  batch_id: DataTypes.INTEGER,
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isIn: [["IN", "OUT", "ADJUST"]] },
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notZero(value) {
        if (value === 0) throw new Error("Số lượng giao dịch phải khác 0.");
      },
    },
  },
  reference_type: DataTypes.STRING,
  reference_id: DataTypes.INTEGER,
  note: DataTypes.TEXT,
}, {
  tableName: "inventory_transactions",
  underscored: true,
  updatedAt: false,
});

User.hasMany(UserAddress, { foreignKey: "user_id" });
UserAddress.belongsTo(User, { foreignKey: "user_id" });

Category.hasMany(Product, { foreignKey: "category_id" });
Product.belongsTo(Category, { foreignKey: "category_id" });
Brand.hasMany(Product, { foreignKey: "brand_id" });
Product.belongsTo(Brand, { foreignKey: "brand_id" });

Product.hasMany(ProductBatch, { foreignKey: "product_id" });
ProductBatch.belongsTo(Product, { foreignKey: "product_id" });
Product.hasMany(ProductImage, { foreignKey: "product_id" });
ProductImage.belongsTo(Product, { foreignKey: "product_id" });
Product.hasMany(Feedback, { foreignKey: "product_id" });
Feedback.belongsTo(Product, { foreignKey: "product_id" });
User.hasMany(Feedback, { foreignKey: "user_id" });
Feedback.belongsTo(User, { foreignKey: "user_id" });

User.hasOne(Cart, { foreignKey: "user_id" });
Cart.belongsTo(User, { foreignKey: "user_id" });
Cart.hasMany(CartItem, { foreignKey: "cart_id" });
CartItem.belongsTo(Cart, { foreignKey: "cart_id" });
Product.hasMany(CartItem, { foreignKey: "product_id" });
CartItem.belongsTo(Product, { foreignKey: "product_id" });

User.hasMany(Order, { foreignKey: "user_id" });
Order.belongsTo(User, { foreignKey: "user_id" });
Order.hasMany(OrderDetail, { foreignKey: "order_id" });
OrderDetail.belongsTo(Order, { foreignKey: "order_id" });
OrderDetail.hasOne(Feedback, { foreignKey: "order_detail_id" });
Feedback.belongsTo(OrderDetail, { foreignKey: "order_detail_id" });
Product.hasMany(OrderDetail, { foreignKey: "product_id" });
OrderDetail.belongsTo(Product, { foreignKey: "product_id" });
ProductBatch.hasMany(OrderDetail, { foreignKey: "batch_id" });
OrderDetail.belongsTo(ProductBatch, { foreignKey: "batch_id" });
ProductBatch.hasMany(InventoryTransaction, { foreignKey: "batch_id" });
InventoryTransaction.belongsTo(ProductBatch, { foreignKey: "batch_id" });

Order.hasMany(OrderHistory, { foreignKey: "order_id" });
OrderHistory.belongsTo(Order, { foreignKey: "order_id" });
Order.hasOne(Payment, { foreignKey: "order_id" });
Payment.belongsTo(Order, { foreignKey: "order_id" });
Order.hasOne(Shipment, { foreignKey: "order_id" });
Shipment.belongsTo(Order, { foreignKey: "order_id" });

News.hasMany(NewsDetail, { foreignKey: "news_id" });
NewsDetail.belongsTo(News, { foreignKey: "news_id" });
Product.hasMany(NewsDetail, { foreignKey: "product_id" });
NewsDetail.belongsTo(Product, { foreignKey: "product_id" });

Banner.hasMany(BannerDetail, { foreignKey: "banner_id" });
BannerDetail.belongsTo(Banner, { foreignKey: "banner_id" });
Product.hasMany(BannerDetail, { foreignKey: "product_id" });
BannerDetail.belongsTo(Product, { foreignKey: "product_id" });

Order.hasMany(OrderCoupon, { foreignKey: "order_id" });
OrderCoupon.belongsTo(Order, { foreignKey: "order_id" });
Coupon.hasMany(OrderCoupon, { foreignKey: "coupon_id" });
OrderCoupon.belongsTo(Coupon, { foreignKey: "coupon_id" });
Coupon.hasMany(CouponUser, { foreignKey: "coupon_id" });
CouponUser.belongsTo(Coupon, { foreignKey: "coupon_id" });
User.hasMany(CouponUser, { foreignKey: "user_id" });
CouponUser.belongsTo(User, { foreignKey: "user_id" });

User.hasOne(Wishlist, { foreignKey: "user_id" });
Wishlist.belongsTo(User, { foreignKey: "user_id" });
Wishlist.hasMany(WishlistItem, { foreignKey: "wishlist_id" });
WishlistItem.belongsTo(Wishlist, { foreignKey: "wishlist_id" });
Product.hasMany(WishlistItem, { foreignKey: "product_id" });
WishlistItem.belongsTo(Product, { foreignKey: "product_id" });

module.exports = {
  sequelize,
  Sequelize,
  User,
  UserAddress,
  Category,
  Brand,
  Product,
  ProductBatch,
  ProductImage,
  Feedback,
  Cart,
  CartItem,
  Order,
  OrderDetail,
  OrderHistory,
  Payment,
  Shipment,
  News,
  NewsDetail,
  Banner,
  BannerDetail,
  Coupon,
  OrderCoupon,
  CouponUser,
  Wishlist,
  WishlistItem,
  InventoryTransaction,
};
