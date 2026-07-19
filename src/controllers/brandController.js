const db = require("../models");
const InsertBrandReq = require("../dtos/request/brand/insertBrandReq");
const UpdateBrandReq = require("../dtos/request/brand/updateBrandReq");
const BrandRespone = require("../dtos/respone/brand/brandRespone");

async function getBrands(req, res) {
  const brands = await db.Brand.findAll({ include: [{ model: db.Product, attributes: ["id", "name", "status"] }], order: [["name", "ASC"]] });

  res.status(200).json({
    message: "Lấy danh sách thương hiệu thành công",
    data: brands.map((brand) => new BrandRespone(brand)),
  });
}

async function getBrandsBYID(req, res) {
  const { id } = req.params;
  const brand = await db.Brand.findByPk(id, { include: [{ model: db.Product, where: { status: 1 }, required: false, include: [db.Category, db.ProductImage] }] });

  if (!brand) {
    return res.status(404).json({
      message: "Không tìm thấy thương hiệu",
    });
  }

  res.status(200).json({
    message: "Lấy thương hiệu dựa trên id thành công",
    data: new BrandRespone(brand),
  });
}

async function insertBrands(req, res) {
  const brandData = new InsertBrandReq(req.body);
  const brand = await db.Brand.create(brandData);

  res.status(201).json({
    message: "Thêm thương hiệu thành công",
    data: new BrandRespone(brand),
  });
}

async function updateBrands(req, res) {
  const { id } = req.params;
  const brand = await db.Brand.findByPk(id);

  if (!brand) {
    return res.status(404).json({
      message: "Không tìm thấy thương hiệu",
    });
  }

  const brandData = new UpdateBrandReq(req.body);
  await brand.update(brandData);

  res.status(200).json({
    message: "Cập nhật thương hiệu thành công",
    data: new BrandRespone(brand),
  });
}

async function deleteBrands(req, res) {
  const { id } = req.params;
  const brand = await db.Brand.findByPk(id);

  if (!brand) {
    return res.status(404).json({
      message: "Không tìm thấy thương hiệu",
    });
  }

  await brand.destroy();

  res.status(200).json({
    message: "Xóa thương hiệu thành công",
  });
}

module.exports = {
  getBrands,
  getBrandsBYID,
  insertBrands,
  updateBrands,
  deleteBrands,
};
