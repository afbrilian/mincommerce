class Order {
  constructor(data) {
    this.orderId = data.order_id;
    this.userId = data.user_id;
    this.productId = data.product_id;
    this.status = data.status;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static fromDatabase(data) {
    return new Order(data);
  }

  toJSON() {
    return {
      orderId: this.orderId,
      userId: this.userId,
      productId: this.productId,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  get isConfirmed() {
    return this.status === 'confirmed';
  }

  get isPending() {
    return this.status === 'pending';
  }

  get isFailed() {
    return this.status === 'failed';
  }
}

module.exports = Order;
