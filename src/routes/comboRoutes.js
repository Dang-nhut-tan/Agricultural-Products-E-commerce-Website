const router = require("express").Router();
const controller = require("../controllers/comboController");
const asyncRoute = require("../middlewares/asyncRoute");

router.get("/", asyncRoute(controller.list));
router.get("/:id", asyncRoute(controller.detail));

module.exports = router;
