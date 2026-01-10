# 环境变量配置说明

创建 `.env` 文件并配置以下变量：

```env
# ==================== 服务器配置 ====================
# 服务器端口
PORT=3000

# 运行环境: development | production
NODE_ENV=production


# ==================== 数据库配置 ====================
# MongoDB 连接字符串
# 本地开发: mongodb://localhost:27017/noodles_db
# 云数据库: mongodb://username:password@host:port/database
# MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/database
MONGODB_URI=mongodb://localhost:27017/noodles_db


# ==================== JWT 配置 ====================
# JWT 密钥（必须修改！建议至少32位随机字符串）
# 生成方式: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production


# ==================== 微信小程序配置 ====================
# 微信小程序 AppID
WX_APPID=wx你的appid

# 微信小程序 AppSecret
WX_SECRET=你的secret


# ==================== CORS 配置 ====================
# 允许跨域的域名（多个用逗号分隔）
# 开发环境: *
# 生产环境: https://yourdomain.com,https://admin.yourdomain.com
ALLOWED_ORIGINS=*


# ==================== 文件上传配置 ====================
# 最大文件大小（字节），默认 5MB
MAX_FILE_SIZE=5242880
```

## 配置步骤

1. **复制模板文件**
   ```bash
   cp ENV_TEMPLATE.md .env
   ```

2. **编辑 .env 文件**
   ```bash
   nano .env
   # 或
   vim .env
   ```

3. **必须修改的配置**
   - `JWT_SECRET`: 使用随机字符串生成器生成
   - `WX_APPID`: 微信小程序 AppID
   - `WX_SECRET`: 微信小程序 AppSecret
   - `MONGODB_URI`: 数据库连接字符串
   - `ALLOWED_ORIGINS`: 生产环境建议指定具体域名

4. **生成 JWT_SECRET**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **验证配置**
   ```bash
   # 检查环境变量是否正确加载
   node -e "require('dotenv').config(); console.log('PORT:', process.env.PORT)"
   ```

## 安全建议

1. **永远不要将 .env 文件提交到 Git**
2. **生产环境使用强密码和随机密钥**
3. **定期更换 JWT_SECRET**
4. **限制 ALLOWED_ORIGINS 为具体域名**
