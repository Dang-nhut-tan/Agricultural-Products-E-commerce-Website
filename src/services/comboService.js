const db = require("../models");

const roundMoney = (value) => Math.max(0, Math.round(Number(value || 0)));

function calculateCombo(combo) {
  const plain = typeof combo.get === "function" ? combo.get({ plain: true }) : combo;
  const multiplier = Number(plain.quantity_multiplier || 1);
  const items = (plain.ComboItems || []).map((item) => {
    const quantity = Number(item.base_quantity) * multiplier;
    const price = Number(item.Product?.price || 0);
    const stock = Number(item.Product?.quantity || 0);
    return {
      id: item.id,
      productId: item.product_id,
      name: item.Product?.name || "Sản phẩm",
      image: item.Product?.image || "",
      unit: item.Product?.unit || "sản phẩm",
      quantity,
      unitPrice: price,
      retailTotal: roundMoney(price * quantity),
      stock,
      availableSets: quantity > 0 ? Math.floor(stock / quantity) : 0,
    };
  });
  const retailPrice = roundMoney(items.reduce((sum, item) => sum + item.retailTotal, 0));
  let comboPrice;
  if (plain.price_mode === "fixed") comboPrice = retailPrice - Number(plain.discount_value || 0);
  else if (plain.price_mode === "manual") comboPrice = Number(plain.manual_price || 0);
  else comboPrice = retailPrice * (1 - Number(plain.discount_value || 0) / 100);
  comboPrice = roundMoney(comboPrice);
  const savings = Math.max(0, retailPrice - comboPrice);
  const availableQuantity = items.length ? Math.min(...items.map((item) => item.availableSets)) : 0;
  return {
    ...plain,
    items,
    retailPrice,
    comboPrice,
    savings,
    savingsPercent: retailPrice ? Math.round((savings / retailPrice) * 100) : 0,
    availableQuantity,
    isAvailable: Boolean(plain.status) && items.length > 0 && availableQuantity > 0 && comboPrice > 0 && comboPrice < retailPrice,
  };
}

async function findCombos({ includeUnavailable = false, id = null } = {}) {
  const where = {};
  if (id) where.id = id;
  if (!includeUnavailable) where.status = true;
  const [combos, setting] = await Promise.all([db.Combo.findAll({
    where,
    include: [{
      model: db.ComboItem,
      include: [{ model: db.Product, attributes: ["id", "name", "price", "quantity", "unit", "image", "status"] }],
    }],
    order: [["sort_order", "ASC"], ["createdAt", "DESC"]],
  }), db.ComboSetting.findByPk(1)]);
  const minimumQuantity = Math.max(1, Number(setting?.minimum_quantity || 1));
  const calculated = combos.map((combo) => ({ ...calculateCombo(combo), minimum_quantity: minimumQuantity }));
  return includeUnavailable ? calculated : calculated.filter((combo) => combo.isAvailable);
}

module.exports = { calculateCombo, findCombos };
