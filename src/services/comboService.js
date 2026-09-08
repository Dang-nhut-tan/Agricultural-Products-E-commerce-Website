const db = require("../models");

function roundMoney(value) {
  const number = Number(value || 0);
  return Math.max(0, Math.round(number));
}

function getPlainCombo(combo) {
  if (typeof combo.get === "function") {
    return combo.get({ plain: true });
  }

  return combo;
}

function calculateAvailableSets(stock, quantity) {
  if (quantity <= 0) {
    return 0;
  }

  return Math.floor(stock / quantity);
}

function calculateItem(comboItem, quantityMultiplier) {
  const product = comboItem.Product || {};
  const quantity = Number(comboItem.base_quantity) * quantityMultiplier;
  const unitPrice = Number(product.price || 0);
  const stock = Number(product.quantity || 0);

  return {
    id: comboItem.id,
    productId: comboItem.product_id,
    name: product.name || "Sản phẩm",
    image: product.image || "",
    unit: product.unit || "sản phẩm",
    quantity: quantity,
    unitPrice: unitPrice,
    retailTotal: roundMoney(unitPrice * quantity),
    stock: stock,
    availableSets: calculateAvailableSets(stock, quantity),
  };
}

function calculateRetailPrice(items) {
  const total = items.reduce(function (sum, item) {
    return sum + item.retailTotal;
  }, 0);

  return roundMoney(total);
}

function calculateComboPrice(combo, retailPrice) {
  const discountValue = Number(combo.discount_value || 0);
  let price;

  if (combo.price_mode === "fixed") {
    price = retailPrice - discountValue;
  } else if (combo.price_mode === "manual") {
    price = Number(combo.manual_price || 0);
  } else {
    price = retailPrice * (1 - discountValue / 100);
  }

  return roundMoney(price);
}

function calculateAvailableQuantity(items) {
  if (items.length === 0) {
    return 0;
  }

  let smallestQuantity = items[0].availableSets;

  for (let index = 1; index < items.length; index += 1) {
    if (items[index].availableSets < smallestQuantity) {
      smallestQuantity = items[index].availableSets;
    }
  }

  return smallestQuantity;
}

function calculateSavingsPercent(savings, retailPrice) {
  if (retailPrice <= 0) {
    return 0;
  }

  return Math.round((savings / retailPrice) * 100);
}

function checkAvailability(combo, items, availableQuantity, comboPrice, retailPrice) {
  const isActive = Boolean(combo.status);
  const hasItems = items.length > 0;
  const hasEnoughStock = availableQuantity > 0;
  const hasValidPrice = comboPrice > 0 && comboPrice < retailPrice;

  return isActive && hasItems && hasEnoughStock && hasValidPrice;
}

function calculateCombo(combo) {
  const plainCombo = getPlainCombo(combo);
  const quantityMultiplier = Number(plainCombo.quantity_multiplier || 1);
  const comboItems = plainCombo.ComboItems || [];

  const items = comboItems.map(function (comboItem) {
    return calculateItem(comboItem, quantityMultiplier);
  });

  const retailPrice = calculateRetailPrice(items);
  const comboPrice = calculateComboPrice(plainCombo, retailPrice);
  const savings = Math.max(0, retailPrice - comboPrice);
  const availableQuantity = calculateAvailableQuantity(items);

  const result = Object.assign({}, plainCombo);
  result.items = items;
  result.retailPrice = retailPrice;
  result.comboPrice = comboPrice;
  result.savings = savings;
  result.savingsPercent = calculateSavingsPercent(savings, retailPrice);
  result.availableQuantity = availableQuantity;
  result.isAvailable = checkAvailability(
    plainCombo,
    items,
    availableQuantity,
    comboPrice,
    retailPrice
  );

  return result;
}

function addMinimumQuantity(combo, minimumQuantity) {
  const result = Object.assign({}, calculateCombo(combo));
  result.minimum_quantity = minimumQuantity;
  return result;
}

async function findCombos(options = {}) {
  const includeUnavailable = options.includeUnavailable || false;
  const comboId = options.id || null;
  const where = {};

  if (comboId) {
    where.id = comboId;
  }

  if (!includeUnavailable) {
    where.status = true;
  }

  const comboQuery = db.Combo.findAll({
    where: where,
    include: [
      {
        model: db.ComboItem,
        include: [
          {
            model: db.Product,
            attributes: ["id", "name", "price", "quantity", "unit", "image", "status"],
          },
        ],
      },
    ],
    order: [
      ["sort_order", "ASC"],
      ["createdAt", "DESC"],
    ],
  });

  const settingQuery = db.ComboSetting.findByPk(1);
  const queryResults = await Promise.all([comboQuery, settingQuery]);
  const combos = queryResults[0];
  const setting = queryResults[1];
  const configuredMinimum = setting ? setting.minimum_quantity : 1;
  const minimumQuantity = Math.max(1, Number(configuredMinimum || 1));

  const calculatedCombos = combos.map(function (combo) {
    return addMinimumQuantity(combo, minimumQuantity);
  });

  if (includeUnavailable) {
    return calculatedCombos;
  }

  return calculatedCombos.filter(function (combo) {
    return combo.isAvailable;
  });
}

module.exports = {
  calculateCombo: calculateCombo,
  findCombos: findCombos,
};
