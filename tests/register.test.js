jest.mock("../src/models", () => ({
  sequelize: { transaction: jest.fn() },
  User: { findOne: jest.fn(), create: jest.fn() },
  UserAddress: { create: jest.fn() },
}));

const { sequelize, User, UserAddress } = require("../src/models");
const { register } = require("../src/controllers/authController");
const TestBase = require("./base/TestBase");

const GENERAL_VALIDATION_MESSAGE =
  "Vui lòng nhập họ tên, email hợp lệ và mật khẩu từ 6 ký tự.";
const ADDRESS_VALIDATION_MESSAGE =
  "Vui lòng nhập số điện thoại, địa chỉ và tỉnh/thành phố.";

describe("Đăng ký tài khoản", () => {
  let testBase;

  beforeEach(() => {
    testBase = new TestBase();
    testBase.setup();
  });

  async function execute(overrides = {}) {
    const req = testBase.createRequest(
      testBase.getValidRegisterData(overrides),
    );
    const res = testBase.createResponse();
    await register(req, res);
    return { req, res };
  }

  function expectRejectedBeforePersistence(res, message) {
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message });
    expect(User.findOne).not.toHaveBeenCalled();
    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
    expect(UserAddress.create).not.toHaveBeenCalled();
  }

  describe("Đăng ký hợp lệ", () => {
    it("đăng ký người dùng và địa chỉ mặc định với dữ liệu hợp lệ", async () => {
      // Arrange
      const data = testBase.getValidRegisterData({
        name: "  Nguyen Van An  ",
        email: "  VALID@Example.COM  ",
      });
      const req = testBase.createRequest(data);
      const res = testBase.createResponse();

      // Act
      await register(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: "valid@example.com" },
      });
      expect(User.create).toHaveBeenCalledWith(
        {
          email: "valid@example.com",
          name: "Nguyen Van An",
          phone: "0901234567",
          password: "secret1",
          role: 2,
          status: 1,
        },
        { transaction: testBase.transaction },
      );
      expect(UserAddress.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 101,
          receiver_name: "Nguyen Van An",
          is_default: true,
        }),
        { transaction: testBase.transaction },
      );
      expect(testBase.transaction.commit).toHaveBeenCalledTimes(1);
      expect(testBase.transaction.rollback).not.toHaveBeenCalled();
      expect(req.session.userId).toBe(101);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Đăng ký thành công.",
          data: expect.objectContaining({
            id: 101,
            email: "valid@example.com",
            name: "Nguyen Van An",
          }),
        }),
      );
    });

    it("chấp nhận phường xã và quận huyện rỗng vì đây là thông tin không bắt buộc", async () => {
      // Arrange / Act
      const { res } = await execute({ ward: "", district: "" });

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(UserAddress.create).toHaveBeenCalledWith(
        expect.objectContaining({ ward: "", district: "" }),
        { transaction: testBase.transaction },
      );
    });
  });

  describe("Kiểm tra các trường bắt buộc", () => {
    it.each([
      ["name", ""],
      ["email", ""],
      ["password", ""],
    ])("từ chối dữ liệu không hợp lệ khi trường %s bị bỏ trống", async (field, value) => {
      // Arrange / Act
      const { res } = await execute({ [field]: value });

      // Assert
      expectRejectedBeforePersistence(res, GENERAL_VALIDATION_MESSAGE);
    });

    it("từ chối xác nhận mật khẩu rỗng do không khớp", async () => {
      // Arrange / Act
      const { res } = await execute({ passwordConfirmation: "" });

      // Assert
      expectRejectedBeforePersistence(
        res,
        "Mật khẩu xác nhận không khớp.",
      );
    });

    it.each(["phone", "address", "province"])(
      "từ chối dữ liệu không hợp lệ khi trường %s bị bỏ trống",
      async (field) => {
        // Arrange / Act
        const { res } = await execute({ [field]: "" });

        // Assert
        expectRejectedBeforePersistence(res, ADDRESS_VALIDATION_MESSAGE);
      },
    );
  });

  describe("Kiểm tra họ và tên", () => {
    it("từ chối tên chỉ chứa khoảng trắng sau khi cắt khoảng trắng", async () => {
      // Arrange / Act
      const { res } = await execute({ name: "   " });

      // Assert
      expectRejectedBeforePersistence(res, GENERAL_VALIDATION_MESSAGE);
    });
  });

  describe("Kiểm tra email", () => {
    it.each([
      ["văn bản thông thường", "invalid-email"],
      ["thiếu ký tự @", "user.example.com"],
      ["thiếu phần mở rộng tên miền", "user@example"],
    ])("từ chối trường hợp email không hợp lệ: %s", async (_label, email) => {
      // Arrange / Act
      const { res } = await execute({ email });

      // Assert
      expectRejectedBeforePersistence(res, GENERAL_VALIDATION_MESSAGE);
    });

    it("chấp nhận email khớp biểu thức kiểm tra của controller", async () => {
      // Arrange / Act
      const { res } = await execute({ email: "user+tag@example.co" });

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("Phân tích giá trị biên của mật khẩu", () => {
    it("từ chối mật khẩu 5 ký tự vì ngắn hơn mức tối thiểu", async () => {
      // Arrange / Act
      const { res } = await execute({
        password: "12345",
        passwordConfirmation: "12345",
      });

      // Assert
      expectRejectedBeforePersistence(res, GENERAL_VALIDATION_MESSAGE);
    });

    it.each([
      ["giới hạn tối thiểu", "123456"],
      ["tối thiểu cộng một", "1234567"],
    ])("chấp nhận độ dài mật khẩu tại %s", async (_label, password) => {
      // Arrange / Act
      const { res } = await execute({
        password,
        passwordConfirmation: password,
      });

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({ password }),
        { transaction: testBase.transaction },
      );
    });
  });

  describe("Kiểm tra xác nhận mật khẩu", () => {
    it("chấp nhận xác nhận mật khẩu khớp", async () => {
      // Arrange / Act
      const { res } = await execute({
        password: "abcdef",
        passwordConfirmation: "abcdef",
      });

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("từ chối xác nhận mật khẩu không khớp", async () => {
      // Arrange / Act
      const { res } = await execute({ passwordConfirmation: "different" });

      // Assert
      expectRejectedBeforePersistence(
        res,
        "Mật khẩu xác nhận không khớp.",
      );
    });
  });

  describe("Email trùng lặp", () => {
    it("trả về xung đột và không tạo bản ghi khi email đã tồn tại", async () => {
      // Arrange
      User.findOne.mockResolvedValue({ id: 99, email: "valid@example.com" });
      const req = testBase.createRequest();
      const res = testBase.createResponse();

      // Act
      await register(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email này đã được sử dụng.",
      });
      expect(sequelize.transaction).not.toHaveBeenCalled();
      expect(User.create).not.toHaveBeenCalled();
      expect(UserAddress.create).not.toHaveBeenCalled();
    });
  });

  describe("Giao dịch thất bại", () => {
    it("hoàn tác giao dịch và ném lại lỗi khi tạo địa chỉ thất bại", async () => {
      // Arrange
      const databaseError = new Error("address insert failed");
      UserAddress.create.mockRejectedValue(databaseError);
      const req = testBase.createRequest();
      const res = testBase.createResponse();

      // Act / Assert
      await expect(register(req, res)).rejects.toThrow(databaseError);
      expect(testBase.transaction.rollback).toHaveBeenCalledTimes(1);
      expect(testBase.transaction.commit).not.toHaveBeenCalled();
      expect(req.session.userId).toBeUndefined();
      expect(res.status).not.toHaveBeenCalledWith(201);
    });
  });
});
