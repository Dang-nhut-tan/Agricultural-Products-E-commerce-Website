const Joi = require("joi");

class ChatReq {
  constructor(data) {
    this.message = data.message;
    this.history = data.history || [];
  }

  static validate(data) {
    return Joi.object({
      message: Joi.string().trim().min(1).max(500).required(),
      history: Joi.array().items(Joi.object({
        role: Joi.string().valid("user", "model").required(),
        text: Joi.string().max(1000).required(),
      })).max(8).default([]),
    }).validate(data);
  }
}

module.exports = ChatReq;
