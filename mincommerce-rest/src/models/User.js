class User {
  constructor(data) {
    this.userId = data.user_id;
    this.email = data.email;
    this.role = data.role;
    this.createdAt = data.created_at;
  }

  static fromDatabase(data) {
    return new User(data);
  }

  isAdmin() {
    return this.role === 'admin';
  }

  toJSON() {
    return {
      userId: this.userId,
      email: this.email,
      role: this.role,
      createdAt: this.createdAt,
    };
  }
}

module.exports = User;
