const { sequelize, User, UserAddress } = require("../../src/models");

class TestBase {
  setup() {
    jest.clearAllMocks();

    this.transaction = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };
    sequelize.transaction.mockResolvedValue(this.transaction);
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async (data) => ({
      id: 101,
      ...data,
      password_hash: "mocked-hash",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    }));
    UserAddress.create.mockResolvedValue({ id: 201 });
  }

  getValidRegisterData(overrides = {}) {
    return {
      name: "Nguyen Van An",
      email: "valid@example.com",
      password: "secret1",
      passwordConfirmation: "secret1",
      phone: "0901234567",
      address: "123 Nguyen Trai",
      ward: "Ben Thanh",
      district: "District 1",
      province: "Ho Chi Minh City",
      ...overrides,
    };
  }

  createRequest(body = this.getValidRegisterData()) {
    return { body, session: {} };
  }

  createResponse() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }
}

module.exports = TestBase;
