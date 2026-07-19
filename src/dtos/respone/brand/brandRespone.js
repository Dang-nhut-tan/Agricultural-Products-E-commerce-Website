class BrandRespone {
  constructor(brand) {
    const data = brand?.toJSON ? brand.toJSON() : brand;

    this.id = data.id;
    this.name = data.name;
    this.image = data.image;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    if (data.Products !== undefined) {
      this.Products = data.Products;
    }
  }
}

module.exports = BrandRespone;
