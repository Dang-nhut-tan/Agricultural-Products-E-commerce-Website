const router = require("express").Router();
const controller = require("../controllers/viewController");

const pages = [
  "/",
  "/nha-cung-cap",
  "/nha-cung-cap/:id",
  "/khuyen-mai",
  "/khuyen-mai/:id",
  "/tin-tuc",
  "/tin-tuc/:id",
  "/san-pham",
  "/san-pham/:id",
  "/gio-hang",
  "/thanh-toan",
  "/dang-nhap",
  "/dang-ky",
  "/tai-khoan",
  "/don-hang",
  "/gioi-thieu",
  "/lien-he",
];

pages.forEach((route) => router.get(route, controller.getIndexPage));

module.exports = router;
