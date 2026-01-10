const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  desc: {
    type: String
  },
  price: {
    type: Number,
    required: true
  },
  oldPrice: {
    type: Number
  },
  stock: {
    type: Number,
    default: 0
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  status: {
    type: String,
    enum: ['on_sale', 'off_sale'],
    default: 'on_sale'
  },
  images: [{
    type: String
  }],
  flavors: [{
    type: String
  }],
  spicyLevels: [{
    type: String
  }],
  addons: [{
    name: String,
    price: Number,
    image: String
  }],
  sort: {
    type: Number,
    default: 0
  },
  tag: {
    type: String
  },
  isRecommend: {
    type: Boolean,
    default: false
  },
  isSpecial: {
    type: Boolean,
    default: false
  },
  enableAddons: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
