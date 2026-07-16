const router = require("express").Router();
const controller = require("../controllers/newsController");
const InsertNewsReq = require("../dtos/request/news/insertNewsReq");
const UpdateNewsReq = require("../dtos/request/news/updateNewsReq");
const adminOnly = require("../middlewares/adminOnly");
const asyncRoute = require("../middlewares/asyncRoute");
const validate = require("../middlewares/validate");

router.get("/", asyncRoute(controller.getNews));
router.get("/:id", asyncRoute(controller.getNewsBYID));
router.post("/", asyncRoute(adminOnly), validate(InsertNewsReq), asyncRoute(controller.insertNews));
router.put("/:id", asyncRoute(adminOnly), validate(UpdateNewsReq), asyncRoute(controller.updateNews));
router.delete("/:id", asyncRoute(adminOnly), asyncRoute(controller.deleteNews));

module.exports = router;
