class CategoryRespone {
  constructor(category) {
    const data = category?.toJSON ? category.toJSON() : category;

    this.id = data.id;
    this.name = data.name;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

module.exports = CategoryRespone;
