class Product {
  constructor(data) {
    this.productId = data.product_id;
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.imageUrl = data.image_url;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static fromDatabase(data) {
    return new Product(data);
  }

  toJSON() {
    return {
      productId: this.productId,
      name: this.name,
      description: this.description,
      price: this.price,
      imageUrl: this.imageUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = Product;
