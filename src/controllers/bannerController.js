const db = require("../models");
const InsertBannerReq = require("../dtos/request/banner/insertBannerReq");
const UpdateBannerReq = require("../dtos/request/banner/updateBannerReq");

async function getBanners(req, res) {
  const banners = await db.Banner.findAll({ where: { status: 1 }, include: [{ model: db.BannerDetail, include: [db.Product] }], order: [["sort_order", "ASC"]] });

  res.status(200).json({
    message: "Lấy danh sách banner thành công",
    data: banners,
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
    data: banner,
  });
}

async function insertBanners(req, res) {
  const bannerData = new InsertBannerReq(req.body);
  const banner = await db.Banner.create(bannerData);

  res.status(201).json({
    message: "Thêm banner thành công",
    data: banner,
  });
}

async function updateBanners(req, res) {
  const { id } = req.params;
  const banner = await db.Banner.findByPk(id);

  if (!banner) {
    return res.status(404).json({
      message: "Không tìm thấy banner",
    });
  }

  const bannerData = new UpdateBannerReq(req.body);
  await banner.update(bannerData);

  res.status(200).json({
    message: "Cập nhật banner thành công",
    data: banner,
  });
}

async function deleteBanners(req, res) {
  const { id } = req.params;
  const banner = await db.Banner.findByPk(id);

  if (!banner) {
    return res.status(404).json({
      message: "Không tìm thấy banner",
    });
  }

  await banner.destroy();

  res.status(200).json({
    message: "Xóa banner thành công",
  });
}

module.exports = {
  getBanners,
  getBannersBYID,
  insertBanners,
  updateBanners,
  deleteBanners,
};
