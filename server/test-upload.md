# 上传 API 测试指南

本文档介绍如何测试上传 API 功能。

## API 端点

- **上传图片 (商家)**: `POST /v1/upload/image`
- **上传头像 (用户)**: `POST /v1/upload/avatar`
- **通用上传 (用户)**: `POST /v1/upload/`

## 前置条件

1. 确保服务器正在运行
2. 获取商家认证 Token（用于 `/upload/image`）
3. 准备一张测试图片（jpg, jpeg, png, gif 格式，小于 5MB）

## 方法一：使用测试脚本（推荐）

### 1. 赋予脚本执行权限

```bash
chmod +x test-upload.sh
```

### 2. 获取商家 Token

```bash
# 替换为实际的用户名和密码
curl -X POST http://localhost:3000/v1/merchant/login \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
```

从响应中复制 `token` 字段的值。

### 3. 运行测试脚本

```bash
# 本地测试
./test-upload.sh http://localhost:3000/v1 "your_token_here" test.png

# 生产环境测试（替换为实际域名）
./test-upload.sh https://api.yourdomain.com/v1 "your_token_here" test.png
```

## 方法二：使用 curl 手动测试

### 1. 上传图片

```bash
curl -X POST http://localhost:3000/v1/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@/path/to/your/image.png" \
  -v
```

### 2. 检查响应

成功响应示例：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "url": "/uploads/1768049752821-52500790.png"
  }
}
```

### 3. 验证图片可访问

```bash
# 测试图片 URL（根据实际环境调整）
curl -I http://localhost:3000/uploads/1768049752821-52500790.png

# 或在浏览器中打开
# http://localhost:3000/uploads/1768049752821-52500790.png
```

## 方法三：使用 Postman 测试

1. **创建新请求**
   - 方法: `POST`
   - URL: `http://localhost:3000/v1/upload/image`

2. **设置 Headers**
   - `Authorization`: `Bearer YOUR_TOKEN_HERE`

3. **设置 Body**
   - 选择 `form-data`
   - 添加字段 `file`，类型选择 `File`
   - 选择要上传的图片文件

4. **发送请求**
   - 点击 Send
   - 检查响应中的 `data.url`

5. **验证图片**
   - 在浏览器中访问返回的图片 URL

## Nginx 配置检查

如果使用 Nginx 反向代理，确保配置正确：

### 1. 检查静态文件路径

```nginx
location /uploads {
    alias /var/www/noodles-api/uploads;  # 确保路径正确
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

**重要**: 确保 `alias` 路径与实际项目中的 `uploads` 目录路径一致。

### 2. 检查文件权限

```bash
# 检查上传目录权限
ls -la /var/www/noodles-api/uploads

# 如果权限不正确，设置权限
sudo chown -R www-data:www-data /var/www/noodles-api/uploads
sudo chmod -R 755 /var/www/noodles-api/uploads
```

### 3. 检查文件大小限制

确保 Nginx 配置允许上传足够大的文件：

```nginx
client_max_body_size 10M;  # 至少 10MB
```

## 常见问题排查

### 问题 1: 返回 401 未授权

**原因**: Token 无效或已过期

**解决**:
```bash
# 重新登录获取新 Token
curl -X POST http://localhost:3000/v1/merchant/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"your_username","password":"your_password"}'
```

### 问题 2: 返回 400 没有上传文件

**原因**: 
- 字段名不是 `file`
- Content-Type 不是 `multipart/form-data`

**解决**: 确保使用 `-F "file=@..."` (curl) 或 `form-data` (Postman)

### 问题 3: 上传成功但图片无法访问

**可能原因**:
1. Nginx 静态文件路径配置错误
2. 文件权限问题
3. 路径不匹配

**排查步骤**:

```bash
# 1. 检查文件是否存在
ls -la /var/www/noodles-api/uploads/

# 2. 检查 Nginx 配置中的路径
# 实际项目路径可能在: /path/to/project/server/uploads
# 需要确保 Nginx alias 指向正确路径

# 3. 检查文件权限
sudo chmod 644 /var/www/noodles-api/uploads/*.png

# 4. 检查 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 问题 4: 文件大小超限

**原因**: 文件超过 5MB 限制（或 Nginx 的 `client_max_body_size`）

**解决**:
- 减小文件大小，或
- 增加限制（在 `server/routes/upload.js` 和 Nginx 配置中）

## 验证完整流程

### 1. 测试上传接口

```bash
# 获取 Token
TOKEN=$(curl -s -X POST http://localhost:3000/v1/merchant/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"your_username","password":"your_password"}' | \
  jq -r '.data.token')

# 上传图片
RESPONSE=$(curl -s -X POST http://localhost:3000/v1/upload/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.png")

echo $RESPONSE | jq '.'

# 提取图片 URL
IMAGE_URL=$(echo $RESPONSE | jq -r '.data.url')
echo "图片 URL: $IMAGE_URL"
```

### 2. 测试图片访问

```bash
# 本地测试
curl -I http://localhost:3000$IMAGE_URL

# 生产环境测试（如果使用 Nginx）
curl -I https://api.yourdomain.com$IMAGE_URL
```

### 3. 验证数据库

检查图片是否保存在数据库中（如果是商品图片）:

```bash
# 连接到 MongoDB（如果安装了 mongo 客户端）
mongo noodles_db --eval "db.products.find({images: /$IMAGE_URL/})"
```

## 自动化测试脚本

可以创建一个简单的 Node.js 测试脚本：

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
  try {
    // 1. 登录获取 Token
    const loginRes = await axios.post('http://localhost:3000/v1/merchant/login', {
      username: 'your_username',
      password: 'your_password'
    });
    const token = loginRes.data.data.token;
    
    // 2. 上传图片
    const form = new FormData();
    form.append('file', fs.createReadStream('test.png'));
    
    const uploadRes = await axios.post(
      'http://localhost:3000/v1/upload/image',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('上传成功:', uploadRes.data);
    const imageUrl = uploadRes.data.data.url;
    
    // 3. 验证图片可访问
    const imageRes = await axios.get(`http://localhost:3000${imageUrl}`, {
      responseType: 'stream'
    });
    console.log('图片可访问，状态码:', imageRes.status);
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

testUpload();
```

运行:
```bash
node test-upload.js
```
