const router = require("express").Router();
const controller = require("../controllers/orderController");
const asyncRoute = require("../middlewares/asyncRoute");
const signedIn = require("../middlewares/signedIn");

router.use(signedIn);
router.get("/", asyncRoute(controller.list));
router.get("/:id", asyncRoute(controller.detail));
router.patch("/:id/cancel", asyncRoute(controller.cancel));

module.exports = router;
