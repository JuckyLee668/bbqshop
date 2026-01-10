# 服务器部署指南

本指南将帮助您将后台 API 服务部署到生产服务器。

## 📋 前置要求

- 服务器系统：Linux (Ubuntu/CentOS 推荐)
- Node.js 版本：>= 16.x (推荐使用 18.x LTS)
- MongoDB 数据库：>= 4.4
- 域名和 SSL 证书（HTTPS 必需）
- Nginx（反向代理）
- PM2（进程管理）

## 🚀 部署步骤

### 1. 服务器环境准备

#### 1.1 更新系统
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

#### 1.2 安装 Node.js
```bash
# 使用 nvm 安装（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 或使用 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 1.3 安装 MongoDB
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# 启动 MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

**或使用云数据库（推荐）：**
- MongoDB Atlas (免费版可用)
- 阿里云 MongoDB
- 腾讯云 MongoDB

#### 1.4 安装 Nginx
```bash
# Ubuntu/Debian
sudo apt install nginx -y

# CentOS/RHEL
sudo yum install nginx -y

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 1.5 安装 PM2
```bash
sudo npm install -g pm2
```

### 2. 部署应用

#### 2.1 创建应用目录
```bash
sudo mkdir -p /var/www/noodles-api
sudo chown -R $USER:$USER /var/www/noodles-api
cd /var/www/noodles-api
```

#### 2.2 上传代码
```bash
# 方式1: 使用 Git
git clone your-repository-url .
git checkout main  # 或你的主分支

# 方式2: 使用 scp 上传
# scp -r server/* user@server:/var/www/noodles-api/
```

#### 2.3 安装依赖
```bash
cd /var/www/noodles-api
npm install --production
```

#### 2.4 创建环境变量文件
```bash
cp .env.example .env
nano .env  # 或使用 vim
```

**配置 .env 文件：**
```env
# 服务器配置
PORT=3000
NODE_ENV=production

# MongoDB 数据库连接
MONGODB_URI=mongodb://username:password@host:port/database
# 或本地: mongodb://localhost:27017/noodles_db

# JWT 密钥（必须修改为随机字符串）
JWT_SECRET=your-random-secret-key-here-min-32-chars

# 微信小程序配置
WX_APPID=wx你的appid
WX_SECRET=你的secret

# CORS 允许的源（生产环境建议指定具体域名）
ALLOWED_ORIGINS=https://your-domain.com,https://admin.your-domain.com

# 文件上传配置
MAX_FILE_SIZE=5242880
```

**生成 JWT_SECRET：**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2.5 创建必要的目录
```bash
mkdir -p uploads logs
chmod 755 uploads logs
```

#### 2.6 初始化数据（可选）
```bash
# 初始化商户和管理数据
npm run init:full
```

### 3. 配置 PM2

#### 3.1 使用配置文件启动
```bash
pm2 start ecosystem.config.js --env production
```

#### 3.2 设置开机自启
```bash
pm2 startup
# 按提示执行生成的命令
pm2 save
```

#### 3.3 PM2 常用命令
```bash
pm2 list              # 查看进程列表
pm2 logs              # 查看日志
pm2 restart noodles-api  # 重启应用
pm2 stop noodles-api     # 停止应用
pm2 delete noodles-api   # 删除应用
pm2 monit             # 监控面板
```

### 4. 配置 Nginx 反向代理

#### 4.1 创建 Nginx 配置
```bash
sudo nano /etc/nginx/sites-available/noodles-api
```

#### 4.2 添加配置内容
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # 替换为您的域名

    # HTTP 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;  # 替换为您的域名

    # SSL 证书配置（使用 Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 上传文件大小限制
    client_max_body_size 10M;

    # 静态文件服务
    location /uploads {
        alias /var/www/noodles-api/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API 代理
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 健康检查
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

#### 4.3 启用配置
```bash
sudo ln -s /etc/nginx/sites-available/noodles-api /etc/nginx/sites-enabled/
sudo nginx -t  # 测试配置
sudo systemctl reload nginx
```

### 5. 配置 SSL 证书（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书（Nginx 插件会自动配置）
sudo certbot --nginx -d api.yourdomain.com

# 自动续期（已自动配置）
sudo certbot renew --dry-run
```

### 6. 配置防火墙

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# 或 firewalld (CentOS)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 7. 小程序配置

在微信公众平台配置服务器域名：
1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 开发 -> 开发管理 -> 开发设置
3. 服务器域名配置：
   - request合法域名：`https://api.yourdomain.com`
   - uploadFile合法域名：`https://api.yourdomain.com`
   - downloadFile合法域名：`https://api.yourdomain.com`

## 🔄 更新部署

```bash
cd /var/www/noodles-api
git pull origin main
npm install --production
pm2 restart noodles-api
```

## 📊 监控和维护

### 查看日志
```bash
# PM2 日志
pm2 logs noodles-api

# Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MongoDB 日志
sudo tail -f /var/log/mongodb/mongod.log
```

### 性能监控
```bash
pm2 monit              # PM2 监控面板
pm2 status             # 查看状态
htop                   # 系统资源监控
```

### 备份数据库
```bash
# MongoDB 备份
mongodump --uri="mongodb://localhost:27017/noodles_db" --out=/backup/$(date +%Y%m%d)

# 恢复
mongorestore --uri="mongodb://localhost:27017/noodles_db" /backup/20240101
```

## 🛠️ 故障排查

### 应用无法启动
1. 检查环境变量：`cat .env`
2. 检查端口占用：`sudo lsof -i :3000`
3. 查看 PM2 日志：`pm2 logs noodles-api --err`
4. 检查 MongoDB 连接

### 502 Bad Gateway
1. 检查应用是否运行：`pm2 status`
2. 检查 Nginx 配置：`sudo nginx -t`
3. 查看应用日志：`pm2 logs`

### 数据库连接失败
1. 检查 MongoDB 服务：`sudo systemctl status mongod`
2. 检查连接字符串是否正确
3. 检查防火墙规则

## 🔐 安全建议

1. **修改默认端口**（可选）
2. **定期更新系统和依赖**
3. **使用强密码和密钥**
4. **限制 SSH 访问**（使用密钥认证）
5. **定期备份数据**
6. **监控异常日志**
7. **使用 HTTPS 加密通信**
8. **限制文件上传大小和类型**

## 📝 检查清单

部署前确认：
- [ ] 服务器环境已安装（Node.js, MongoDB, Nginx）
- [ ] 代码已上传到服务器
- [ ] 环境变量已正确配置
- [ ] 依赖已安装
- [ ] 目录权限已设置
- [ ] PM2 已配置并启动
- [ ] Nginx 已配置反向代理
- [ ] SSL 证书已安装
- [ ] 防火墙已配置
- [ ] 小程序域名已配置
- [ ] 数据库已初始化
- [ ] 测试 API 接口可访问

## 🆘 需要帮助？

如遇问题，请检查：
1. 应用日志：`pm2 logs`
2. Nginx 日志：`/var/log/nginx/error.log`
3. 系统日志：`journalctl -xe`

---

**部署完成后，记得测试以下接口：**
- 健康检查：`https://api.yourdomain.com/health`
- 小程序登录：`POST https://api.yourdomain.com/v1/auth/wx-login`
