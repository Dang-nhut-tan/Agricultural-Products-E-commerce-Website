const Joi = require("joi");

class UpdateUserReq {
  constructor(data) {
    this.email = data.email;
    this.password_hash = data.password_hash;
    this.name = data.name;
    this.role = data.role;
    this.status = data.status;
    this.avatar = data.avatar;
    this.phone = data.phone;
  }

  static validate(data) {
    const schema = Joi.object({
      email: Joi.string().email().optional(),
      password_hash: Joi.string().optional(),
      name: Joi.string().allow("").optional(),
      role: Joi.number().integer().optional(),
      status: Joi.number().integer().optional(),
      avatar: Joi.string().allow("").optional(),
      phone: Joi.string().allow("").optional(),
    }).min(1);

    return schema.validate(data);
  }
}

module.exports = UpdateUserReq;
