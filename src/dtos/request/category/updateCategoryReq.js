const Joi = require("joi");

class UpdateCategoryReq {
  constructor(data) {
    this.name = data.name;
  }

  static validate(data) {
    const schema = Joi.object({
      name: Joi.string().optional(),
    }).min(1);

    return schema.validate(data);
  }
}

module.exports = UpdateCategoryReq;
