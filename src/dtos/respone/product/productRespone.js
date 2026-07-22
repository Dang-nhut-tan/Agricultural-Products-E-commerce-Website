class ProductRespone {
  constructor(product) {
    const data = product?.toJSON ? product.toJSON() : product;

    this.id = data.id;
    this.name = data.name;
    this.price = data.price;
    this.oldprice = data.oldprice;
    this.image = data.image;
    this.description = data.description;
    this.specification = data.specification;
    this.quantity = data.quantity;
    this.sold_count = data.sold_count;
    this.unit = data.unit;
    this.origin = data.origin;

    if (data.Brand !== undefined) {
      this.Brand = data.Brand
        ? {
            id: data.Brand.id,
            name: data.Brand.name,
            image: data.Brand.image,
          }
        : null;
    }

    if (data.Category !== undefined) {
      this.Category = data.Category
        ? {
            id: data.Category.id,
            name: data.Category.name,
            image: data.Category.image,
          }
        : null;
    }

    if (data.ProductImages !== undefined) {
      this.ProductImages = data.ProductImages.map((item) => ({
        id: item.id,
        image: item.image,
        sort_order: item.sort_order,
      }));
    }
  }
}

module.exports = ProductRespone;
