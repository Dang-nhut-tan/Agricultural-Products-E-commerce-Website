const db = require("../models");
const InsertCategoryReq = require("../dtos/request/category/insertCategoryReq");
const UpdateCategoryReq = require("../dtos/request/category/updateCategoryReq");

async function getCategories(req, res) {
  const categories = await db.Category.findAll();

  res.status(200).json({
    message: "Lấy danh sách danh mục thành công",
    data: categories,
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
    data: category,
  });
}

async function insertCategories(req, res) {
  const categoryData = new InsertCategoryReq(req.body);
  const category = await db.Category.create(categoryData);

  res.status(201).json({
    message: "Thêm danh mục thành công",
    data: category,
  });
}

async function updateCategories(req, res) {
  const { id } = req.params;
  const category = await db.Category.findByPk(id);

  if (!category) {
    return res.status(404).json({
      message: "Không tìm thấy danh mục",
    });
  }

  const categoryData = new UpdateCategoryReq(req.body);
  await category.update(categoryData);

  res.status(200).json({
    message: "Cập nhật danh mục thành công",
    data: category,
  });
}

async function deleteCategories(req, res) {
  const { id } = req.params;
  const category = await db.Category.findByPk(id);

  if (!category) {
    return res.status(404).json({
      message: "Không tìm thấy danh mục",
    });
  }

  await category.destroy();

  res.status(200).json({
    message: "Xóa danh mục thành công",
  });
}

module.exports = {
  getCategories,
  getCategoriesBYID,
  insertCategories,
  updateCategories,
  deleteCategories,
};
