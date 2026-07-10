const Joi = require("joi");

class UpdateCategoryReq {
  constructor(data) {
    this.name = data.name;
    this.image = data.image;
  }

  static validate(data) {
    const schema = Joi.object({
      name: Joi.string().optional(),
      image: Joi.string().allow("").optional(),
    }).min(1);

    return schema.validate(data);
  }
}

module.exports = UpdateCategoryReq;
