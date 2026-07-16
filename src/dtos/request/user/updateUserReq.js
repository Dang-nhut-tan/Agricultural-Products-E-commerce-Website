const Joi = require("joi");

class UpdateUserReq {
  constructor(data) {
    this.email = data.email;
    this.password = data.password;
    this.name = data.name;
    this.role = data.role;
    this.status = data.status;
    this.avatar = data.avatar;
    this.phone = data.phone;
  }

  static validate(data) {
    const schema = Joi.object({
      email: Joi.string().email().optional(),
      password: Joi.string().min(6).optional(),
      name: Joi.string().allow("").optional(),
      role: Joi.number().integer().valid(1, 2).optional(),
      status: Joi.number().integer().valid(0, 1, 2).optional(),
      avatar: Joi.string().allow("").optional(),
      phone: Joi.string().allow("").optional(),
    }).min(1);

    return schema.validate(data);
  }
}

module.exports = UpdateUserReq;
