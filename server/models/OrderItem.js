const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  spec: {
    type: String
  },
  flavor: {
    type: String
  },
  spicy: {
    type: String
  },
  addons: [{
    name: String,
    price: Number
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('OrderItem', orderItemSchema);
