const mongoose = require('mongoose');

const userCouponSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'used', 'expired'],
    default: 'available'
  },
  usedTime: {
    type: Date
  }
}, {
  timestamps: true
});

userCouponSchema.index({ userId: 1, couponId: 1 });

module.exports = mongoose.model('UserCoupon', userCouponSchema);
