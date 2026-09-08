jest.mock("../../../src/models", () => ({
  UserAddress: { findOne: jest.fn() },
  Product: { findAll: jest.fn(), findAndCountAll: jest.fn() },
  Category: {},
  Brand: {},
  ProductImage: {},
  Sequelize: { Op: { like: Symbol("like") } },
  Order: { create: jest.fn() },
  OrderDetail: { bulkCreate: jest.fn() },
  Shipment: { create: jest.fn() },
  Payment: { create: jest.fn(), findOne: jest.fn() },
  sequelize: { transaction: jest.fn() },
}));
jest.mock("../../../src/services/orderInventory", () => ({
  reserve: jest.fn(),
  restore: jest.fn(),
}));

const db = require("../../../src/models");
const { createOrder } = require("../../../src/controllers/paymentController");
const { getProducts } = require("../../../src/controllers/productController");

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

describe("Truy vấn sản phẩm - biên phân trang và phân vùng tìm kiếm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.Product.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
  });

  async function executeProductQuery(query) {
    const res = response();
    await getProducts({ query }, res);
    return {
      responseBody: res.json.mock.calls[0][0],
      queryOptions: db.Product.findAndCountAll.mock.calls[0][0],
    };
  }

  it.each([
    ["trang dưới biên", "0", 1, 0],
    ["trang nhỏ nhất", "1", 1, 0],
    ["trang nhỏ nhất cộng một", "2", 2, 8],
    ["trang không phải số", "abc", 1, 0],
  ])("chuẩn hóa %s", async (_label, page, expectedPage, expectedOffset) => {
    const result = await executeProductQuery({ page });

    expect(result.responseBody.pagination.page).toBe(expectedPage);
    expect(result.queryOptions.offset).toBe(expectedOffset);
  });

  it.each([
    ["âm một", "-1", 1],
    ["bằng không nên dùng mặc định", "0", 8],
    ["nhỏ nhất", "1", 1],
    ["nhỏ nhất cộng một", "2", 2],
    ["lớn nhất trừ một", "23", 23],
    ["lớn nhất", "24", 24],
    ["trên biên lớn nhất", "25", 24],
    ["không phải số", "abc", 8],
  ])("chuẩn hóa limit tại biên %s", async (_label, limit, expectedLimit) => {
    const result = await executeProductQuery({ limit });

    expect(result.responseBody.pagination.limit).toBe(expectedLimit);
    expect(result.queryOptions.limit).toBe(expectedLimit);
  });

  it("thêm category và từ khóa đã cắt khoảng trắng vào phân vùng có bộ lọc", async () => {
    const result = await executeProductQuery({
      category: "4",
      search: "  rau xanh  ",
    });
    const likeOperator = db.Sequelize.Op.like;

    expect(result.queryOptions.where.category_id).toBe("4");
    expect(result.queryOptions.where.name[likeOperator]).toBe("%rau xanh%");
  });

  it("không thêm điều kiện tùy chọn vào phân vùng không có bộ lọc", async () => {
    const result = await executeProductQuery({});
    expect(result.queryOptions.where).toEqual({ status: 1 });
  });
});
