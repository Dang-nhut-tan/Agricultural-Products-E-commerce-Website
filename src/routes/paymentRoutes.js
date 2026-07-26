const router = require("express").Router();
const controller = require("../controllers/paymentController");
const asyncRoute = require("../middlewares/asyncRoute");
const signedIn = require("../middlewares/signedIn");

router.get("/paypal/config", controller.getConfig);
router.post("/paypal/orders", signedIn, asyncRoute(controller.createOrder));
router.post("/paypal/orders/:id/capture", signedIn, asyncRoute(controller.captureOrder));

module.exports = router;
