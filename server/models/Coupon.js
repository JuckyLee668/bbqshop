const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  desc: {
    type: String
  },
  type: {
    type: String,
    enum: ['discount', 'reduce', 'freeProduct'],
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  minAmount: {
    type: Number,
    default: 0
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product' // 特定商品免单券关联的商品ID
  },
  expireTime: {
    type: Date
  },
  totalCount: {
    type: Number,
    default: -1
  },
  usedCount: {
    type: Number,
    default: 0
  },
  isDistributed: {
    type: Boolean,
    default: false // 是否发放（true表示可以在通知中心领取）
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Coupon', couponSchema);
