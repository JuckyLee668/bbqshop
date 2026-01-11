/**
 * 修复User集合的索引问题
 * 清理旧的openId索引，确保使用openid字段
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function fixUserIndex() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/noodles_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB连接成功');

    // 获取所有索引
    const indexes = await User.collection.getIndexes();
    console.log('当前索引:', indexes);

    // 删除旧的openId索引（如果存在）
    try {
      await User.collection.dropIndex('openId_1');
      console.log('已删除旧索引: openId_1');
    } catch (err) {
      if (err.code === 27) {
        console.log('索引 openId_1 不存在，跳过');
      } else {
        console.error('删除索引 openId_1 失败:', err.message);
      }
    }

    // 确保openid索引存在
    try {
      await User.collection.createIndex({ openid: 1 }, { unique: true });
      console.log('已创建/确认索引: openid_1 (unique)');
    } catch (err) {
      console.error('创建索引失败:', err.message);
    }

    // 清理openid为null或undefined的旧记录（如果有）
    const result = await User.deleteMany({ 
      $or: [
        { openid: null },
        { openid: { $exists: false } }
      ]
    });
    if (result.deletedCount > 0) {
      console.log(`已清理 ${result.deletedCount} 条无效用户记录`);
    }

    // 显示最终索引
    const finalIndexes = await User.collection.getIndexes();
    console.log('最终索引:', finalIndexes);

    console.log('✅ 索引修复完成！');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 修复失败:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixUserIndex();
