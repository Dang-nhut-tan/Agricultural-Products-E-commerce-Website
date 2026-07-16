const Joi = require("joi");

class InsertFeedbackReq {
  constructor(data) {
    this.star = data.star;
    this.content = data.content;
  }

  static validate(data) {
    return Joi.object({
      star: Joi.number().integer().min(1).max(5).required(),
      content: Joi.string().trim().min(2).max(1000).required(),
    }).validate(data);
  }
}

module.exports = InsertFeedbackReq;
