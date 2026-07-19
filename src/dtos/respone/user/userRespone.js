class UserRespone {
  constructor(user) {
    const data = user?.toJSON ? user.toJSON() : user;

    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.role = data.role;
    this.status = data.status;
    this.avatar = data.avatar;
    this.phone = data.phone;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

module.exports = UserRespone;
