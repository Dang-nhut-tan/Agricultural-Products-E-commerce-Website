jest.mock("../src/models", () => ({
  Payment: { findOne: jest.fn() },
  Order: {},
  UserAddress: {},
  Product: {},
  OrderDetail: {},
  Shipment: {},
  sequelize: { transaction: jest.fn() },
}));
jest.mock("../src/services/orderInventory", () => ({
  reserve: jest.fn(),
  restore: jest.fn(),
}));

const db = require("../src/models");
const orderInventory = require("../src/services/orderInventory");
const { captureOrder } = require("../src/controllers/paymentController");

function response() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function payment(overrides = {}) {
  return {
    order_id: 70,
    amount: 250000,
    status: 0,
    update: jest.fn().mockResolvedValue(undefined),
    Order: { update: jest.fn().mockResolvedValue(undefined) },
    ...overrides,
  };
}

function paypalFetch(capture) {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "token" }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => capture,
    });
}

describe("Xác nhận PayPal - quyền sở hữu, số tiền và tính nhất quán", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PAYPAL_CLIENT_ID = "client";
    process.env.PAYPAL_CLIENT_SECRET = "secret";
    process.env.PAYPAL_VND_PER_USD = "25000";
    db.sequelize.transaction.mockImplementation(async (work) => work({ id: "tx" }));
  });

  afterEach(() => {
    delete global.fetch;
  });

  it("giới hạn giao dịch PayPal theo tài khoản đã đăng nhập", async () => {
    db.Payment.findOne.mockResolvedValue(null);
    const res = response();

    await captureOrder(
      { params: { id: "PAYPAL-70" }, session: { userId: 42 } },
      res,
    );

    expect(db.Payment.findOne).toHaveBeenCalledWith({
      where: { transaction_code: "PAYPAL-70", method: "PAYPAL" },
      include: [{ model: db.Order, where: { user_id: 42 } }],
    });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("trả về thành công nhất quán cho giao dịch đã thanh toán", async () => {
    db.Payment.findOne.mockResolvedValue(payment({ status: 1 }));
    const res = response();

    await captureOrder(
      { params: { id: "PAYPAL-70" }, session: { userId: 42 } },
      res,
    );

    expect(res.json).toHaveBeenCalledWith({
      message: "Đơn hàng đã được thanh toán.",
      orderId: 70,
    });
    expect(db.sequelize.transaction).not.toHaveBeenCalled();
    expect(global.fetch).toBeUndefined();
  });

  it("từ chối xác nhận có số tiền khác với đơn hàng trong hệ thống", async () => {
    const record = payment();
    db.Payment.findOne.mockResolvedValue(record);
    paypalFetch({
      status: "COMPLETED",
      purchase_units: [{ payments: { captures: [{
        status: "COMPLETED",
        amount: { currency_code: "USD", value: "9.99" },
      }] } }],
    });
    const res = response();

    await captureOrder(
      { params: { id: "PAYPAL-70" }, session: { userId: 42 } },
      res,
    );

    expect(record.update).toHaveBeenCalledWith(expect.objectContaining({
      gateway_response: expect.any(String),
    }));
    expect(res.status).toHaveBeenCalledWith(409);
    expect(orderInventory.reserve).not.toHaveBeenCalled();
  });

  it("từ chối khoản tiền hoàn tất bằng loại tiền khác USD", async () => {
    db.Payment.findOne.mockResolvedValue(payment());
    paypalFetch({
      status: "COMPLETED",
      purchase_units: [{ payments: { captures: [{
        status: "COMPLETED",
        amount: { currency_code: "EUR", value: "10.00" },
      }] } }],
    });
    const res = response();

    await captureOrder(
      { params: { id: "PAYPAL-70" }, session: { userId: 42 } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(db.sequelize.transaction).not.toHaveBeenCalled();
  });

  it("giữ tồn kho và cập nhật thanh toán cùng đơn hàng trong một giao dịch", async () => {
    const record = payment();
    db.Payment.findOne.mockResolvedValue(record);
    paypalFetch({
      status: "COMPLETED",
      purchase_units: [{ payments: { captures: [{
        status: "COMPLETED",
        amount: { currency_code: "USD", value: "10.00" },
      }] } }],
    });
    const res = response();

    await captureOrder(
      { params: { id: "PAYPAL-70" }, session: { userId: 42 } },
      res,
    );

    expect(orderInventory.reserve).toHaveBeenCalledWith(70, { id: "tx" });
    expect(record.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 1, paid_at: expect.any(Date) }),
      { transaction: { id: "tx" } },
    );
    expect(record.Order.update).toHaveBeenCalledWith(
      { status: 1 },
      expect.objectContaining({
        transaction: { id: "tx" },
        statusHistory: expect.objectContaining({ userId: 42 }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith({
      message: "Thanh toán PayPal thành công.",
      orderId: 70,
    });
  });
});
