const db = require("../models");
const InsertUserReq = require("../dtos/request/user/insertUserReq");
const UpdateUserReq = require("../dtos/request/user/updateUserReq");

async function getUsers(req, res) {
  const users = await db.User.findAll();

  res.status(200).json({
    message: "Lấy danh sách người dùng thành công",
    data: users,
  });
}

async function getUsersBYID(req, res) {
  const { id } = req.params;
  const user = await db.User.findByPk(id);

  if (!user) {
    return res.status(404).json({
      message: "Không tìm thấy người dùng",
    });
  }

  res.status(200).json({
    message: "Lấy người dùng dựa trên id thành công",
    data: user,
  });
}

async function insertUsers(req, res) {
  const userData = new InsertUserReq(req.body);
  const user = await db.User.create(userData);

  res.status(201).json({
    message: "Thêm người dùng thành công",
    data: user,
  });
}

async function updateUsers(req, res) {
  const { id } = req.params;
  const user = await db.User.findByPk(id);

  if (!user) {
    return res.status(404).json({
      message: "Không tìm thấy người dùng",
    });
  }

  const userData = new UpdateUserReq(req.body);
  await user.update(userData);

  res.status(200).json({
    message: "Cập nhật người dùng thành công",
    data: user,
  });
}

async function deleteUsers(req, res) {
  const { id } = req.params;
  const user = await db.User.findByPk(id);

  if (!user) {
    return res.status(404).json({
      message: "Không tìm thấy người dùng",
    });
  }

  await user.destroy();

  res.status(200).json({
    message: "Xóa người dùng thành công",
  });
}

module.exports = {
  getUsers,
  getUsersBYID,
  insertUsers,
  updateUsers,
  deleteUsers,
};
