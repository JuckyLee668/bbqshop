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


# ==================== 微信支付配置 ====================
# 微信支付商户号（在微信支付商户平台获取）
WX_MCHID=你的商户号

# 微信支付 API v3 密钥（32位字符串，在商户平台设置）
WX_API_KEY=你的API密钥

# 商户私钥（用于签名，PEM格式）
# 方式1：直接填写私钥内容（推荐用于开发环境）
# WX_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n你的私钥内容\n-----END PRIVATE KEY-----
# 方式2：填写私钥文件路径（推荐用于生产环境）
# WX_PRIVATE_KEY=file:///path/to/apiclient_key.pem

# 证书序列号（在商户平台获取）
WX_CERT_SERIAL_NO=你的证书序列号

# 微信支付平台证书公钥（可选，用于验证回调，PEM格式）
# WX_PUBLIC_KEY=-----BEGIN CERTIFICATE-----\n公钥内容\n-----END CERTIFICATE-----

# 支付回调地址（可选，默认使用 API_BASE_URL + /v1/payment/notify）
# WX_NOTIFY_URL=https://yourdomain.com/v1/payment/notify

# API 基础地址（用于生成回调地址）
# API_BASE_URL=https://yourdomain.com


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
