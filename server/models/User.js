const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  openid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  unionid: {
    type: String,
    index: true
  },
  nickName: {
    type: String,
    default: '微信用户'
  },
  avatarUrl: {
    type: String
  },
  phone: {
    type: String
  },
  points: {
    type: Number,
    default: 0
  },
  totalConsumption: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
