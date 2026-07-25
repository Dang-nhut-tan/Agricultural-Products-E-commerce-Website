const router = require("express").Router();
const controller = require("../controllers/newsController");
const asyncRoute = require("../middlewares/asyncRoute");

router.get("/", asyncRoute(controller.getNews));
router.get("/:id", asyncRoute(controller.getNewsBYID));

module.exports = router;
