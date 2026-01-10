/**
 * 初始化商家账号脚本
 * 使用方法：node scripts/init-merchant.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Merchant = require('../models/Merchant');

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/noodles_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB连接成功');
  
  // 检查是否已存在商家账号
  const existingMerchant = await Merchant.findOne({ username: 'admin' });
  if (existingMerchant) {
    console.log('商家账号已存在，跳过创建');
    console.log('用户名: admin');
    process.exit(0);
  }

  // 创建默认商家账号
  const merchant = new Merchant({
    username: 'admin',
    password: 'admin123', // 密码会自动加密
    name: '管理员',
    storeInfo: {
      name: '手工烤面筋店',
      address: '请填写门店地址',
      businessHours: '09:00-22:00',
      deliveryRange: 5, // 配送范围（公里）
      status: 'open',
      phone: '请填写联系电话'
    }
  });

  await merchant.save();
  console.log('✅ 商家账号创建成功！');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('用户名: admin');
  console.log('密码: admin123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  请登录后立即修改密码！');
  
  process.exit(0);
})
.catch(err => {
  console.error('❌ 初始化失败:', err);
  process.exit(1);
});
