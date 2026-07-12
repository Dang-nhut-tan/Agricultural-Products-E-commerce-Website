const db = require("../models");
const InsertNewsReq = require("../dtos/request/news/insertNewsReq");
const UpdateNewsReq = require("../dtos/request/news/updateNewsReq");
const sanitizeRichText = require("../services/sanitizeHtml");

async function getNews(req, res) {
  const news = await db.News.findAll();

  res.status(200).json({
    message: "Lấy danh sách tin tức thành công",
    data: news,
  });
}

async function getNewsBYID(req, res) {
  const { id } = req.params;
  const news = await db.News.findByPk(id);

  if (!news) {
    return res.status(404).json({
      message: "Không tìm thấy tin tức",
    });
  }

  // Bảo vệ cả các bài viết cũ được tạo trước khi model có hook sanitize.
  news.content = sanitizeRichText(news.content);

  res.status(200).json({
    message: "Lấy tin tức dựa trên id thành công",
    data: news,
  });
}

async function insertNews(req, res) {
  const newsData = new InsertNewsReq(req.body);
  const news = await db.News.create(newsData);

  res.status(201).json({
    message: "Thêm tin tức thành công",
    data: news,
  });
}

async function updateNews(req, res) {
  const { id } = req.params;
  const news = await db.News.findByPk(id);

  if (!news) {
    return res.status(404).json({
      message: "Không tìm thấy tin tức",
    });
  }

  const newsData = new UpdateNewsReq(req.body);
  await news.update(newsData);

  res.status(200).json({
    message: "Cập nhật tin tức thành công",
    data: news,
  });
}

async function deleteNews(req, res) {
  const { id } = req.params;
  const news = await db.News.findByPk(id);

  if (!news) {
    return res.status(404).json({
      message: "Không tìm thấy tin tức",
    });
  }

  await news.destroy();

  res.status(200).json({
    message: "Xóa tin tức thành công",
  });
}

module.exports = {
  getNews,
  getNewsBYID,
  insertNews,
  updateNews,
  deleteNews,
};
