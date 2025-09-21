class FlashSale {
  constructor(data) {
    this.saleId = data.sale_id
    this.productId = data.product_id
    this.startTime = data.start_time
    this.endTime = data.end_time
    this.status = data.status
    this.createdAt = data.created_at
    this.updatedAt = data.updated_at
  }

  static fromDatabase(data) {
    return new FlashSale(data)
  }

  toJSON() {
    return {
      saleId: this.saleId,
      productId: this.productId,
      startTime: this.startTime,
      endTime: this.endTime,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  get isActive() {
    const now = new Date()
    return this.status === 'active' && now >= this.startTime && now <= this.endTime
  }

  get isUpcoming() {
    const now = new Date()
    return this.status === 'upcoming' && now < this.startTime
  }

  get isEnded() {
    const now = new Date()
    return this.status === 'ended' || now > this.endTime
  }

  get timeUntilStart() {
    const now = new Date()
    return Math.max(0, this.startTime - now)
  }

  get timeUntilEnd() {
    const now = new Date()
    return Math.max(0, this.endTime - now)
  }
}

module.exports = FlashSale
