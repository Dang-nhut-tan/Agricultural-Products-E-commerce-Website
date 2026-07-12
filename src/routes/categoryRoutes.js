const router = require("express").Router();
const controller = require("../controllers/categoryController");
router.get("/", controller.getCategories);
router.get("/:id", controller.getCategoriesBYID);
module.exports = router;
