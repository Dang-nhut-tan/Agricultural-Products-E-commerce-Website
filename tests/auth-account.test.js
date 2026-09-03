jest.mock("../src/models", () => ({
  sequelize: {},
  User: { findByPk: jest.fn() },
  UserAddress: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));
jest.mock("../src/services/cloudinaryService", () => ({
  uploadImage: jest.fn(),
}));

const db = require("../src/models");
const { uploadImage } = require("../src/services/cloudinaryService");
const controller = require("../src/controllers/authController");

function response() {
  const res = { clearCookie: jest.fn() };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function user(overrides = {}) {
  return {
    id: 42,
    name: "Nguyễn An",
    email: "an@example.com",
    phone: "0901",
    status: 1,
    role: 2,
    update: jest.fn().mockImplementation(async function update(changes) {
      Object.assign(this, changes);
    }),
    ...overrides,
  };
}

describe("Hành vi hồ sơ và địa chỉ tài khoản", () => {
  beforeEach(() => jest.clearAllMocks());

  it("từ chối tên hồ sơ chỉ chứa khoảng trắng trước khi cập nhật", async () => {
    const account = user();
    db.User.findByPk.mockResolvedValue(account);
    const res = response();

    await controller.profile(
      { session: { userId: 42 }, body: { name: "   ", phone: "0902" } },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(account.update).not.toHaveBeenCalled();
  });

  it("từ chối dữ liệu ảnh đại diện không hỗ trợ mà không gọi Cloudinary", async () => {
    const account = user();
    db.User.findByPk.mockResolvedValue(account);
    const res = response();

    await controller.profile(
      {
        session: { userId: 42 },
        body: { name: "Nguyễn An", avatarData: "data:image/gif;base64,AAAA" },
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(uploadImage).not.toHaveBeenCalled();
    expect(account.update).not.toHaveBeenCalled();
  });

  it("tải ảnh đại diện hợp lệ lên và lưu URL được trả về", async () => {
    const account = user();
    db.User.findByPk.mockResolvedValue(account);
    uploadImage.mockResolvedValue({ url: "https://cdn.example/avatar.webp" });
    const res = response();

    await controller.profile(
      {
        session: { userId: 42 },
        body: {
          name: " Nguyễn An mới ",
          phone: " 0988 ",
          avatarData: "data:image/webp;base64,AAAA",
        },
      },
      res,
    );

    expect(uploadImage).toHaveBeenCalledWith(
      "data:image/webp;base64,AAAA",
      expect.stringMatching(/\/avatars$/),
    );
    expect(account.update).toHaveBeenCalledWith({
      name: "Nguyễn An mới",
      phone: "0988",
      avatar: "https://cdn.example/avatar.webp",
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ id: 42 }) }),
    );
  });

  it("sắp xếp địa chỉ mặc định trước rồi đến địa chỉ mới nhất", async () => {
    db.UserAddress.findAll.mockResolvedValue([]);

    await controller.addresses({ session: { userId: 42 } }, response());

    expect(db.UserAddress.findAll).toHaveBeenCalledWith({
      where: { user_id: 42 },
      order: [["is_default", "DESC"], ["createdAt", "DESC"]],
    });
  });

  it("dùng số điện thoại tài khoản khi địa chỉ mới không có số điện thoại", async () => {
    db.User.findByPk.mockResolvedValue({ phone: "0901234567" });
    db.UserAddress.count.mockResolvedValue(0);
    db.UserAddress.create.mockImplementation(async (data) => ({ id: 8, ...data }));
    const res = response();

    await controller.addAddress(
      {
        session: { userId: 42 },
        body: {
          receiver_name: "Nguyễn An",
          address: "12 Lê Lợi",
          province: "TP HCM",
        },
      },
      res,
    );

    expect(db.UserAddress.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 42,
      phone: "0901234567",
      is_default: true,
    }));
    expect(db.UserAddress.update).toHaveBeenCalledWith(
      { is_default: false },
      expect.objectContaining({ where: expect.objectContaining({ user_id: 42 }) }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("không xóa địa chỉ thuộc tài khoản khác", async () => {
    db.UserAddress.findOne.mockResolvedValue(null);
    const res = response();

    await controller.deleteAddress(
      { params: { id: "8" }, session: { userId: 42 } },
      res,
    );

    expect(db.UserAddress.findOne).toHaveBeenCalledWith({
      where: { id: "8", user_id: 42 },
    });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("hủy phiên không hợp lệ khi người dùng bị vô hiệu hóa", async () => {
    db.User.findByPk.mockResolvedValue(user({ status: 0 }));
    const req = {
      session: {
        userId: 42,
        destroy: jest.fn((callback) => callback()),
      },
    };
    const res = response();

    await controller.me(req, res);

    expect(req.session.destroy).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ authenticated: false, data: null });
  });

  it("chuyển tiếp lỗi hủy phiên trong lúc đăng xuất", () => {
    const error = new Error("session store unavailable");
    const next = jest.fn();
    const res = response();

    controller.logout(
      { session: { destroy: (callback) => callback(error) } },
      res,
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
    expect(res.clearCookie).not.toHaveBeenCalled();
  });

  it("xóa cookie phiên có tên sau khi đăng xuất", () => {
    const res = response();

    controller.logout(
      { session: { destroy: (callback) => callback() } },
      res,
      jest.fn(),
    );

    expect(res.clearCookie).toHaveBeenCalledWith("nong-san.sid");
    expect(res.json).toHaveBeenCalledWith({ message: "Đã đăng xuất." });
  });
});
