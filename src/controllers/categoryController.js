const db = require("../models");
const CategoryRespone = require("../dtos/respone/category/categoryRespone");

async function getCategories(req, res) {
  const categories = await db.Category.findAll();

  res.status(200).json({
    message: "Lấy danh sách danh mục thành công",
    data: categories.map((category) => new CategoryRespone(category)),
  });
}

async function getCategoriesBYID(req, res) {
  const { id } = req.params;
  const category = await db.Category.findByPk(id);

  if (!category) {
    return res.status(404).json({
      message: "Không tìm thấy danh mục",
    });
  }

  res.status(200).json({
    message: "Lấy danh mục dựa trên id thành công",
    data: new CategoryRespone(category),
  });
}

module.exports = {
  getCategories,
  getCategoriesBYID,
};
