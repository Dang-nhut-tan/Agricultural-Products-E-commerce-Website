const router = require("express").Router();
const signedIn = require("../middlewares/signedIn");
const asyncRoute = require("../middlewares/asyncRoute");
const controller = require("../controllers/recipeController");

router.post("/suggest", signedIn, asyncRoute(controller.suggest));

module.exports = router;
