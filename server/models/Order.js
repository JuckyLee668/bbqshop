const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  productTotal: {
    type: Number,
    default: 0
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'making', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  deliveryType: {
    type: String,
    enum: ['pickup', 'delivery'],
    default: 'pickup'
  },
  deliveryAddressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  },
  remark: {
    type: String
  },
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserCoupon' // 引用用户优惠券，不是优惠券模板
  },
  productVoucherIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserProductVoucher' // 保存商品券ID，用于支付成功后标记为已使用
  }],
  cartItemIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cart' // 保存购物车商品ID，用于支付成功后删除购物车
  }],
  payTime: {
    type: Date
  },
  completeTime: {
    type: Date
  },
  cancelReason: {
    type: String
  }
}, {
  timestamps: true
});

// 生成订单号
orderSchema.statics.generateOrderNo = function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `${year}${month}${day}${random}`;
};

module.exports = mongoose.model('Order', orderSchema);
