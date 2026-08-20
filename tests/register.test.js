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

describe("Register", () => {
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

  describe("Valid registration", () => {
    it("registers a user and default address for the valid equivalence partition", async () => {
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

    it("accepts empty ward and district because they are optional partitions", async () => {
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

  describe("Required-field validation", () => {
    it.each([
      ["name", ""],
      ["email", ""],
      ["password", ""],
    ])("rejects the invalid partition when %s is empty", async (field, value) => {
      // Arrange / Act
      const { res } = await execute({ [field]: value });

      // Assert
      expectRejectedBeforePersistence(res, GENERAL_VALIDATION_MESSAGE);
    });

    it("rejects an empty passwordConfirmation as a mismatch", async () => {
      // Arrange / Act
      const { res } = await execute({ passwordConfirmation: "" });

      // Assert
      expectRejectedBeforePersistence(
        res,
        "Mật khẩu xác nhận không khớp.",
      );
    });

    it.each(["phone", "address", "province"])(
      "rejects the invalid partition when %s is empty",
      async (field) => {
        // Arrange / Act
        const { res } = await execute({ [field]: "" });

        // Assert
        expectRejectedBeforePersistence(res, ADDRESS_VALIDATION_MESSAGE);
      },
    );
  });

  describe("Name validation", () => {
    it("rejects a whitespace-only name after trimming", async () => {
      // Arrange / Act
      const { res } = await execute({ name: "   " });

      // Assert
      expectRejectedBeforePersistence(res, GENERAL_VALIDATION_MESSAGE);
    });
  });

  describe("Email validation", () => {
    it.each([
      ["plain text", "invalid-email"],
      ["missing @", "user.example.com"],
      ["missing domain suffix", "user@example"],
    ])("rejects the invalid email partition: %s", async (_label, email) => {
      // Arrange / Act
      const { res } = await execute({ email });

      // Assert
      expectRejectedBeforePersistence(res, GENERAL_VALIDATION_MESSAGE);
    });

    it("accepts an email matching the controller regex", async () => {
      // Arrange / Act
      const { res } = await execute({ email: "user+tag@example.co" });

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("Password boundary-value analysis", () => {
    it("rejects 5 characters at min - 1", async () => {
      // Arrange / Act
      const { res } = await execute({
        password: "12345",
        passwordConfirmation: "12345",
      });

      // Assert
      expectRejectedBeforePersistence(res, GENERAL_VALIDATION_MESSAGE);
    });

    it.each([
      ["min boundary", "123456"],
      ["min + 1", "1234567"],
    ])("accepts password length at %s", async (_label, password) => {
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

  describe("Password confirmation validation", () => {
    it("accepts the matching confirmation partition", async () => {
      // Arrange / Act
      const { res } = await execute({
        password: "abcdef",
        passwordConfirmation: "abcdef",
      });

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("rejects the mismatching confirmation partition", async () => {
      // Arrange / Act
      const { res } = await execute({ passwordConfirmation: "different" });

      // Assert
      expectRejectedBeforePersistence(
        res,
        "Mật khẩu xác nhận không khớp.",
      );
    });
  });

  describe("Duplicate email", () => {
    it("returns conflict without creating records when email already exists", async () => {
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

  describe("Transaction failure", () => {
    it("rolls back and rethrows when creating the address fails", async () => {
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
