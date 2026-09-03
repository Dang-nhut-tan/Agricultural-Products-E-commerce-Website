const db = require("../models");
const orderInventory = require("../services/orderInventory");
const { normalizeCode, validateCouponRecord, calculateDiscount } = require("../services/couponService");

const PAYPAL_API = process.env.PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

const getExchangeRate = () => {
  const rate = Number(process.env.PAYPAL_VND_PER_USD || 25000);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("PAYPAL_VND_PER_USD không hợp lệ.");
  return rate;
};

async function paypalRequest(path, options = {}) {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    const error = new Error("PayPal chưa được cấu hình. Hãy thêm PAYPAL_CLIENT_ID và PAYPAL_CLIENT_SECRET.");
    error.status = 503;
    throw error;
  }

  const tokenResponse = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) throw new Error(tokenData.error_description || "Không thể kết nối PayPal.");

  const response = await fetch(`${PAYPAL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || data.details?.[0]?.description || "PayPal từ chối giao dịch.");
    error.status = 502;
    throw error;
  }
  return data;
}

function getConfig(req, res) {
  res.json({
    enabled: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
    clientId: process.env.PAYPAL_CLIENT_ID || "",
    currency: "USD",
    standardShippingFee: Math.max(0, Number(process.env.STANDARD_SHIPPING_FEE || 0)),
  });
}

async function validateCoupon(req, res) {
  const code = normalizeCode(req.body.code);
  const subtotal = Number(req.body.subtotal);
  if (!code || !Number.isFinite(subtotal) || subtotal < 0) {
    return res.status(400).json({ message: "Mã giảm giá hoặc giá trị đơn hàng không hợp lệ." });
  }
  const coupon = await db.Coupon.findOne({ where: { code } });
  const error = validateCouponRecord(coupon, subtotal);
  if (error) return res.status(409).json({ message: error });
  const alreadyUsed = await db.CouponUser.count({
    where: { coupon_id: coupon.id, user_id: req.session.userId },
  });
  if (alreadyUsed) return res.status(409).json({ message: "Bạn đã sử dụng mã giảm giá này." });
  const discount = calculateDiscount(coupon, subtotal);
  return res.json({ data: { code: coupon.code, discount, totalAfterDiscount: subtotal - discount } });
}

async function createOrder(req, res) {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const addressId = Number(req.body.addressId);
  const couponCode = normalizeCode(req.body.couponCode);
  if (!items.length) return res.status(400).json({ message: "Giỏ hàng đang trống." });

  const quantities = new Map();
  const comboQuantities = new Map();
  for (const item of items) {
    const isCombo = item.type === "combo" || item.comboId;
    const id = Number(isCombo ? item.comboId : item.id);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ message: "Sản phẩm hoặc số lượng không hợp lệ." });
    }
    const target = isCombo ? comboQuantities : quantities;
    target.set(id, (target.get(id) || 0) + quantity);
  }

  const [address, products, availableCombos] = await Promise.all([
    db.UserAddress.findOne({ where: { id: addressId, user_id: req.session.userId } }),
    db.Product.findAll({ where: { id: [...quantities.keys()], status: 1 } }),
    comboQuantities.size
      ? require("../services/comboService").findCombos()
      : Promise.resolve([]),
  ]);
  if (!address) return res.status(400).json({ message: "Vui lòng chọn địa chỉ nhận hàng hợp lệ." });
  if (products.length !== quantities.size) return res.status(400).json({ message: "Có sản phẩm không còn bán." });

  let subtotal = 0;
  const details = products.map((product) => {
    const quantity = quantities.get(product.id);
    if (Number(product.quantity) < quantity) {
      const error = new Error(`${product.name} không đủ số lượng trong kho.`);
      error.status = 409;
      throw error;
    }
    const price = Number(product.price);
    subtotal += price * quantity;
    return { product, quantity, price };
  });

  const combosById = new Map(availableCombos.map((combo) => [Number(combo.id), combo]));
  for (const [comboId, comboQuantity] of comboQuantities) {
    const combo = combosById.get(comboId);
    if (!combo) return res.status(409).json({ message: "Combo không còn đủ hàng hoặc đã tạm ẩn." });
    if (comboQuantity < Number(combo.minimum_quantity || 1)) {
      return res.status(400).json({ message: `${combo.name} yêu cầu mua tối thiểu ${combo.minimum_quantity} combo.` });
    }
    if (comboQuantity > combo.availableQuantity) {
      return res.status(409).json({ message: `${combo.name} chỉ còn ${combo.availableQuantity} combo.` });
    }
    subtotal += combo.comboPrice * comboQuantity;
    let allocated = 0;
    combo.items.forEach((item, index) => {
      const quantity = item.quantity * comboQuantity;
      if (!Number.isInteger(quantity)) {
        const error = new Error(`${combo.name} có số lượng thành phần không hợp lệ.`);
        error.status = 400;
        throw error;
      }
      const lineTotal = index === combo.items.length - 1
        ? combo.comboPrice * comboQuantity - allocated
        : Math.round((item.retailTotal / combo.retailPrice) * combo.comboPrice * comboQuantity);
      allocated += lineTotal;
      details.push({
        product: { id: item.productId, name: item.name, unit: item.unit },
        quantity,
        price: quantity ? lineTotal / quantity : 0,
        comboId: combo.id,
        comboName: combo.name,
        comboQuantity,
      });
    });
  }

  const shippingFee = comboQuantities.size
    ? 0
    : Math.max(0, Number(process.env.STANDARD_SHIPPING_FEE || 0));
  let discount = 0;
  let appliedCoupon = null;
  let total = subtotal + shippingFee;
  const transaction = await db.sequelize.transaction();
  let order;
  let payment;
  try {
    if (couponCode) {
      appliedCoupon = await db.Coupon.findOne({
        where: { code: couponCode }, transaction, lock: transaction.LOCK.UPDATE,
      });
      const couponError = validateCouponRecord(appliedCoupon, subtotal);
      if (couponError) {
        const error = new Error(couponError);
        error.status = 409;
        throw error;
      }
      const alreadyUsed = await db.CouponUser.count({
        where: { coupon_id: appliedCoupon.id, user_id: req.session.userId }, transaction,
      });
      if (alreadyUsed) {
        const error = new Error("Bạn đã sử dụng mã giảm giá này.");
        error.status = 409;
        throw error;
      }
      discount = calculateDiscount(appliedCoupon, subtotal);
      total = subtotal - discount + shippingFee;
    }
    order = await db.Order.create({
      user_id: req.session.userId,
      address_id: address.id,
      status: 0,
      subtotal,
      shipping_fee: shippingFee,
      discount,
      total,
    }, { transaction });
    await db.OrderDetail.bulkCreate(details.map(({ product, quantity, price, comboId, comboName, comboQuantity }) => ({
      order_id: order.id,
      product_id: product.id,
      product_name: product.name,
      price,
      quantity,
      unit: product.unit,
      combo_id: comboId || null,
      combo_name: comboName || null,
      combo_quantity: comboQuantity || null,
    })), { transaction });
    await db.Shipment.create({
      order_id: order.id,
      receiver_name: address.receiver_name,
      phone: address.phone,
      address: address.address,
      ward: address.ward,
      district: address.district,
      province: address.province,
      shipping_status: 0,
      shipping_fee: shippingFee,
    }, { transaction });
    payment = await db.Payment.create({
      order_id: order.id,
      method: "PAYPAL",
      status: 0,
      amount: total,
    }, { transaction });
    if (appliedCoupon) {
      await db.OrderCoupon.create({
        order_id: order.id, coupon_id: appliedCoupon.id, discount_amount: discount,
      }, { transaction });
      await db.CouponUser.create({
        coupon_id: appliedCoupon.id, user_id: req.session.userId, used_at: new Date(),
      }, { transaction });
      await appliedCoupon.increment("used_quantity", { by: 1, transaction });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  try {
    const usdAmount = (total / getExchangeRate()).toFixed(2);
    const paypalOrder = await paypalRequest("/v2/checkout/orders", {
      method: "POST",
      headers: { "PayPal-Request-Id": `order-${order.id}` },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: String(order.id),
          custom_id: String(order.id),
          description: `Đơn hàng Nông Sản Xanh #${order.id}`,
          amount: { currency_code: "USD", value: usdAmount },
        }],
      }),
    });
    await payment.update({
      transaction_code: paypalOrder.id,
      gateway_response: JSON.stringify(paypalOrder),
    });
    return res.status(201).json({ id: paypalOrder.id });
  } catch (error) {
    await payment.update({ status: 2, gateway_response: JSON.stringify({ error: error.message }) });
    throw error;
  }
}

async function captureOrder(req, res) {
  const paypalOrderId = String(req.params.id || "");
  const payment = await db.Payment.findOne({
    where: { transaction_code: paypalOrderId, method: "PAYPAL" },
    include: [{ model: db.Order, where: { user_id: req.session.userId } }],
  });
  if (!payment) return res.status(404).json({ message: "Không tìm thấy giao dịch PayPal." });
  if (Number(payment.status) === 1) return res.json({ message: "Đơn hàng đã được thanh toán.", orderId: payment.order_id });

  const capture = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: "POST",
    headers: { "PayPal-Request-Id": `capture-${payment.order_id}` },
  });
  const captureData = capture.purchase_units?.[0]?.payments?.captures?.[0];
  const expectedUsd = (Number(payment.amount) / getExchangeRate()).toFixed(2);
  if (capture.status !== "COMPLETED" || captureData?.status !== "COMPLETED" ||
      captureData?.amount?.currency_code !== "USD" || captureData?.amount?.value !== expectedUsd) {
    await payment.update({ gateway_response: JSON.stringify(capture) });
    return res.status(409).json({ message: "PayPal chưa xác nhận đủ số tiền của đơn hàng." });
  }

  await db.sequelize.transaction(async (transaction) => {
    await orderInventory.reserve(payment.order_id, transaction);
    await payment.update({
      status: 1,
      paid_at: new Date(),
      gateway_response: JSON.stringify(capture),
    }, { transaction });
    await payment.Order.update({ status: 1 }, {
      transaction,
      statusHistory: {
        userId: req.session.userId,
        reason: "PayPal xác nhận thanh toán thành công",
      },
    });
  });
  return res.json({ message: "Thanh toán PayPal thành công.", orderId: payment.order_id });
}

module.exports = { getConfig, validateCoupon, createOrder, captureOrder };
