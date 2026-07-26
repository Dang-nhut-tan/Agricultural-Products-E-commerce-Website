const db = require("../models");

async function reserve(orderId, transaction) {
  const alreadyReserved = await db.InventoryTransaction.count({
    where: { reference_type: "order", reference_id: orderId, type: "OUT" },
    transaction,
  });
  if (alreadyReserved) return;
  const details = await db.OrderDetail.findAll({ where: { order_id: orderId }, transaction });
  for (const detail of details) {
    let needed = Number(detail.quantity);
    const batches = await db.ProductBatch.findAll({
      where: { product_id: detail.product_id, remaining_quantity: { [db.Sequelize.Op.gt]: 0 } },
      order: [["expiry_date", "ASC"], ["id", "ASC"]],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    for (const batch of batches) {
      if (!needed) break;
      const quantity = Math.min(needed, Number(batch.remaining_quantity));
      await batch.update({ remaining_quantity: Number(batch.remaining_quantity) - quantity }, {
        transaction,
        skipInventoryTransaction: true,
      });
      await db.InventoryTransaction.create({
        batch_id: batch.id, type: "OUT", quantity: -quantity,
        reference_type: "order", reference_id: orderId,
        note: `Xuất kho cho đơn hàng #${orderId}`,
      }, { transaction });
      if (!detail.batch_id) await detail.update({
        batch_id: batch.id,
        cost_price: batch.import_price,
      }, { transaction });
      needed -= quantity;
    }
    if (needed) throw new Error(`${detail.product_name} không còn đủ tồn kho.`);
    await db.Product.increment(
      { sold_count: Number(detail.quantity) },
      { where: { id: detail.product_id }, transaction },
    );
  }
}

async function restore(orderId, transaction) {
  const outputs = await db.InventoryTransaction.findAll({
    where: { reference_type: "order", reference_id: orderId, type: "OUT" },
    transaction,
  });
  const restored = await db.InventoryTransaction.count({
    where: { reference_type: "order_cancel", reference_id: orderId, type: "IN" },
    transaction,
  });
  if (restored || !outputs.length) return;
  for (const output of outputs) {
    const batch = await db.ProductBatch.findByPk(output.batch_id, {
      lock: transaction.LOCK.UPDATE, transaction,
    });
    if (!batch) continue;
    const quantity = Math.abs(Number(output.quantity));
    await batch.update({ remaining_quantity: Number(batch.remaining_quantity) + quantity }, {
      transaction, skipInventoryTransaction: true,
    });
    await db.InventoryTransaction.create({
      batch_id: batch.id, type: "IN", quantity,
      reference_type: "order_cancel", reference_id: orderId,
      note: `Hoàn tồn do hủy đơn hàng #${orderId}`,
    }, { transaction });
  }
  const details = await db.OrderDetail.findAll({ where: { order_id: orderId }, transaction });
  for (const detail of details) {
    await db.Product.decrement(
      { sold_count: Number(detail.quantity) },
      { where: { id: detail.product_id }, transaction },
    );
  }
}

module.exports = { reserve, restore };
