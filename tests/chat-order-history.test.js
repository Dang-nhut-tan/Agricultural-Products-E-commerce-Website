jest.mock("../src/models", () => ({
  Order: {
    findAll: jest.fn(),
    sum: jest.fn(),
    count: jest.fn(),
  },
  OrderDetail: {},
  Shipment: {},
  Payment: {},
}));
jest.mock("../src/services/geminiService", () => ({ generateJson: jest.fn() }));
jest.mock("../src/services/recipeSearch", () => ({ suggestRecipe: jest.fn() }));

const db = require("../src/models");
const { getOrderContext, localReply } = require("../src/controllers/chatController");

describe("Lịch sử đơn hàng trong chatbot", () => {
  beforeEach(() => jest.clearAllMocks());

  it("giới hạn mọi truy vấn đơn hàng theo người dùng đã đăng nhập", async () => {
    db.Order.findAll.mockResolvedValue([]);
    db.Order.sum.mockResolvedValue(250000);
    db.Order.count.mockResolvedValue(2);

    const context = await getOrderContext(42);

    expect(db.Order.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { user_id: 42 },
      limit: 10,
    }));
    expect(db.Order.sum).toHaveBeenCalledWith("total", {
      where: { user_id: 42, status: 4 },
    });
    expect(db.Order.count).toHaveBeenCalledWith({
      where: { user_id: 42, status: 4 },
    });
    expect(context.completedTotal).toBe(250000);
  });

  it("trả lời tổng chi tiêu đã hoàn thành mà không cần Gemini", () => {
    const answer = localReply("Tôi đã mua ở quán bao nhiêu tiền?", [], {
      completedOrderCount: 3,
      completedTotal: 475000,
      recentOrders: [{ id: 9, statusLabel: "Đã hoàn thành", total: 100000 }],
    });

    expect(answer).toContain("3 đơn hàng");
    expect(answer).toContain("475.000");
  });

  it("thông báo trạng thái đơn gần nhất và mã vận đơn", () => {
    const answer = localReply("Theo dõi đơn hàng của tôi", [], {
      completedOrderCount: 0,
      completedTotal: 0,
      recentOrders: [{
        id: 81,
        statusLabel: "Đang giao",
        total: 120000,
        trackingCode: "VN123",
      }],
    });

    expect(answer).toContain("#81");
    expect(answer).toContain("Đang giao");
    expect(answer).toContain("VN123");
  });
});
