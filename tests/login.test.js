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

describe("Login - equivalence partitions and boundary values", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.compare.mockResolvedValue(true);
  });

  it.each(["", "unknown@example.com"])(
    "rejects the unknown-email partition (%p)",
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

  it("normalizes email and logs in an active user with a correct password", async () => {
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

  it("rejects the inactive-account partition before checking password", async () => {
    User.findOne.mockResolvedValue(activeUser({ status: 0 }));
    const res = response();

    await login({ body: { email: "user@example.com" }, session: {} }, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("increments failures at max - 1 without locking", async () => {
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

  it("locks exactly on the fifth failed attempt (max boundary)", async () => {
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

  it("rejects an account whose lock expires just after now", async () => {
    const user = activeUser({ locked_until: new Date(Date.now() + 1_000) });
    User.findOne.mockResolvedValue(user);
    const res = response();

    await login({ body: { email: user.email }, session: {} }, res);

    expect(res.status).toHaveBeenCalledWith(423);
    expect(res.set).toHaveBeenCalledWith("Retry-After", expect.any(String));
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("clears an expired lock and accepts a correct password", async () => {
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
