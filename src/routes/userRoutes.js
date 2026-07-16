const router = require("express").Router();
const controller = require("../controllers/userController");
const InsertUserReq = require("../dtos/request/user/insertUserReq");
const UpdateUserReq = require("../dtos/request/user/updateUserReq");
const adminOnly = require("../middlewares/adminOnly");
const asyncRoute = require("../middlewares/asyncRoute");
const validate = require("../middlewares/validate");

router.use(asyncRoute(adminOnly));
router.get("/", asyncRoute(controller.getUsers));
router.get("/:id", asyncRoute(controller.getUsersBYID));
router.post("/", validate(InsertUserReq), asyncRoute(controller.insertUsers));
router.put("/:id", validate(UpdateUserReq), asyncRoute(controller.updateUsers));
router.delete("/:id", asyncRoute(controller.deleteUsers));

module.exports = router;
