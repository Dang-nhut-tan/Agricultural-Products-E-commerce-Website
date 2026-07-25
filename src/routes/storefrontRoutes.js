const router = require("express").Router();
const controller = require("../controllers/storefrontController");

router.get("/promotions", controller.getPromotions);
router.get("/", controller.getStorefront);

module.exports = router;
