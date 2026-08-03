const router = require("express").Router();
const controller = require("../controllers/chatController");
const asyncRoute = require("../middlewares/asyncRoute");
const signedIn = require("../middlewares/signedIn");
const validate = require("../middlewares/validate");
const ChatReq = require("../dtos/request/chat/chatReq");

router.post("/", signedIn, validate(ChatReq), asyncRoute(controller.reply));

module.exports = router;
