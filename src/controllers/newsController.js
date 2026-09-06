const db = require("../models");
const NewsRespone = require("../dtos/respone/news/newsRespone");
const sanitizeRichText = require("../services/sanitizeHtml");

async function getNews(req, res) {
  const news = await db.News.findAll();

  res.status(200).json({
    message: "Lấy danh sách tin tức thành công",
    data: news.map((item) => new NewsRespone(item)),
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

  news.content = sanitizeRichText(news.content);

  res.status(200).json({
    message: "Lấy tin tức dựa trên id thành công",
    data: new NewsRespone(news),
  });
}

module.exports = {
  getNews,
  getNewsBYID,
};
