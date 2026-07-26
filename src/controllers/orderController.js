const db = require("../models");
const orderInventory = require("../services/orderInventory");

const include = [
  { model: db.OrderDetail, include: [{ model: db.Product, attributes: ["image"] }] },
  { model: db.Payment, attributes: ["method", "status", "transaction_code", "paid_at"] },
  { model: db.Shipment },
  { model: db.OrderHistory, order: [["createdAt", "ASC"]] },
];

async function list(req, res) {
  const orders = await db.Order.findAll({
    where: { user_id: req.session.userId },
    include,
    distinct: true,
    order: [["createdAt", "DESC"]],
  });
  res.json({ data: orders });
}

async function detail(req, res) {
  const order = await db.Order.findOne({
    where: { id: req.params.id, user_id: req.session.userId },
    include,
  });
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
  res.json({ data: order });
}

async function cancel(req, res) {
  const order = await db.Order.findOne({
    where: { id: req.params.id, user_id: req.session.userId },
  });
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
  if (![0, 1].includes(Number(order.status))) {
    return res.status(409).json({ message: "Đơn hàng đã được xử lý nên không thể hủy." });
  }
  await db.sequelize.transaction(async (transaction) => {
    await orderInventory.restore(order.id, transaction);
    await order.update({ status: 5 }, {
      transaction,
      statusHistory: {
        userId: req.session.userId,
        reason: String(req.body.reason || "Khách hàng yêu cầu hủy").slice(0, 500),
      },
    });
  });
  res.json({ message: "Đã hủy đơn hàng." });
}

module.exports = { list, detail, cancel };
