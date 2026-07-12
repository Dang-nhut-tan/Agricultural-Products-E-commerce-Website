const router = require("express").Router();
const controller = require("../controllers/newsController");
router.get("/", controller.getNews);
router.get("/:id", controller.getNewsBYID);
module.exports = router;
