const router = require("express").Router();
const controller = require("../controllers/categoryController");
const InsertCategoryReq = require("../dtos/request/category/insertCategoryReq");
const UpdateCategoryReq = require("../dtos/request/category/updateCategoryReq");
const adminOnly = require("../middlewares/adminOnly");
const asyncRoute = require("../middlewares/asyncRoute");
const validate = require("../middlewares/validate");

router.get("/", asyncRoute(controller.getCategories));
router.get("/:id", asyncRoute(controller.getCategoriesBYID));
router.post("/", asyncRoute(adminOnly), validate(InsertCategoryReq), asyncRoute(controller.insertCategories));
router.put("/:id", asyncRoute(adminOnly), validate(UpdateCategoryReq), asyncRoute(controller.updateCategories));
router.delete("/:id", asyncRoute(adminOnly), asyncRoute(controller.deleteCategories));

module.exports = router;
