jest.mock("bcryptjs", () => ({ compare: jest.fn() }));
jest.mock("../src/models", () => ({
  sequelize: {},
  User: { findOne: jest.fn() },
  UserAddress: {},
}));
jest.mock("../src/services/cloudinaryService", () => ({ uploadImage: jest.fn() }));

const bcrypt = require("bcryptjs");
const { User } = require("../src/models");
const { login } = require("../src/controllers/authController");

function response() {
  const res = { set: jest.fn() };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function activeUser(overrides = {}) {
  return {
    id: 7,
    email: "user@example.com",
    name: "User",
    status: 1,
    password_hash: "hash",
    failed_login_attempts: 0,
    locked_until: null,
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("Đăng nhập - các lớp tương đương và giá trị biên", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.compare.mockResolvedValue(true);
  });

  it.each(["", "unknown@example.com"])(
    "từ chối trường hợp email không xác định (%p)",
    async (email) => {
      User.findOne.mockResolvedValue(null);
      const req = { body: { email, password: "secret" }, session: {} };
      const res = response();

      await login(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(res.status).toHaveBeenCalledWith(401);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    },
  );

  it("chuẩn hóa email và đăng nhập người dùng đang hoạt động bằng mật khẩu đúng", async () => {
    const user = activeUser();
    User.findOne.mockResolvedValue(user);
    const req = {
      body: { email: "  USER@Example.COM ", password: "correct" },
      session: {},
    };
    const res = response();

    await login(req, res);

    expect(User.findOne).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
    expect(bcrypt.compare).toHaveBeenCalledWith("correct", "hash");
    expect(req.session.userId).toBe(7);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ id: 7 }) }),
    );
  });

  it("từ chối tài khoản không hoạt động trước khi kiểm tra mật khẩu", async () => {
    User.findOne.mockResolvedValue(activeUser({ status: 0 }));
    const res = response();

    await login({ body: { email: "user@example.com" }, session: {} }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("tăng số lần thất bại ở mức tối đa trừ một mà chưa khóa", async () => {
    const user = activeUser({ failed_login_attempts: 3 });
    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(false);
    const res = response();

    await login(
      { body: { email: user.email, password: "wrong" }, session: {} },
      res,
    );

    expect(user.update).toHaveBeenCalledWith({ failed_login_attempts: 4 });
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("khóa chính xác ở lần đăng nhập sai thứ năm", async () => {
    const user = activeUser({ failed_login_attempts: 4 });
    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(false);
    const res = response();

    await login(
      { body: { email: user.email, password: "wrong" }, session: {} },
      res,
    );

    expect(user.update).toHaveBeenCalledWith({
      failed_login_attempts: 5,
      locked_until: expect.any(Date),
    });
    expect(res.set).toHaveBeenCalledWith("Retry-After", "3600");
    expect(res.status).toHaveBeenCalledWith(423);
  });

  it("từ chối tài khoản có thời gian khóa hết hạn ngay sau thời điểm hiện tại", async () => {
    const user = activeUser({ locked_until: new Date(Date.now() + 1_000) });
    User.findOne.mockResolvedValue(user);
    const res = response();

    await login({ body: { email: user.email }, session: {} }, res);

    expect(res.status).toHaveBeenCalledWith(423);
    expect(res.set).toHaveBeenCalledWith("Retry-After", expect.any(String));
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("xóa trạng thái khóa đã hết hạn và chấp nhận mật khẩu đúng", async () => {
    const user = activeUser({
      failed_login_attempts: 5,
      locked_until: new Date(Date.now() - 1),
    });
    User.findOne.mockResolvedValue(user);
    const req = { body: { email: user.email, password: "correct" }, session: {} };

    await login(req, response());

    expect(user.update).toHaveBeenCalledWith({
      failed_login_attempts: 0,
      locked_until: null,
    });
    expect(req.session.userId).toBe(7);
  });
});
