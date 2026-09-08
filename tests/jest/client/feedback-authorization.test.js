jest.mock("../../../src/models", () => ({
  Product: { findOne: jest.fn() },
  Feedback: { findOne: jest.fn(), create: jest.fn() },
  User: { findByPk: jest.fn() },
}));
jest.mock("sanitize-html", () => jest.fn((value) =>
  String(value).replace(/<[^>]*>/g, ""),
));

const db = require("../../../src/models");
const controller = require("../../../src/controllers/feedbackController");
const InsertFeedbackReq = require("../../../src/dtos/request/feedback/insertFeedbackReq");

function response() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("Controller đánh giá - phân quyền theo chủ sở hữu", () => {
  beforeEach(() => jest.clearAllMocks());

  it("tạo đánh giá cho người dùng trong phiên hiện tại và loại bỏ HTML", async () => {
    db.Product.findOne.mockResolvedValue({ id: 10 });
    const feedback = {
      id: 5,
      product_id: 10,
      user_id: 42,
      star: 5,
      content: "Nội dung tốt",
      reload: jest.fn(),
    };
    db.Feedback.create.mockResolvedValue(feedback);
    const res = response();

    await controller.createFeedback(
      {
        params: { productId: "10" },
        session: { userId: 42 },
        body: { star: 5, content: "<b>Nội dung tốt</b><script>x</script>" },
      },
      res,
    );

    expect(db.Feedback.create).toHaveBeenCalledWith({
      product_id: 10,
      user_id: 42,
      star: 5,
      content: "Nội dung tốtx",
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("chỉ cập nhật đánh giá khi khớp cả sản phẩm và chủ sở hữu", async () => {
    db.Feedback.findOne.mockResolvedValue(null);
    const res = response();

    await controller.updateFeedback(
      {
        params: { productId: "10", feedbackId: "5" },
        session: { userId: 42 },
        body: { star: 4 },
      },
      res,
    );

    expect(db.Feedback.findOne).toHaveBeenCalledWith({
      where: { id: "5", product_id: "10", user_id: 42 },
    });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("không cho khách hàng xóa đánh giá của người dùng khác", async () => {
    const feedback = { user_id: 99, destroy: jest.fn() };
    db.Feedback.findOne.mockResolvedValue(feedback);
    db.User.findByPk.mockResolvedValue({ id: 42, role: 2 });
    const res = response();

    await controller.deleteFeedback(
      {
        params: { productId: "10", feedbackId: "5" },
        session: { userId: 42 },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(feedback.destroy).not.toHaveBeenCalled();
  });

  it.each([
    ["chủ sở hữu", 42, 2],
    ["administrator", 99, 1],
  ])("cho phép %s xóa đánh giá", async (_label, ownerId, role) => {
    const feedback = {
      user_id: ownerId,
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    db.Feedback.findOne.mockResolvedValue(feedback);
    db.User.findByPk.mockResolvedValue({ id: 42, role });
    const res = response();

    await controller.deleteFeedback(
      {
        params: { productId: "10", feedbackId: "5" },
        session: { userId: 42 },
      },
      res,
    );

    expect(feedback.destroy).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ message: "Đã xóa bình luận." });
  });
});

describe("Validation đánh giá - giá trị biên và phân vùng tương đương", () => {
  const validFeedback = {
    star: 3,
    content: "Sản phẩm tốt",
  };

  it.each([
    ["nhỏ nhất", 1],
    ["lớn nhất", 5],
  ])("chấp nhận số sao tại biên %s", (_label, star) => {
    const result = InsertFeedbackReq.validate(Object.assign({}, validFeedback, { star: star }));
    expect(result.error).toBeUndefined();
  });

  it.each([
    ["dưới biên dưới", 0],
    ["trên biên trên", 6],
    ["không phải số nguyên", 2.5],
    ["không phải số", "tốt"],
  ])("từ chối số sao thuộc phân vùng %s", (_label, star) => {
    const result = InsertFeedbackReq.validate(Object.assign({}, validFeedback, { star: star }));
    expect(result.error).toBeDefined();
  });

  it.each([
    ["nhỏ nhất", "a".repeat(2)],
    ["lớn nhất", "a".repeat(1000)],
  ])("chấp nhận nội dung tại biên %s", (_label, content) => {
    const result = InsertFeedbackReq.validate(Object.assign({}, validFeedback, { content: content }));
    expect(result.error).toBeUndefined();
  });

  it.each([
    ["dưới độ dài tối thiểu", "a"],
    ["trên độ dài tối đa", "a".repeat(1001)],
    ["chỉ chứa khoảng trắng", "   "],
  ])("từ chối nội dung thuộc phân vùng %s", (_label, content) => {
    const result = InsertFeedbackReq.validate(Object.assign({}, validFeedback, { content: content }));
    expect(result.error).toBeDefined();
  });
});
