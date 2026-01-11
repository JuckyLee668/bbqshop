const mongoose = require('mongoose');

const productVoucherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  desc: {
    type: String
  },
  image: {
    type: String
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1 // 商品数量，如10串面筋
  },
  points: {
    type: Number,
    required: true,
    min: 0 // 兑换所需积分
  },
  stock: {
    type: Number,
    default: -1 // -1表示无限制
  },
  usedCount: {
    type: Number,
    default: 0
  },
  maxExchangePerUser: {
    type: Number,
    default: -1 // -1表示无限制，每个用户最多可兑换次数
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  expireTime: {
    type: Date // 商品券过期时间
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProductVoucher', productVoucherSchema);
