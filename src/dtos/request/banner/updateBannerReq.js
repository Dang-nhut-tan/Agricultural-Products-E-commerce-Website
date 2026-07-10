const Joi = require("joi");

class UpdateBannerReq {
  constructor(data) {
    this.name = data.name;
    this.image = data.image;
    this.status = data.status;
    this.sort_order = data.sort_order;
  }

  static validate(data) {
    const schema = Joi.object({
      name: Joi.string().allow("").optional(),
      image: Joi.string().allow("").optional(),
      status: Joi.number().integer().optional(),
      sort_order: Joi.number().integer().optional(),
    }).min(1);

    return schema.validate(data);
  }
}

module.exports = UpdateBannerReq;
