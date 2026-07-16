const router = require("express").Router();
const controller = require("../controllers/brandController");
const InsertBrandReq = require("../dtos/request/brand/insertBrandReq");
const UpdateBrandReq = require("../dtos/request/brand/updateBrandReq");
const adminOnly = require("../middlewares/adminOnly");
const asyncRoute = require("../middlewares/asyncRoute");
const validate = require("../middlewares/validate");

router.get("/", asyncRoute(controller.getBrands));
router.get("/:id", asyncRoute(controller.getBrandsBYID));
router.post("/", asyncRoute(adminOnly), validate(InsertBrandReq), asyncRoute(controller.insertBrands));
router.put("/:id", asyncRoute(adminOnly), validate(UpdateBrandReq), asyncRoute(controller.updateBrands));
router.delete("/:id", asyncRoute(adminOnly), asyncRoute(controller.deleteBrands));

module.exports = router;
