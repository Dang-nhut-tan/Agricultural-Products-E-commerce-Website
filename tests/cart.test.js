jest.mock("../src/models", () => ({
  UserAddress: { findOne: jest.fn() },
  Product: { findAll: jest.fn() },
  Order: { create: jest.fn() },
  OrderDetail: { bulkCreate: jest.fn() },
  Shipment: { create: jest.fn() },
  Payment: { create: jest.fn(), findOne: jest.fn() },
  sequelize: { transaction: jest.fn() },
}));
jest.mock("../src/services/orderInventory", () => ({
  reserve: jest.fn(),
  restore: jest.fn(),
}));

const db = require("../src/models");
const { createOrder } = require("../src/controllers/paymentController");

function response() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("Thanh toán giỏ hàng - các lớp tương đương và giới hạn số lượng", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function execute(items, addressId = 1) {
    const res = response();
    await createOrder(
      { body: { items, addressId }, session: { userId: 9 } },
      res,
    );
    return res;
  }

  it("từ chối trường hợp giỏ hàng trống", async () => {
    const res = await execute([]);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.UserAddress.findOne).not.toHaveBeenCalled();
  });

  it.each([
    ["tối thiểu trừ một", 0],
    ["tối đa cộng một", 100],
    ["không phải số nguyên", 1.5],
    ["không phải dạng số", "abc"],
  ])("từ chối số lượng tại trường hợp %s", async (_label, quantity) => {
    const res = await execute([{ id: 10, quantity }]);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.UserAddress.findOne).not.toHaveBeenCalled();
  });

  it.each([
    ["tối thiểu", 1],
    ["tối thiểu cộng một", 2],
    ["tối đa trừ một", 98],
    ["tối đa", 99],
  ])("chấp nhận số lượng tại trường hợp %s khi tồn kho đủ", async (_label, quantity) => {
    const transaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    db.sequelize.transaction.mockResolvedValue(transaction);
    db.UserAddress.findOne.mockResolvedValue({
      id: 1,
      receiver_name: "An",
      phone: "0901",
      address: "1 Main",
      ward: "",
      district: "",
      province: "HCM",
    });
    db.Product.findAll.mockResolvedValue([
      { id: 10, name: "Rau", price: 1_000, quantity, unit: "kg" },
    ]);
    db.Order.create.mockResolvedValue({ id: 50 });
    db.Payment.create.mockResolvedValue({ update: jest.fn() });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "PAYPAL-1" }) });
    process.env.PAYPAL_CLIENT_ID = "client";
    process.env.PAYPAL_CLIENT_SECRET = "secret";

    const res = await execute([{ id: 10, quantity }]);

    expect(db.OrderDetail.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ quantity })],
      { transaction },
    );
    expect(transaction.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("từ chối trường hợp địa chỉ không hợp lệ", async () => {
    db.UserAddress.findOne.mockResolvedValue(null);
    db.Product.findAll.mockResolvedValue([{ id: 10 }]);
    const res = await execute([{ id: 10, quantity: 1 }], 999);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.Order.create).not.toHaveBeenCalled();
  });

  it("từ chối số lượng lớn hơn tồn kho một đơn vị", async () => {
    db.UserAddress.findOne.mockResolvedValue({ id: 1 });
    db.Product.findAll.mockResolvedValue([
      { id: 10, name: "Rau", price: 1_000, quantity: 5 },
    ]);

    await expect(execute([{ id: 10, quantity: 6 }])).rejects.toMatchObject({
      status: 409,
    });
    expect(db.Order.create).not.toHaveBeenCalled();
  });
});
