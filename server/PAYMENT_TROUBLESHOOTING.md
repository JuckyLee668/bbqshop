# 微信支付问题诊断指南

## 503 错误：微信支付服务不可用

如果遇到 `503 (Service Unavailable)` 错误，说明微信支付服务未正确配置。

### 快速诊断

访问配置检查接口：
```
GET /v1/payment/config/check
```

这个接口会返回：
- 配置状态（哪些已配置，哪些缺失）
- 初始化错误信息
- 缺失的环境变量列表

### 常见原因

#### 1. 环境变量未配置

**检查项：**
- `WX_APPID` - 小程序 AppID
- `WX_MCHID` - 商户号
- `WX_API_KEY` - API v3 密钥（32位字符串）
- `WX_PRIVATE_KEY` - 商户私钥
- `WX_CERT_SERIAL_NO` - 证书序列号

**解决方法：**
1. 检查 `.env` 文件是否存在
2. 确认所有必需的环境变量都已配置
3. 重启服务器使配置生效

#### 2. 私钥格式错误

**检查项：**
- 私钥必须是 PEM 格式
- 如果使用文件路径，格式为：`file:///path/to/apiclient_key.pem`
- 如果直接填写内容，需要包含完整的 `-----BEGIN PRIVATE KEY-----` 和 `-----END PRIVATE KEY-----`

**解决方法：**
```env
# 方式1：直接填写（开发环境）
WX_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----

# 方式2：文件路径（生产环境）
WX_PRIVATE_KEY=file:///var/www/noodles-api/certs/apiclient_key.pem
```

**注意：** 如果私钥内容包含换行符，在 `.env` 文件中需要使用 `\n` 表示，或者使用文件路径方式。

#### 3. 证书序列号错误

**检查项：**
- 证书序列号在微信支付商户平台可以找到
- 格式通常是类似：`1DDE55AD3ED6A67E...`

**解决方法：**
1. 登录微信支付商户平台
2. 进入"账户中心" -> "API安全"
3. 查看"API证书"中的证书序列号

#### 4. 初始化失败

**检查项：**
- 查看服务器日志中的错误信息
- 检查 `wechatpay-node-v3` 包是否正确安装

**解决方法：**
```bash
# 重新安装依赖
cd server
npm install wechatpay-node-v3

# 检查日志
# 查看服务器启动时的日志，寻找"微信支付初始化"相关消息
```

### 诊断步骤

1. **检查环境变量**
   ```bash
   # 在服务器上执行
   node -e "require('dotenv').config(); console.log('WX_APPID:', process.env.WX_APPID ? '已配置' : '未配置'); console.log('WX_MCHID:', process.env.WX_MCHID ? '已配置' : '未配置'); console.log('WX_API_KEY:', process.env.WX_API_KEY ? '已配置' : '未配置');"
   ```

2. **检查配置接口**
   ```bash
   curl http://localhost:3000/v1/payment/config/check
   ```

3. **查看服务器日志**
   - 查找"微信支付初始化"相关消息
   - 查找错误堆栈信息

4. **测试支付接口**
   ```bash
   # 需要先登录获取 token
   curl -X POST http://localhost:3000/v1/payment/create \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"orderId": "ORDER_ID"}'
   ```

### 配置示例

完整的 `.env` 配置示例：

```env
# 微信小程序配置
WX_APPID=wx1234567890abcdef
WX_SECRET=your_secret_here

# 微信支付配置
WX_MCHID=1234567890
WX_API_KEY=your_32_char_api_key_here_12345678
WX_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----
WX_CERT_SERIAL_NO=1DDE55AD3ED6A67E1234567890ABCDEF
WX_NOTIFY_URL=https://yourdomain.com/v1/payment/notify
API_BASE_URL=https://yourdomain.com
```

### 常见错误信息

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| `微信支付配置不完整，缺少以下环境变量: WX_APPID, WX_MCHID` | 缺少必需的环境变量 | 在 `.env` 文件中添加缺失的变量 |
| `无法读取私钥文件: ENOENT: no such file or directory` | 私钥文件路径错误 | 检查文件路径是否正确，文件是否存在 |
| `微信支付实例创建失败: Invalid private key` | 私钥格式错误 | 检查私钥格式，确保是有效的 PEM 格式 |
| `微信支付服务不可用: 微信支付配置不完整` | 配置检查失败 | 按照上述步骤逐一检查配置 |

### 测试建议

1. **开发环境测试**
   - 使用微信支付沙箱环境
   - 配置沙箱环境的商户号和密钥
   - 测试金额使用 0.01 元

2. **生产环境配置**
   - 使用正式环境的商户号和密钥
   - 确保回调地址可以通过公网访问
   - 使用 HTTPS 协议

3. **日志监控**
   - 监控支付相关的错误日志
   - 记录支付回调的接收情况
   - 定期检查配置状态

### 获取帮助

如果问题仍未解决：
1. 检查服务器日志中的详细错误信息
2. 访问 `/v1/payment/config/check` 接口查看配置状态
3. 参考 [微信支付开发文档](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)
4. 参考 [WECHAT_PAYMENT.md](./WECHAT_PAYMENT.md) 完整配置指南
