const { User } = require("../models");

async function adminOnly(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Bạn chưa đăng nhập." });
  }

  const user = await User.findByPk(req.session.userId, {
    attributes: ["id", "role", "status"],
  });
  if (!user || Number(user.status) !== 1 || Number(user.role) !== 1) {
    return res.status(403).json({ message: "Bạn không có quyền quản trị." });
  }

  next();
}

module.exports = adminOnly;
