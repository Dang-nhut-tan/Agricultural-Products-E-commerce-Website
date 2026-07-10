const Joi = require("joi");

class InsertBrandReq {
  constructor(data) {
    this.name = data.name;
    this.image = data.image;
  }

  static validate(data) {
    const schema = Joi.object({
      name: Joi.string().required(),
      image: Joi.string().allow("").optional(),
    });

    return schema.validate(data);
  }
}

module.exports = InsertBrandReq;
