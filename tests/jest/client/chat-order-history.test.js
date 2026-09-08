jest.mock("../../../src/models", () => ({
  Order: {
    findAll: jest.fn(),
    sum: jest.fn(),
    count: jest.fn(),
  },
  OrderDetail: {},
  Shipment: {},
  Payment: {},
}));
jest.mock("../../../src/services/geminiService", () => ({ generateJson: jest.fn() }));
jest.mock("../../../src/services/recipeSearch", () => ({ suggestRecipe: jest.fn() }));

const db = require("../../../src/models");
const { getOrderContext, localReply } = require("../../../src/controllers/chatController");
const ChatReq = require("../../../src/dtos/request/chat/chatReq");

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

describe("Validation chatbot - giá trị biên và phân vùng tương đương", () => {
  it.each([
    ["nhỏ nhất", "a"],
    ["lớn nhất", "a".repeat(500)],
  ])("chấp nhận tin nhắn tại biên %s", (_label, message) => {
    const result = ChatReq.validate({ message, history: [] });
    expect(result.error).toBeUndefined();
  });

  it.each([
    ["rỗng", ""],
    ["chỉ chứa khoảng trắng", "   "],
    ["trên độ dài tối đa", "a".repeat(501)],
  ])("từ chối tin nhắn thuộc phân vùng %s", (_label, message) => {
    const result = ChatReq.validate({ message, history: [] });
    expect(result.error).toBeDefined();
  });

  it("chấp nhận lịch sử tại biên tối đa 8 tin nhắn", () => {
    const history = Array.from({ length: 8 }, function (_, index) {
      return {
        role: index % 2 === 0 ? "user" : "model",
        text: "a".repeat(1000),
      };
    });

    const result = ChatReq.validate({ message: "Tiếp tục", history });
    expect(result.error).toBeUndefined();
  });

  it("từ chối lịch sử vượt biên tối đa một tin nhắn", () => {
    const history = Array.from({ length: 9 }, function () {
      return { role: "user", text: "Nội dung" };
    });

    const result = ChatReq.validate({ message: "Tiếp tục", history });
    expect(result.error).toBeDefined();
  });

  it.each([
    ["role ngoài hai giá trị cho phép", { role: "assistant", text: "Nội dung" }],
    ["text vượt tối đa một ký tự", { role: "user", text: "a".repeat(1001) }],
  ])("từ chối phần tử history thuộc phân vùng %s", (_label, historyItem) => {
    const result = ChatReq.validate({
      message: "Tiếp tục",
      history: [historyItem],
    });

    expect(result.error).toBeDefined();
  });
});
