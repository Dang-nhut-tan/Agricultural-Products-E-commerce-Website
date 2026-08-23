const validate = require("../src/middlewares/validate");
const InsertUserReq = require("../src/dtos/request/user/insertUserReq");
const UpdateUserReq = require("../src/dtos/request/user/updateUserReq");
const InsertCouponReq = require("../src/dtos/request/coupon/insertCouponReq");
const UpdateCouponReq = require("../src/dtos/request/coupon/updateCouponReq");
const InsertCategoryReq = require("../src/dtos/request/category/insertCategoryReq");
const UpdateCategoryReq = require("../src/dtos/request/category/updateCategoryReq");

function response() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function run(requestType, body) {
  const req = { body };
  const res = response();
  const next = jest.fn();
  validate(requestType)(req, res, next);
  return { req, res, next };
}

describe("Admin request validation - boundary values", () => {
  describe("create user", () => {
    const valid = {
      email: "admin@example.com",
      password: "123456",
      role: 1,
      status: 1,
    };

    it("accepts password at the minimum boundary of 6 characters", () => {
      const { next } = run(InsertUserReq, valid);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("rejects password at min - 1", () => {
      const { res, next } = run(InsertUserReq, {
        ...valid,
        password: "12345",
      });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it.each([1, 2])("accepts role boundary %i", (role) => {
      expect(run(InsertUserReq, { ...valid, role }).next).toHaveBeenCalled();
    });

    it.each([0, 3])("rejects role outside the valid set: %i", (role) => {
      expect(run(InsertUserReq, { ...valid, role }).res.status).toHaveBeenCalledWith(400);
    });

    it.each([0, 1, 2])("accepts status value %i", (status) => {
      expect(run(InsertUserReq, { ...valid, status }).next).toHaveBeenCalled();
    });

    it.each([-1, 3])("rejects status outside boundaries: %i", (status) => {
      expect(run(InsertUserReq, { ...valid, status }).res.status).toHaveBeenCalledWith(400);
    });

    it("rejects the invalid-email partition", () => {
      expect(
        run(InsertUserReq, { ...valid, email: "not-an-email" }).res.status,
      ).toHaveBeenCalledWith(400);
    });
  });

  describe("update requests", () => {
    it.each([UpdateUserReq, UpdateCouponReq, UpdateCategoryReq])(
      "rejects an empty update body for %p",
      (requestType) => {
        const { res, next } = run(requestType, {});
        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      },
    );

    it("replaces req.body with Joi-normalized values", () => {
      const { req, next } = run(UpdateUserReq, { role: "1", status: "0" });
      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ role: 1, status: 0 });
    });
  });

  describe("coupon numeric boundaries", () => {
    const valid = { code: "SALE", discount_type: 1 };

    it.each(["discount_value", "min_order_value", "quantity", "used_quantity"])(
      "accepts zero at the minimum boundary for %s",
      (field) => {
        expect(
          run(InsertCouponReq, { ...valid, [field]: 0 }).next,
        ).toHaveBeenCalled();
      },
    );

    it.each(["discount_value", "min_order_value", "quantity", "used_quantity"])(
      "rejects min - 1 for %s",
      (field) => {
        expect(
          run(InsertCouponReq, { ...valid, [field]: -1 }).res.status,
        ).toHaveBeenCalledWith(400);
      },
    );

    it("rejects a fractional coupon quantity", () => {
      expect(
        run(InsertCouponReq, { ...valid, quantity: 1.5 }).res.status,
      ).toHaveBeenCalledWith(400);
    });
  });

  describe("category required field partition", () => {
    it("accepts a non-empty category name", () => {
      expect(run(InsertCategoryReq, { name: "Fruit" }).next).toHaveBeenCalled();
    });

    it.each([{}, { name: "" }])("rejects missing or empty name: %p", (body) => {
      expect(run(InsertCategoryReq, body).res.status).toHaveBeenCalledWith(400);
    });
  });
});
