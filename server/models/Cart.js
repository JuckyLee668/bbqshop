const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  flavor: {
    type: String
  },
  spicy: {
    type: String
  },
  addons: [{
    id: mongoose.Schema.Types.Mixed, // 可以是 ObjectId 或字符串（用于索引）
    name: String,
    price: Number
  }],
  spec: {
    type: String
  },
  checked: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

cartSchema.index({ userId: 1, productId: 1 });

module.exports = mongoose.model('Cart', cartSchema);
