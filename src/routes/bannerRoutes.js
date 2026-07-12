const router = require("express").Router();
const controller = require("../controllers/bannerController");
router.get("/", controller.getBanners);
router.get("/:id", controller.getBannersBYID);
module.exports = router;
