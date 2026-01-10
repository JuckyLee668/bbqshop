/**
 * 修复Cart集合的索引问题
 * 清理旧的user索引，确保使用userId字段
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Cart = require('../models/Cart');

async function fixCartIndex() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/noodles_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB连接成功');

    // 获取所有索引
    const indexes = await Cart.collection.getIndexes();
    console.log('当前索引:', indexes);

    // 删除旧的user索引（如果存在）
    try {
      await Cart.collection.dropIndex('user_1');
      console.log('已删除旧索引: user_1');
    } catch (err) {
      if (err.code === 27) {
        console.log('索引 user_1 不存在，跳过');
      } else {
        console.error('删除索引 user_1 失败:', err.message);
      }
    }

    // 删除其他可能的旧索引
    const oldIndexNames = ['user_1_productId_1', 'userId_1_productId_1'];
    for (const indexName of oldIndexNames) {
      try {
        await Cart.collection.dropIndex(indexName);
        console.log(`已删除旧索引: ${indexName}`);
      } catch (err) {
        if (err.code === 27) {
          console.log(`索引 ${indexName} 不存在，跳过`);
        } else {
          console.error(`删除索引 ${indexName} 失败:`, err.message);
        }
      }
    }

    // 确保userId索引存在（非唯一）
    try {
      await Cart.collection.createIndex({ userId: 1 });
      console.log('已创建/确认索引: userId_1');
    } catch (err) {
      console.error('创建 userId 索引失败:', err.message);
    }

    // 确保复合索引存在
    try {
      await Cart.collection.createIndex({ userId: 1, productId: 1 });
      console.log('已创建/确认复合索引: userId_1_productId_1');
    } catch (err) {
      console.error('创建复合索引失败:', err.message);
    }

    // 清理user字段为null或undefined的旧记录（如果有）
    const result = await Cart.deleteMany({ 
      $or: [
        { user: { $exists: true } },
        { userId: null },
        { userId: { $exists: false } }
      ]
    });
    if (result.deletedCount > 0) {
      console.log(`已清理 ${result.deletedCount} 条无效购物车记录`);
    }

    // 显示最终索引
    const finalIndexes = await Cart.collection.getIndexes();
    console.log('最终索引:', finalIndexes);

    console.log('索引修复完成！');
    process.exit(0);
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

fixCartIndex();
