const mongoose = require('mongoose');

const userProductVoucherSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productVoucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductVoucher',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'used', 'expired'],
    default: 'available'
  },
  usedTime: {
    type: Date
  },
  usedOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('UserProductVoucher', userProductVoucherSchema);
