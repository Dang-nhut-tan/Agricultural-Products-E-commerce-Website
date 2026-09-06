jest.mock("../../src/models", () => ({
  Order: { findAll: jest.fn(), findOne: jest.fn() },
  OrderDetail: {},
  Product: {},
  Payment: {},
  Shipment: {},
  OrderHistory: {},
  sequelize: { transaction: jest.fn() },
}));
jest.mock("../../src/services/orderInventory", () => ({
  restore: jest.fn(),
}));

const db = require("../../src/models");
const orderInventory = require("../../src/services/orderInventory");
const controller = require("../../src/controllers/orderController");

function response() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("Controller đơn hàng - kiểm tra quyền sở hữu và điều kiện hủy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.sequelize.transaction.mockImplementation(async (work) =>
      work({ LOCK: { UPDATE: "UPDATE" } }),
    );
  });

  it("chỉ liệt kê đơn hàng thuộc người dùng đã đăng nhập", async () => {
    db.Order.findAll.mockResolvedValue([]);
    const res = response();

    await controller.list({ session: { userId: 42 } }, res);

    expect(db.Order.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 42 } }),
    );
    expect(res.json).toHaveBeenCalledWith({ data: [] });
  });

  it("không hiển thị đơn hàng không thuộc người dùng", async () => {
    db.Order.findOne.mockResolvedValue(null);
    const res = response();

    await controller.detail(
      { params: { id: "99" }, session: { userId: 42 } },
      res,
    );

    expect(db.Order.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "99", user_id: 42 } }),
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it.each([0, 1])("hủy đơn ở trạng thái %s và khôi phục tồn kho nguyên vẹn", async (status) => {
    const order = {
      id: 7,
      status,
      update: jest.fn().mockResolvedValue(undefined),
    };
    db.Order.findOne.mockResolvedValue(order);
    const res = response();

    await controller.cancel(
      {
        params: { id: "7" },
        session: { userId: 42 },
        body: { reason: "Đổi kế hoạch" },
      },
      res,
    );

    expect(orderInventory.restore).toHaveBeenCalledWith(7, expect.any(Object));
    expect(order.update).toHaveBeenCalledWith(
      { status: 5 },
      expect.objectContaining({
        statusHistory: { userId: 42, reason: "Đổi kế hoạch" },
      }),
    );
    expect(res.json).toHaveBeenCalledWith({ message: "Đã hủy đơn hàng." });
  });

  it.each([2, 3, 4, 5])("từ chối hủy khi đơn hàng đã đạt trạng thái %s", async (status) => {
    db.Order.findOne.mockResolvedValue({ id: 7, status });
    const res = response();

    await controller.cancel(
      { params: { id: "7" }, session: { userId: 42 }, body: {} },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(orderInventory.restore).not.toHaveBeenCalled();
    expect(db.sequelize.transaction).not.toHaveBeenCalled();
  });

  it("giới hạn lý do hủy được lưu ở 500 ký tự", async () => {
    const order = { id: 7, status: 0, update: jest.fn() };
    db.Order.findOne.mockResolvedValue(order);

    await controller.cancel(
      {
        params: { id: "7" },
        session: { userId: 42 },
        body: { reason: "x".repeat(700) },
      },
      response(),
    );

    const options = order.update.mock.calls[0][1];
    expect(options.statusHistory.reason).toHaveLength(500);
  });
});
