const router = require("express").Router();
const controller = require("../controllers/categoryController");
const asyncRoute = require("../middlewares/asyncRoute");

router.get("/", asyncRoute(controller.getCategories));
router.get("/:id", asyncRoute(controller.getCategoriesBYID));

module.exports = router;
