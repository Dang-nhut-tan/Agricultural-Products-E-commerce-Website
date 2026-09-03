const router = require("express").Router();
const controller = require("../controllers/storefrontController");

router.get("/", controller.getStorefront);
router.get("/grouped", controller.getGroupedStorefront);

module.exports = router;
