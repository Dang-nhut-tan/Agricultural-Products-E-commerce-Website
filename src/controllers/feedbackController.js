const sanitizeHtml = require("sanitize-html");
const db = require("../models");

const includeUser = { model: db.User, attributes: ["id", "name", "avatar"] };
const plainText = (value) => sanitizeHtml(String(value), {
  allowedTags: [],
  allowedAttributes: {},
}).trim();

async function getFeedback(req, res) {
  const product = await db.Product.findOne({
    where: { id: req.params.productId, status: 1 },
    attributes: ["id"],
  });
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm." });

  const feedback = await db.Feedback.findAll({
    where: { product_id: product.id },
    include: [includeUser],
    order: [["createdAt", "DESC"]],
  });
  res.json({ data: feedback });
}

async function createFeedback(req, res) {
  const product = await db.Product.findOne({
    where: { id: req.params.productId, status: 1 },
    attributes: ["id"],
  });
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm." });

  const feedback = await db.Feedback.create({
    product_id: product.id,
    user_id: req.session.userId,
    star: req.body.star,
    content: plainText(req.body.content),
  });
  await feedback.reload({ include: [includeUser] });
  res.status(201).json({ message: "Đã thêm bình luận.", data: feedback });
}

async function updateFeedback(req, res) {
  const feedback = await db.Feedback.findOne({
    where: {
      id: req.params.feedbackId,
      product_id: req.params.productId,
      user_id: req.session.userId,
    },
  });
  if (!feedback) return res.status(404).json({ message: "Không tìm thấy bình luận của bạn." });

  const changes = { ...req.body };
  if (changes.content !== undefined) changes.content = plainText(changes.content);
  await feedback.update(changes);
  await feedback.reload({ include: [includeUser] });
  res.json({ message: "Đã cập nhật bình luận.", data: feedback });
}

async function deleteFeedback(req, res) {
  const feedback = await db.Feedback.findOne({
    where: { id: req.params.feedbackId, product_id: req.params.productId },
  });
  if (!feedback) return res.status(404).json({ message: "Không tìm thấy bình luận." });

  const user = await db.User.findByPk(req.session.userId, { attributes: ["id", "role"] });
  const ownsFeedback = Number(feedback.user_id) === Number(req.session.userId);
  if (!ownsFeedback && Number(user?.role) !== 1) {
    return res.status(403).json({ message: "Bạn không có quyền xóa bình luận này." });
  }

  await feedback.destroy();
  res.json({ message: "Đã xóa bình luận." });
}

module.exports = { getFeedback, createFeedback, updateFeedback, deleteFeedback };
