const router = require("express").Router();
const controller = require("../controllers/storefrontController");

router.get("/", controller.getStorefront);

module.exports = router;
