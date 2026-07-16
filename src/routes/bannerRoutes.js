const router = require("express").Router();
const controller = require("../controllers/bannerController");
const InsertBannerReq = require("../dtos/request/banner/insertBannerReq");
const UpdateBannerReq = require("../dtos/request/banner/updateBannerReq");
const adminOnly = require("../middlewares/adminOnly");
const asyncRoute = require("../middlewares/asyncRoute");
const validate = require("../middlewares/validate");

router.get("/", asyncRoute(controller.getBanners));
router.get("/:id", asyncRoute(controller.getBannersBYID));
router.post("/", asyncRoute(adminOnly), validate(InsertBannerReq), asyncRoute(controller.insertBanners));
router.put("/:id", asyncRoute(adminOnly), validate(UpdateBannerReq), asyncRoute(controller.updateBanners));
router.delete("/:id", asyncRoute(adminOnly), asyncRoute(controller.deleteBanners));

module.exports = router;
