const Joi = require("joi");

class UpdateFeedbackReq {
  constructor(data) {
    this.star = data.star;
    this.content = data.content;
  }

  static validate(data) {
    return Joi.object({
      star: Joi.number().integer().min(1).max(5).optional(),
      content: Joi.string().trim().min(2).max(1000).optional(),
    }).min(1).validate(data);
  }
}

module.exports = UpdateFeedbackReq;
