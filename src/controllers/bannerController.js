const db = require("../models");
const BannerRespone = require("../dtos/respone/banner/bannerRespone");

async function getBanners(req, res) {
  const banners = await db.Banner.findAll({ where: { status: 1 }, include: [{ model: db.BannerDetail, include: [db.Product] }], order: [["sort_order", "ASC"]] });

  res.status(200).json({
    message: "Lấy danh sách banner thành công",
    data: banners.map((banner) => new BannerRespone(banner)),
  });
}

async function getBannersBYID(req, res) {
  const { id } = req.params;
  const banner = await db.Banner.findByPk(id, { include: [{ model: db.BannerDetail, include: [{ model: db.Product, where: { status: 1 }, required: false, include: [db.Category, db.ProductImage] }] }] });

  if (!banner) {
    return res.status(404).json({
      message: "Không tìm thấy banner",
    });
  }

  res.status(200).json({
    message: "Lấy banner dựa trên id thành công",
    data: new BannerRespone(banner),
  });
}

module.exports = {
  getBanners,
  getBannersBYID,
};
