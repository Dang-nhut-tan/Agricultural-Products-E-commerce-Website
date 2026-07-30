const bcrypt = require("bcryptjs");
const { sequelize, User, UserAddress } = require("../models");
const { uploadImage } = require("../services/cloudinaryService");
const UserRespone = require("../dtos/respone/user/userRespone");

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_DURATION_MS = 60 * 60 * 1000;

async function register(req, res) {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const name = String(req.body.name || "").trim();
  const password = String(req.body.password || "");
  const passwordConfirmation = String(req.body.passwordConfirmation || "");
  const phone = String(req.body.phone || "").trim();
  const address = String(req.body.address || "").trim();
  const ward = String(req.body.ward || "").trim();
  const district = String(req.body.district || "").trim();
  const province = String(req.body.province || "").trim();
  if (!name || !email || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
    return res
      .status(400)
      .json({
        message: "Vui lòng nhập họ tên, email hợp lệ và mật khẩu từ 6 ký tự.",
      });
  }
  if (password !== passwordConfirmation)
    return res.status(400).json({ message: "Mật khẩu xác nhận không khớp." });
  if (!phone || !address || !province)
    return res
      .status(400)
      .json({
        message: "Vui lòng nhập số điện thoại, địa chỉ và tỉnh/thành phố.",
      });
  if (await User.findOne({ where: { email } }))
    return res.status(409).json({ message: "Email này đã được sử dụng." });
  const transaction = await sequelize.transaction();
  let user;
  try {
    user = await User.create(
      { email, name, phone, password, role: 2, status: 1 },
      { transaction },
    );
    await UserAddress.create(
      {
        user_id: user.id,
        receiver_name: name,
        phone,
        address,
        ward,
        district,
        province,
        is_default: true,
      },
      { transaction },
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
  req.session.userId = user.id;
  res
    .status(201)
    .json({ message: "Đăng ký thành công.", data: new UserRespone(user) });
}

async function profile(req, res) {
  const user = await User.findByPk(req.session.userId);
  if (!user) return res.status(401).json({ message: "Bạn chưa đăng nhập." });
  const name = String(req.body.name || "").trim();
  const phone = String(req.body.phone || "").trim();
  if (!name)
    return res.status(400).json({ message: "Họ và tên không được để trống." });
  const changes = { name, phone };
  if (req.body.avatarData) {
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(req.body.avatarData))
      return res
        .status(400)
        .json({ message: "Ảnh đại diện phải là JPG, PNG hoặc WebP." });
    const uploaded = await uploadImage(
      req.body.avatarData,
      `${process.env.CLOUDINARY_FOLDER || "web-nong-san"}/avatars`,
    );
    changes.avatar = uploaded.url;
  }
  await user.update(changes);
  res.json({
    message: "Đã cập nhật thông tin.",
    data: new UserRespone(user),
  });
}

async function addresses(req, res) {
  const data = await UserAddress.findAll({
    where: { user_id: req.session.userId },
    order: [
      ["is_default", "DESC"],
      ["createdAt", "DESC"],
    ],
  });
  res.json({ data });
}

async function addAddress(req, res) {
  const fields = [
    "receiver_name",
    "phone",
    "address",
    "ward",
    "district",
    "province",
  ];
  const data = Object.fromEntries(
    fields.map((field) => [field, String(req.body[field] || "").trim()]),
  );
  if (!data.phone) {
    const user = await User.findByPk(req.session.userId, {
      attributes: ["phone"],
    });
    data.phone = String(user?.phone || "").trim();
  }
  if (!data.receiver_name || !data.phone || !data.address || !data.province)
    return res
      .status(400)
      .json({
        message:
          "Vui lòng nhập người nhận, số điện thoại, địa chỉ và tỉnh/thành.",
      });
  const count = await UserAddress.count({
    where: { user_id: req.session.userId },
  });
  const address = await UserAddress.create({
    ...data,
    user_id: req.session.userId,
    is_default: count === 0 || Boolean(req.body.is_default),
  });
  if (address.is_default)
    await UserAddress.update(
      { is_default: false },
      {
        where: {
          user_id: req.session.userId,
          id: { [require("sequelize").Op.ne]: address.id },
        },
      },
    );
  res.status(201).json({ message: "Đã thêm địa chỉ.", data: address });
}

async function deleteAddress(req, res) {
  const address = await UserAddress.findOne({
    where: { id: req.params.id, user_id: req.session.userId },
  });
  if (!address)
    return res.status(404).json({ message: "Không tìm thấy địa chỉ." });
  await address.destroy();
  res.json({ message: "Đã xóa địa chỉ." });
}

async function login(req, res) {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
  }

  if (Number(user.status) !== 1)
    return res.status(403).json({ message: "Tài khoản đã bị khóa." });

  const now = new Date();
  if (user.locked_until && new Date(user.locked_until) > now) {
    const retryAfterSeconds = Math.ceil(
      (new Date(user.locked_until).getTime() - now.getTime()) / 1000,
    );
    res.set("Retry-After", String(retryAfterSeconds));
    return res.status(423).json({
      message: "Tài khoản tạm khóa do đăng nhập sai 5 lần liên tiếp. Vui lòng thử lại sau.",
      lockedUntil: user.locked_until,
    });
  }

  if (user.locked_until) {
    await user.update({ failed_login_attempts: 0, locked_until: null });
  }

  const passwordMatches = await bcrypt.compare(
    String(req.body.password || ""),
    user.password_hash,
  );
  if (!passwordMatches) {
    const failedLoginAttempts = Number(user.failed_login_attempts || 0) + 1;
    if (failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOGIN_LOCK_DURATION_MS);
      await user.update({
        failed_login_attempts: MAX_LOGIN_ATTEMPTS,
        locked_until: lockedUntil,
      });
      res.set("Retry-After", String(LOGIN_LOCK_DURATION_MS / 1000));
      return res.status(423).json({
        message: "Tài khoản tạm khóa do đăng nhập sai 5 lần liên tiếp. Vui lòng thử lại sau 1 giờ.",
        lockedUntil,
      });
    }

    await user.update({ failed_login_attempts: failedLoginAttempts });
    return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
  }

  if (user.failed_login_attempts || user.locked_until) {
    await user.update({ failed_login_attempts: 0, locked_until: null });
  }

  req.session.userId = user.id;
  res.json({
    message: "Đăng nhập thành công.",
    data: new UserRespone(user),
  });
}

async function me(req, res) {
  if (!req.session.userId)
    return res.json({ authenticated: false, data: null });
  const user = await User.findByPk(req.session.userId);
  if (!user || Number(user.status) !== 1)
    return req.session.destroy(() =>
      res.json({ authenticated: false, data: null }),
    );
  res.json({ authenticated: true, data: new UserRespone(user) });
}

function logout(req, res, next) {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("nong-san.sid");
    res.json({ message: "Đã đăng xuất." });
  });
}

module.exports = {
  register,
  login,
  me,
  logout,
  profile,
  addresses,
  addAddress,
  deleteAddress,
};
