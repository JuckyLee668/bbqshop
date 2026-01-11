const mongoose = require('mongoose');

const pointsProductSchema = new mongoose.Schema({
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
  points: {
    type: Number,
    required: true,
    min: 0
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
  sort: {
    type: Number,
    default: 0
  },
  couponType: {
    type: String,
    enum: ['discount', 'reduce', 'freeProduct'],
    default: 'reduce' // 兑换后生成的优惠券类型
  },
  couponValue: {
    type: Number,
    default: 5 // 优惠券的优惠值（折扣百分比或满减金额）
  },
  couponMinAmount: {
    type: Number,
    default: 0 // 优惠券的最低消费金额
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product' // 特定商品免单券关联的商品ID
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PointsProduct', pointsProductSchema);
