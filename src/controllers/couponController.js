const db = require("../models");
const InsertCouponReq = require("../dtos/request/coupon/insertCouponReq");
const UpdateCouponReq = require("../dtos/request/coupon/updateCouponReq");

async function getCoupons(req, res) {
  const coupons = await db.Coupon.findAll();

  res.status(200).json({
    message: "Lấy danh sách mã giảm giá thành công",
    data: coupons,
  });
}

async function getCouponsBYID(req, res) {
  const { id } = req.params;
  const coupon = await db.Coupon.findByPk(id);

  if (!coupon) {
    return res.status(404).json({
      message: "Không tìm thấy mã giảm giá",
    });
  }

  res.status(200).json({
    message: "Lấy mã giảm giá dựa trên id thành công",
    data: coupon,
  });
}

async function insertCoupons(req, res) {
  const couponData = new InsertCouponReq(req.body);
  const coupon = await db.Coupon.create(couponData);

  res.status(201).json({
    message: "Thêm mã giảm giá thành công",
    data: coupon,
  });
}

async function updateCoupons(req, res) {
  const { id } = req.params;
  const coupon = await db.Coupon.findByPk(id);

  if (!coupon) {
    return res.status(404).json({
      message: "Không tìm thấy mã giảm giá",
    });
  }

  const couponData = new UpdateCouponReq(req.body);
  await coupon.update(couponData);

  res.status(200).json({
    message: "Cập nhật mã giảm giá thành công",
    data: coupon,
  });
}

async function deleteCoupons(req, res) {
  const { id } = req.params;
  const coupon = await db.Coupon.findByPk(id);

  if (!coupon) {
    return res.status(404).json({
      message: "Không tìm thấy mã giảm giá",
    });
  }

  await coupon.destroy();

  res.status(200).json({
    message: "Xóa mã giảm giá thành công",
  });
}

module.exports = {
  getCoupons,
  getCouponsBYID,
  insertCoupons,
  updateCoupons,
  deleteCoupons,
};
