/**
 * MongoDB 连接测试脚本
 * 用于诊断数据库连接和数据持久化问题
 */

require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noodles_db';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 MongoDB 连接诊断');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('连接字符串:', uri);
console.log('');

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('✅ MongoDB 连接成功');
  console.log('');
  
  try {
    // 检查数据库列表
    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log('📊 数据库列表:');
    dbs.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    console.log('');
    
    // 检查 noodles_db 数据库
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`📁 noodles_db 集合列表 (${collections.length} 个):`);
    if (collections.length === 0) {
      console.log('   ⚠️  数据库为空，没有任何集合');
    } else {
      for (const coll of collections) {
        const count = await db.collection(coll.name).countDocuments();
        console.log(`   - ${coll.name}: ${count} 条记录`);
      }
    }
    console.log('');
    
    // 测试写入
    console.log('🧪 测试数据写入...');
    const TestModel = mongoose.model('Test', new mongoose.Schema({ 
      name: String,
      timestamp: Date
    }, { collection: 'test_connection' }));
    
    const test = new TestModel({ 
      name: 'test-' + Date.now(),
      timestamp: new Date()
    });
    await test.save();
    console.log('✅ 测试数据写入成功:', test.name);
    console.log('');
    
    // 检查数据是否持久化
    const count = await TestModel.countDocuments();
    console.log(`📊 测试集合中的记录数: ${count}`);
    
    // 查询最近的测试记录
    const recentTests = await TestModel.find().sort({ timestamp: -1 }).limit(5);
    console.log('📝 最近的测试记录:');
    recentTests.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.name} (${t.timestamp.toLocaleString()})`);
    });
    console.log('');
    
    // 检查数据库文件大小
    const stats = await db.stats();
    console.log('💾 数据库统计信息:');
    console.log(`   - 数据大小: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - 存储大小: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - 索引大小: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - 集合数量: ${stats.collections}`);
    console.log(`   - 文档数量: ${stats.objects}`);
    console.log('');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 诊断完成');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ 诊断过程中出错:', err);
    process.exit(1);
  }
})
.catch(err => {
  console.error('❌ MongoDB 连接失败');
  console.error('错误信息:', err.message);
  console.error('');
  console.log('💡 排查建议:');
  console.log('   1. 检查 MongoDB 服务是否运行');
  console.log('   2. 检查连接字符串是否正确');
  console.log('   3. 检查防火墙设置');
  console.log('   4. 查看 MongoDB 日志文件');
  process.exit(1);
});
