const {
  User,
  Product,
  ProductBatch,
  Order,
  Feedback,
  Category,
  Sequelize,
} = require("../models");

const { Op } = Sequelize;

const formatBatch = (batch) => ({
  id: batch.id,
  batchCode: batch.batch_code,
  productName: batch.Product?.name || "Không rõ sản phẩm",
  remainingQuantity: batch.remaining_quantity,
  expiryDate: batch.expiry_date,
});

module.exports = async () => {
  try {
    const now = new Date();
    const nextSevenDays = new Date(now);
    nextSevenDays.setDate(nextSevenDays.getDate() + 7);

    const [users, products, orders, feedback, categories, expired, expiringSoon] = await Promise.all([
      User.count(), Product.count(), Order.count(), Feedback.count(), Category.count(),
      ProductBatch.findAll({
        where: {
          expiry_date: { [Op.lt]: now },
          remaining_quantity: { [Op.gt]: 0 },
        },
        include: [{ model: Product, attributes: ["name"] }],
        order: [["expiry_date", "ASC"]],
        limit: 10,
      }),
      ProductBatch.findAll({
        where: {
          expiry_date: { [Op.between]: [now, nextSevenDays] },
          remaining_quantity: { [Op.gt]: 0 },
        },
        include: [{ model: Product, attributes: ["name"] }],
        order: [["expiry_date", "ASC"]],
        limit: 10,
      }),
    ]);

    return {
      users,
      products,
      orders,
      feedback,
      categories,
      expired: expired.map(formatBatch),
      expiringSoon: expiringSoon.map(formatBatch),
      databaseConnected: true,
    };
  } catch (error) {
    console.error("Không thể tải số liệu dashboard:", error.message);
    return {
      users: 0, products: 0, orders: 0, feedback: 0, categories: 0,
      expired: [], expiringSoon: [],
      databaseConnected: false,
    };
  }
};
