const Joi = require("joi");

class InsertCouponReq {
  constructor(data) {
    this.code = data.code;
    this.discount_type = data.discount_type;
    this.discount_value = data.discount_value;
    this.min_order_value = data.min_order_value;
    this.start_date = data.start_date;
    this.end_date = data.end_date;
    this.quantity = data.quantity;
    this.used_quantity = data.used_quantity;
    this.status = data.status;
  }

  static validate(data) {
    const schema = Joi.object({
      code: Joi.string().trim().uppercase().max(50).required(),
      discount_type: Joi.number().integer().valid(1, 2).required(),
      discount_value: Joi.number().min(0).optional(),
      min_order_value: Joi.number().min(0).optional(),
      start_date: Joi.date().optional(),
      end_date: Joi.date().optional(),
      quantity: Joi.number().integer().min(0).optional(),
      used_quantity: Joi.number().integer().min(0).optional(),
      status: Joi.number().integer().valid(0, 1).optional(),
    });

    return schema.validate(data);
  }
}

module.exports = InsertCouponReq;
