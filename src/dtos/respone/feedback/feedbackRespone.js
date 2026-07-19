class FeedbackRespone {
  constructor(feedback) {
    const data = feedback?.toJSON ? feedback.toJSON() : feedback;

    this.id = data.id;
    this.product_id = data.product_id;
    this.user_id = data.user_id;
    this.order_detail_id = data.order_detail_id;
    this.star = data.star;
    this.content = data.content;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    if (data.User !== undefined) {
      this.User = data.User;
    }
  }
}

module.exports = FeedbackRespone;
