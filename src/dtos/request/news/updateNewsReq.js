const Joi = require("joi");

class UpdateNewsReq {
  constructor(data) {
    this.title = data.title;
    this.image = data.image;
    this.content = data.content;
  }

  static validate(data) {
    const schema = Joi.object({
      title: Joi.string().optional(),
      image: Joi.string().allow("").optional(),
      content: Joi.string().allow("").optional(),
    }).min(1);

    return schema.validate(data);
  }
}

module.exports = UpdateNewsReq;
