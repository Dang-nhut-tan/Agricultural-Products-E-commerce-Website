class NewsRespone {
  constructor(news) {
    const data = news?.toJSON ? news.toJSON() : news;

    this.id = data.id;
    this.title = data.title;
    this.image = data.image;
    this.content = data.content;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

module.exports = NewsRespone;
