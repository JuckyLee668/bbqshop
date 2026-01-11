# MongoDB 数据丢失问题排查指南

## 问题描述
每次重新运行服务器时，数据库文件都被删除了。

## 可能的原因

### 1. MongoDB 服务未正确安装或配置
MongoDB 可能没有正确安装，或者数据目录配置错误。

### 2. 使用了临时数据目录
MongoDB 的数据目录可能指向了临时文件夹，系统重启后会被清理。

### 3. MongoDB 服务未启动
如果 MongoDB 服务没有运行，应用可能连接失败或使用了错误的数据库。

## 排查步骤

### 步骤 1: 检查 MongoDB 是否安装并运行

#### Windows 系统
```bash
# 检查 MongoDB 服务状态
sc query MongoDB

# 如果服务未运行，启动服务
net start MongoDB

# 或者使用服务管理器
services.msc
```

#### Linux/Mac 系统
```bash
# 检查 MongoDB 服务状态
sudo systemctl status mongod
# 或
brew services list | grep mongodb

# 如果服务未运行，启动服务
sudo systemctl start mongod
# 或
brew services start mongodb-community
```

### 步骤 2: 检查 MongoDB 数据目录

#### Windows 系统
MongoDB 默认数据目录：
- `C:\data\db\` (旧版本)
- `C:\Program Files\MongoDB\Server\<version>\data\db\` (新版本)

检查数据目录是否存在：
```bash
dir C:\data\db
# 或
dir "C:\Program Files\MongoDB\Server\*\data\db"
```

#### Linux 系统
MongoDB 默认数据目录：
- `/var/lib/mongodb/`
- `/data/db/`

检查数据目录：
```bash
ls -la /var/lib/mongodb/
# 或
ls -la /data/db/
```

#### Mac 系统
MongoDB 默认数据目录：
- `/usr/local/var/mongodb/`
- `/data/db/`

检查数据目录：
```bash
ls -la /usr/local/var/mongodb/
```

### 步骤 3: 检查 MongoDB 配置文件

#### Windows 系统
配置文件位置：
- `C:\Program Files\MongoDB\Server\<version>\bin\mongod.cfg`

检查配置：
```bash
type "C:\Program Files\MongoDB\Server\*\bin\mongod.cfg"
```

查找以下配置项：
```yaml
storage:
  dbPath: C:\data\db  # 确保路径存在且不是临时目录
```

#### Linux 系统
配置文件位置：
- `/etc/mongod.conf`

检查配置：
```bash
cat /etc/mongod.conf | grep dbPath
```

#### Mac 系统
配置文件位置：
- `/usr/local/etc/mongod.conf`
- 或通过 Homebrew: `/opt/homebrew/etc/mongod.conf`

检查配置：
```bash
cat /usr/local/etc/mongod.conf | grep dbPath
```

### 步骤 4: 验证数据库连接

创建一个测试脚本 `test-db-connection.js`：

```javascript
require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noodles_db';

console.log('连接字符串:', uri);

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('✅ MongoDB 连接成功');
  
  // 检查数据库列表
  const admin = mongoose.connection.db.admin();
  const dbs = await admin.listDatabases();
  console.log('📊 数据库列表:', dbs.databases.map(db => db.name));
  
  // 检查 noodles_db 数据库
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('📁 集合列表:', collections.map(c => c.name));
  
  // 测试写入
  const TestModel = mongoose.model('Test', new mongoose.Schema({ name: String }));
  const test = new TestModel({ name: 'test-' + Date.now() });
  await test.save();
  console.log('✅ 测试数据写入成功:', test);
  
  // 检查数据是否持久化
  const count = await TestModel.countDocuments();
  console.log('📊 测试数据数量:', count);
  
  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB 连接失败:', err);
  process.exit(1);
});
```

运行测试：
```bash
node test-db-connection.js
```

## 解决方案

### 方案 1: 修复 MongoDB 数据目录配置

#### Windows 系统

1. **创建持久化数据目录**
```bash
mkdir C:\data\db
```

2. **修改 MongoDB 配置文件**
编辑 `mongod.cfg`：
```yaml
storage:
  dbPath: C:\data\db
```

3. **重启 MongoDB 服务**
```bash
net stop MongoDB
net start MongoDB
```

#### Linux 系统

1. **创建持久化数据目录**
```bash
sudo mkdir -p /var/lib/mongodb
sudo chown mongodb:mongodb /var/lib/mongodb
```

2. **修改 MongoDB 配置文件**
编辑 `/etc/mongod.conf`：
```yaml
storage:
  dbPath: /var/lib/mongodb
```

3. **重启 MongoDB 服务**
```bash
sudo systemctl restart mongod
```

#### Mac 系统

1. **创建持久化数据目录**
```bash
mkdir -p /usr/local/var/mongodb
```

2. **修改 MongoDB 配置文件**
编辑 `/usr/local/etc/mongod.conf`：
```yaml
storage:
  dbPath: /usr/local/var/mongodb
```

3. **重启 MongoDB 服务**
```bash
brew services restart mongodb-community
```

### 方案 2: 使用云数据库（推荐）

如果本地 MongoDB 配置有问题，建议使用云数据库：

1. **MongoDB Atlas** (免费版可用)
   - 访问: https://www.mongodb.com/cloud/atlas
   - 创建免费集群
   - 获取连接字符串

2. **修改 .env 文件**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/noodles_db
```

### 方案 3: 使用 Docker（开发环境）

如果不想配置本地 MongoDB，可以使用 Docker：

1. **创建 docker-compose.yml**
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7
    container_name: noodles-mongodb
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: noodles_db

volumes:
  mongodb_data:
    driver: local
```

2. **启动 MongoDB**
```bash
docker-compose up -d
```

3. **验证数据持久化**
```bash
# 停止容器
docker-compose down

# 重新启动
docker-compose up -d

# 数据应该还在
```

### 方案 4: 检查应用启动脚本

确保应用启动时不会清理数据库。检查是否有以下代码：

```javascript
// ❌ 错误：不要这样做
mongoose.connection.dropDatabase();

// ❌ 错误：不要删除集合
await mongoose.connection.db.dropCollection('users');
```

## 预防措施

### 1. 定期备份数据库

创建备份脚本 `backup-db.js`：

```javascript
require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noodles_db';
const backupDir = path.join(__dirname, 'backups');
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const backupPath = path.join(backupDir, `backup-${timestamp}`);

// 创建备份目录
const fs = require('fs');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 执行备份
const command = `mongodump --uri="${uri}" --out="${backupPath}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('备份失败:', error);
    return;
  }
  console.log('备份成功:', backupPath);
});
```

添加到 package.json：
```json
{
  "scripts": {
    "backup:db": "node backup-db.js"
  }
}
```

### 2. 使用环境变量指定数据目录

在 `.env` 文件中明确指定 MongoDB URI：
```env
MONGODB_URI=mongodb://localhost:27017/noodles_db
```

### 3. 添加数据库连接健康检查

在 `app.js` 中添加连接状态监控：

```javascript
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB 已连接');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB 连接错误:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB 已断开连接');
});

// 优雅关闭
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB 连接已关闭');
  process.exit(0);
});
```

## 快速诊断命令

运行以下命令快速诊断问题：

```bash
# 1. 检查 MongoDB 服务状态
# Windows:
sc query MongoDB

# Linux:
sudo systemctl status mongod

# Mac:
brew services list | grep mongodb

# 2. 检查数据目录
# Windows:
dir C:\data\db

# Linux:
ls -la /var/lib/mongodb/

# Mac:
ls -la /usr/local/var/mongodb/

# 3. 测试数据库连接
node test-db-connection.js

# 4. 检查数据库内容
# 使用 MongoDB Shell:
mongo noodles_db --eval "db.getCollectionNames()"
# 或
mongosh noodles_db --eval "db.getCollectionNames()"
```

## 常见问题

### Q: 为什么数据目录是空的？
A: 可能是：
1. MongoDB 服务没有正确启动
2. 数据目录配置错误
3. 权限问题导致无法写入

### Q: 如何确认数据是否真的被删除了？
A: 检查 MongoDB 日志：
- Windows: `C:\Program Files\MongoDB\Server\<version>\log\mongod.log`
- Linux: `/var/log/mongodb/mongod.log`
- Mac: `/usr/local/var/log/mongodb/mongo.log`

### Q: 使用云数据库还是本地数据库？
A: 
- **开发环境**: 本地数据库更方便
- **生产环境**: 云数据库更稳定可靠

## 需要帮助？

如果以上方法都无法解决问题，请提供以下信息：

1. 操作系统版本
2. MongoDB 版本 (`mongod --version`)
3. MongoDB 配置文件内容
4. 数据目录路径和权限
5. MongoDB 日志文件内容
6. 应用启动日志
