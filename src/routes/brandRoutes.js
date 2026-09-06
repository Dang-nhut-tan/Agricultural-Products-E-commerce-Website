const router = require("express").Router();
const controller = require("../controllers/brandController");
const asyncRoute = require("../middlewares/asyncRoute");

router.get("/", asyncRoute(controller.getBrands));
router.get("/:id", asyncRoute(controller.getBrandsBYID));

module.exports = router;
