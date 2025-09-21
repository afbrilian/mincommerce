class Stock {
  constructor(data) {
    this.stockId = data.stock_id
    this.productId = data.product_id
    this.totalQuantity = data.total_quantity
    this.availableQuantity = data.available_quantity
    this.reservedQuantity = data.reserved_quantity
    this.lastUpdated = data.last_updated
  }

  static fromDatabase(data) {
    return new Stock(data)
  }

  toJSON() {
    return {
      stockId: this.stockId,
      productId: this.productId,
      totalQuantity: this.totalQuantity,
      availableQuantity: this.availableQuantity,
      reservedQuantity: this.reservedQuantity,
      lastUpdated: this.lastUpdated
    }
  }

  get soldQuantity() {
    return this.totalQuantity - this.availableQuantity - this.reservedQuantity
  }

  get isAvailable() {
    return this.availableQuantity > 0
  }
}

module.exports = Stock
