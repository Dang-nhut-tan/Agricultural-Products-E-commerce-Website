jest.mock("../src/models", () => ({
  User: { findByPk: jest.fn() },
}));

const { User } = require("../src/models");
const adminOnly = require("../src/middlewares/adminOnly");

function response() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("Phân quyền quản trị - các lớp tương đương", () => {
  beforeEach(() => jest.clearAllMocks());

  it("trả về 401 khi chưa đăng nhập", async () => {
    const next = jest.fn();
    const res = response();

    await adminOnly({ session: {} }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(User.findByPk).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ["không tìm thấy người dùng", null],
    ["quản trị viên không hoạt động", { id: 1, role: 1, status: 0 }],
    ["quản trị viên bị cấm", { id: 1, role: 1, status: 2 }],
    ["khách hàng đang hoạt động", { id: 2, role: 2, status: 1 }],
  ])("trả về 403 đối với trường hợp %s", async (_label, user) => {
    User.findByPk.mockResolvedValue(user);
    const next = jest.fn();
    const res = response();

    await adminOnly({ session: { userId: 1 } }, res, next);

    expect(User.findByPk).toHaveBeenCalledWith(1, {
      attributes: ["id", "role", "status"],
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("cho phép quản trị viên đang hoạt động truy cập", async () => {
    User.findByPk.mockResolvedValue({ id: 1, role: 1, status: 1 });
    const next = jest.fn();
    const res = response();

    await adminOnly({ session: { userId: 1 } }, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("chấp nhận vai trò và trạng thái dạng số được lưu dưới dạng chuỗi", async () => {
    User.findByPk.mockResolvedValue({ id: 1, role: "1", status: "1" });
    const next = jest.fn();

    await adminOnly({ session: { userId: 1 } }, response(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
