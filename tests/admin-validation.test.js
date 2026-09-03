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

describe("Kiểm tra yêu cầu quản trị - các giá trị biên", () => {
  describe("Tạo người dùng", () => {
    const valid = {
      email: "admin@example.com",
      password: "123456",
      role: 1,
      status: 1,
    };

    it("chấp nhận mật khẩu tại giới hạn tối thiểu 6 ký tự", () => {
      const { next } = run(InsertUserReq, valid);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("từ chối mật khẩu ngắn hơn giới hạn tối thiểu một ký tự", () => {
      const { res, next } = run(InsertUserReq, {
        ...valid,
        password: "12345",
      });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it.each([1, 2])("chấp nhận giá trị biên của vai trò: %i", (role) => {
      expect(run(InsertUserReq, { ...valid, role }).next).toHaveBeenCalled();
    });

    it.each([0, 3])("từ chối vai trò ngoài tập hợp hợp lệ: %i", (role) => {
      expect(run(InsertUserReq, { ...valid, role }).res.status).toHaveBeenCalledWith(400);
    });

    it.each([0, 1, 2])("chấp nhận giá trị trạng thái: %i", (status) => {
      expect(run(InsertUserReq, { ...valid, status }).next).toHaveBeenCalled();
    });

    it.each([-1, 3])("từ chối trạng thái ngoài giới hạn: %i", (status) => {
      expect(run(InsertUserReq, { ...valid, status }).res.status).toHaveBeenCalledWith(400);
    });

    it("từ chối email không hợp lệ", () => {
      expect(
        run(InsertUserReq, { ...valid, email: "not-an-email" }).res.status,
      ).toHaveBeenCalledWith(400);
    });
  });

  describe("Các yêu cầu cập nhật", () => {
    it.each([UpdateUserReq, UpdateCouponReq, UpdateCategoryReq])(
      "từ chối nội dung cập nhật rỗng đối với %p",
      (requestType) => {
        const { res, next } = run(requestType, {});
        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      },
    );

    it("thay req.body bằng các giá trị đã được Joi chuẩn hóa", () => {
      const { req, next } = run(UpdateUserReq, { role: "1", status: "0" });
      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ role: 1, status: 0 });
    });
  });

  describe("Các giới hạn số của mã giảm giá", () => {
    const valid = { code: "SALE", discount_type: 1 };

    it.each(["discount_value", "min_order_value", "quantity", "used_quantity"])(
      "chấp nhận số không tại giới hạn tối thiểu của trường %s",
      (field) => {
        expect(
          run(InsertCouponReq, { ...valid, [field]: 0 }).next,
        ).toHaveBeenCalled();
      },
    );

    it.each(["discount_value", "min_order_value", "quantity", "used_quantity"])(
      "từ chối giá trị nhỏ hơn giới hạn tối thiểu một đơn vị của trường %s",
      (field) => {
        expect(
          run(InsertCouponReq, { ...valid, [field]: -1 }).res.status,
        ).toHaveBeenCalledWith(400);
      },
    );

    it("từ chối số lượng mã giảm giá là số thập phân", () => {
      expect(
        run(InsertCouponReq, { ...valid, quantity: 1.5 }).res.status,
      ).toHaveBeenCalledWith(400);
    });
  });

  describe("Phân lớp trường bắt buộc của danh mục", () => {
    it("chấp nhận tên danh mục không rỗng", () => {
      expect(run(InsertCategoryReq, { name: "Fruit" }).next).toHaveBeenCalled();
    });

    it.each([{}, { name: "" }])("từ chối tên bị thiếu hoặc để trống: %p", (body) => {
      expect(run(InsertCategoryReq, body).res.status).toHaveBeenCalledWith(400);
    });
  });
});
