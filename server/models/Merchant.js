const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const merchantSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  storeInfo: {
    name: String,
    address: String,
    businessHours: String,
    deliveryRange: Number,
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open'
    },
    latitude: Number,
    longitude: Number,
    phone: String,
    // 配送费配置
    freeDeliveryThreshold: {
      type: Number,
      default: 50 // 免费配送界限，默认50元
    },
    deliveryFee: {
      type: Number,
      default: 5 // 配送费用，默认5元
    },
    showDeliveryFee: {
      type: Boolean,
      default: true // 是否对外展示配送费信息
    },
    // 新用户专享优惠券配置
    newUserCoupon: {
      enabled: {
        type: Boolean,
        default: false // 是否启用新用户专享
      },
      couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        default: null // 关联的优惠券ID
      },
      title: {
        type: String,
        default: '新用户专享' // 显示标题
      },
      desc: {
        type: String,
        default: '首单立减5元，满30减10' // 显示描述
      }
    }
  }
}, {
  timestamps: true
});

// 密码加密
merchantSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 密码验证
merchantSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Merchant', merchantSchema);
