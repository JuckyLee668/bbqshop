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
    enum: ['discount', 'reduce'],
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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Coupon', couponSchema);
