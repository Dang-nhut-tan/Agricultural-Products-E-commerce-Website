const router = require("express").Router();
const controller = require("../controllers/couponController");
const InsertCouponReq = require("../dtos/request/coupon/insertCouponReq");
const UpdateCouponReq = require("../dtos/request/coupon/updateCouponReq");
const adminOnly = require("../middlewares/adminOnly");
const asyncRoute = require("../middlewares/asyncRoute");
const validate = require("../middlewares/validate");

router.use(asyncRoute(adminOnly));
router.get("/", asyncRoute(controller.getCoupons));
router.get("/:id", asyncRoute(controller.getCouponsBYID));
router.post("/", validate(InsertCouponReq), asyncRoute(controller.insertCoupons));
router.put("/:id", validate(UpdateCouponReq), asyncRoute(controller.updateCoupons));
router.delete("/:id", asyncRoute(controller.deleteCoupons));

module.exports = router;
