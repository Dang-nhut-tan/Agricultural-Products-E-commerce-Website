const Joi = require("joi");

class InsertCategoryReq {
  constructor(data) {
    this.name = data.name;
  }

  static validate(data) {
    const schema = Joi.object({
      name: Joi.string().required(),
    });

    return schema.validate(data);
  }
}

module.exports = InsertCategoryReq;
