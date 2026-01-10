# 部署检查清单

使用此清单确保部署过程完整无误。

## 📋 部署前准备

### 服务器环境
- [ ] 服务器已准备（Linux Ubuntu/CentOS）
- [ ] 已配置 SSH 密钥登录
- [ ] Node.js 已安装（版本 >= 16.x）
- [ ] MongoDB 已安装并运行（或使用云数据库）
- [ ] Nginx 已安装并运行
- [ ] PM2 已全局安装
- [ ] 防火墙已配置（开放 22, 80, 443 端口）

### 域名和证书
- [ ] 域名已购买并解析到服务器 IP
- [ ] SSL 证书已申请（Let's Encrypt 或付费证书）
- [ ] SSL 证书已安装到服务器

### 微信小程序配置
- [ ] 微信小程序 AppID 已获取
- [ ] 微信小程序 AppSecret 已获取
- [ ] 服务器域名已在小程序后台配置

### 代码准备
- [ ] 代码已上传到服务器
- [ ] Git 仓库已配置（如果使用 Git）

## 🔧 部署步骤

### 1. 项目配置
- [ ] 已进入项目目录：`cd /var/www/noodles-api`
- [ ] `.env` 文件已创建并配置
- [ ] 所有环境变量已正确填写
- [ ] `JWT_SECRET` 已生成并设置
- [ ] `WX_APPID` 和 `WX_SECRET` 已配置
- [ ] `MONGODB_URI` 已配置
- [ ] `ALLOWED_ORIGINS` 已配置（生产环境）

### 2. 依赖和目录
- [ ] 执行 `npm install --production` 安装依赖
- [ ] `uploads` 目录已创建：`mkdir -p uploads`
- [ ] `logs` 目录已创建：`mkdir -p logs`
- [ ] 目录权限已设置：`chmod 755 uploads logs`

### 3. 数据库初始化
- [ ] MongoDB 数据库连接测试成功
- [ ] 已执行 `npm run init:full` 初始化数据（可选）
- [ ] 商户账号已创建并测试登录

### 4. PM2 配置
- [ ] `ecosystem.config.js` 已配置
- [ ] 已执行 `pm2 start ecosystem.config.js --env production`
- [ ] 应用状态为 `online`
- [ ] 已执行 `pm2 startup` 设置开机自启
- [ ] 已执行 `pm2 save` 保存配置

### 5. Nginx 配置
- [ ] Nginx 配置文件已创建：`/etc/nginx/sites-available/noodles-api`
- [ ] 已创建软链接：`ln -s /etc/nginx/sites-available/noodles-api /etc/nginx/sites-enabled/`
- [ ] 已测试配置：`nginx -t`
- [ ] 已重载 Nginx：`systemctl reload nginx`
- [ ] SSL 证书路径已正确配置

### 6. SSL 证书
- [ ] SSL 证书已安装
- [ ] 证书路径已在 Nginx 配置中设置
- [ ] HTTP 自动重定向到 HTTPS
- [ ] SSL 证书自动续期已配置

### 7. 防火墙
- [ ] SSH 端口已开放（22）
- [ ] HTTP 端口已开放（80）
- [ ] HTTPS 端口已开放（443）
- [ ] 不必要的端口已关闭

## ✅ 部署后测试

### API 测试
- [ ] 健康检查接口可访问：`https://api.yourdomain.com/health`
- [ ] 返回 `{"status":"ok","message":"API服务正常运行"}`
- [ ] 静态文件可访问：`https://api.yourdomain.com/uploads/test.jpg`
- [ ] CORS 配置正确（小程序可访问）

### 小程序测试
- [ ] 小程序登录功能正常
- [ ] 获取商品列表正常
- [ ] 购物车功能正常
- [ ] 下单功能正常
- [ ] 图片上传功能正常

### 管理后台测试
- [ ] 商户登录正常
- [ ] 订单管理功能正常
- [ ] 商品管理功能正常
- [ ] 数据统计功能正常

### 性能测试
- [ ] 响应时间正常（< 500ms）
- [ ] 并发访问测试通过
- [ ] 日志记录正常
- [ ] PM2 监控正常

## 🔍 监控和维护

### 日志检查
- [ ] PM2 日志路径正确：`pm2 logs`
- [ ] Nginx 访问日志正常：`/var/log/nginx/noodles-api-access.log`
- [ ] Nginx 错误日志正常：`/var/log/nginx/noodles-api-error.log`
- [ ] 应用错误日志正常：`./logs/err.log`

### 监控设置
- [ ] PM2 监控已设置：`pm2 monit`
- [ ] 系统资源监控已配置
- [ ] 数据库备份计划已设置
- [ ] 日志轮转已配置（可选）

## 🔐 安全检查

- [ ] `.env` 文件权限已设置：`chmod 600 .env`
- [ ] `.env` 文件已添加到 `.gitignore`
- [ ] SSH 密钥登录已启用
- [ ] 密码登录已禁用（如果可能）
- [ ] 防火墙已启用
- [ ] 定期更新计划已设置

## 📝 文档和备份

- [ ] 部署文档已更新
- [ ] 数据库备份脚本已创建
- [ ] 恢复流程已文档化
- [ ] 紧急联系人信息已记录

## 🆘 故障处理准备

- [ ] 已了解如何查看日志
- [ ] 已了解如何重启服务
- [ ] 已了解如何回滚代码
- [ ] 已了解如何恢复数据库

---

**部署完成后，请保存以下信息：**
- 服务器 IP 地址
- 域名和 SSL 证书到期时间
- 数据库连接信息（加密存储）
- PM2 管理命令
- 紧急恢复流程

**部署日期：** _______________
**部署人员：** _______________
**验证人员：** _______________
