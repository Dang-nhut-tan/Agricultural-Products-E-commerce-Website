const { Sequelize, DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
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

const ProductBatch = sequelize.define("ProductBatch", {
  product_id: DataTypes.INTEGER,
  batch_code: { type: DataTypes.STRING, unique: true },
  initial_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  remaining_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  harvest_date: DataTypes.DATE,
  expiry_date: DataTypes.DATE,
  origin: DataTypes.STRING,
}, modelOptions("product_batches"));

const ProductImage = sequelize.define("ProductImage", {
  product_id: DataTypes.INTEGER,
  image: DataTypes.TEXT,
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, modelOptions("product_images"));

const Feedback = sequelize.define("Feedback", {
  product_id: DataTypes.INTEGER,
  user_id: DataTypes.INTEGER,
  order_detail_id: DataTypes.INTEGER,
  star: DataTypes.INTEGER,
  content: DataTypes.TEXT,
}, modelOptions("feedback"));

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
}, modelOptions("orders"));

const OrderDetail = sequelize.define("OrderDetail", {
  order_id: DataTypes.INTEGER,
  product_id: DataTypes.INTEGER,
  batch_id: DataTypes.INTEGER,
  product_name: DataTypes.STRING,
  price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
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
}, modelOptions("shipments"));

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
  type: DataTypes.STRING,
  quantity: DataTypes.INTEGER,
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
