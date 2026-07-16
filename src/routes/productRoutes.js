const router = require("express").Router();
const controller = require("../controllers/productController");
const feedbackController = require("../controllers/feedbackController");
const InsertFeedbackReq = require("../dtos/request/feedback/insertFeedbackReq");
const UpdateFeedbackReq = require("../dtos/request/feedback/updateFeedbackReq");
const asyncRoute = require("../middlewares/asyncRoute");
const signedIn = require("../middlewares/signedIn");
const validate = require("../middlewares/validate");

router.get("/", asyncRoute(controller.getProducts));
router.get("/:productId/comments", asyncRoute(feedbackController.getFeedback));
router.post("/:productId/comments", signedIn, validate(InsertFeedbackReq), asyncRoute(feedbackController.createFeedback));
router.put("/:productId/comments/:feedbackId", signedIn, validate(UpdateFeedbackReq), asyncRoute(feedbackController.updateFeedback));
router.delete("/:productId/comments/:feedbackId", signedIn, asyncRoute(feedbackController.deleteFeedback));
router.get("/:id", asyncRoute(controller.getProductById));

module.exports = router;
