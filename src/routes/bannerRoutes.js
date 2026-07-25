const router = require("express").Router();
const controller = require("../controllers/bannerController");
const asyncRoute = require("../middlewares/asyncRoute");

router.get("/", asyncRoute(controller.getBanners));
router.get("/:id", asyncRoute(controller.getBannersBYID));

module.exports = router;
