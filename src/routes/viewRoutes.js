const router = require("express").Router();
const controller = require("../controllers/viewController");

router.get("/lien-he", controller.getContactPage);
router.get("/san-pham", controller.getProductsPage);
router.get("/san-pham/:id", controller.getProductDetailPage);
router.get("/combo-nha-hang", controller.getCombosPage);
router.get("/tin-tuc", controller.getNewsPage);
router.get("/tin-tuc/:id", controller.getNewsDetailPage);

const pages = [
  "/",
  "/nha-cung-cap",
  "/nha-cung-cap/:id",
  "/khuyen-mai/:id",
  "/gio-hang",
  "/thanh-toan",
  "/dang-nhap",
  "/dang-ky",
  "/tai-khoan",
  "/don-hang",
  "/don-hang/:id",
  "/gioi-thieu",
];

pages.forEach((route) => router.get(route, controller.getIndexPage));

module.exports = router;
