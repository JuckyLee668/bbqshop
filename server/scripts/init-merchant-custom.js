/**
 * 自定义创建商家账号脚本
 * 使用方法：node scripts/init-merchant-custom.js
 * 
 * 可以修改下面的配置来创建自定义商家账号
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Merchant = require('../models/Merchant');

// ========== 配置区域 ==========
const merchantConfig = {
  username: 'admin',           // 登录用户名
  password: 'admin123',        // 登录密码（会自动加密）
  name: '管理员',              // 商家名称
  storeInfo: {
    name: '手工烤面筋店',      // 门店名称
    address: '请填写门店地址',  // 门店地址
    businessHours: '09:00-22:00', // 营业时间
    deliveryRange: 5,          // 配送范围（公里）
    status: 'open',            // 门店状态：open（营业）/ closed（关闭）
    phone: '请填写联系电话',   // 联系电话
    latitude: null,            // 纬度（可选）
    longitude: null,           // 经度（可选）
    freeDeliveryThreshold: 20, // 满多少元免配送费（可选）
    deliveryFee: 5,            // 配送费（可选）
    showDeliveryFee: true      // 是否显示配送费（可选）
  }
};
// ==============================

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/noodles_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB连接成功');
  
  try {
    // 检查是否已存在相同用户名的商家账号
    const existingMerchant = await Merchant.findOne({ username: merchantConfig.username });
    if (existingMerchant) {
      console.log(`❌ 用户名 "${merchantConfig.username}" 已存在，请使用其他用户名`);
      await mongoose.connection.close();
      process.exit(1);
    }

    // 创建商家账号
    const merchant = new Merchant(merchantConfig);
    await merchant.save();
    
    console.log('✅ 商家账号创建成功！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`用户名: ${merchantConfig.username}`);
    console.log(`密码: ${merchantConfig.password}`);
    console.log(`商家名称: ${merchantConfig.name}`);
    console.log(`门店名称: ${merchantConfig.storeInfo.name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  请登录后立即修改密码！');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ 初始化失败:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
})
.catch(err => {
  console.error('❌ MongoDB连接失败:', err);
  process.exit(1);
});
