const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  accountNumber: { type: String, unique: true },
  bankName: { type: String },
  walletBalance: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  verificationCode: { type: String },
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);