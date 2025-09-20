class User {
  constructor(data) {
    this.userId = data.user_id;
    this.email = data.email;
    this.createdAt = data.created_at;
  }

  static fromDatabase(data) {
    return new User(data);
  }

  toJSON() {
    return {
      userId: this.userId,
      email: this.email,
      createdAt: this.createdAt,
    };
  }
}

module.exports = User;
