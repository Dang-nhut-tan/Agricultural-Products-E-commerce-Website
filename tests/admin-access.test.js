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

describe("Admin authorization - equivalence partitions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 for the unauthenticated partition", async () => {
    const next = jest.fn();
    const res = response();

    await adminOnly({ session: {} }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(User.findByPk).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ["missing user", null],
    ["inactive admin", { id: 1, role: 1, status: 0 }],
    ["banned admin", { id: 1, role: 1, status: 2 }],
    ["active customer", { id: 2, role: 2, status: 1 }],
  ])("returns 403 for %s", async (_label, user) => {
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

  it("allows the active-admin partition", async () => {
    User.findByPk.mockResolvedValue({ id: 1, role: 1, status: 1 });
    const next = jest.fn();
    const res = response();

    await adminOnly({ session: { userId: 1 } }, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("accepts numeric role and status stored as strings", async () => {
    User.findByPk.mockResolvedValue({ id: 1, role: "1", status: "1" });
    const next = jest.fn();

    await adminOnly({ session: { userId: 1 } }, response(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
