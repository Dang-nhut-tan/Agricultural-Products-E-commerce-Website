const Joi = require("joi");

class InsertNewsReq {
  constructor(data) {
    this.title = data.title;
    this.image = data.image;
    this.content = data.content;
  }

  static validate(data) {
    const schema = Joi.object({
      title: Joi.string().required(),
      image: Joi.string().allow("").optional(),
      content: Joi.string().allow("").optional(),
    });

    return schema.validate(data);
  }
}

module.exports = InsertNewsReq;
