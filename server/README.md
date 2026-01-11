# 手工烤面筋小程序后端API

## 技术栈
- Node.js + Express
- MongoDB + Mongoose
- JWT 认证
- 微信小程序登录
- 微信支付（API v3）
- Multer 文件上传

## 安装依赖
```bash
npm install
```

## 配置环境变量
复制 `.env.example` 为 `.env` 并填写配置：
```bash
cp .env.example .env
```

## 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## API 基础路径
```
http://localhost:3000/v1
```

## 数据库初始化

### 初始化商家账号（管理后台登录）

创建默认商家账号（用户名：admin，密码：admin123）：
```bash
npm run init:merchant
```

或创建自定义商家账号：
```bash
npm run init:merchant:custom
```
（需要先编辑 `scripts/init-merchant-custom.js` 修改配置）

详细说明请查看 `ENV_TEMPLATE.md` 和部署文档

### 初始化示例数据

创建商品分类、商品和优惠券等示例数据：
```bash
npm run init:data
```

此脚本会创建：
- 4个商品分类（经典面筋、特色套餐、加料小食、饮品）
- 7个示例商品（包含图片、口味、辣度、加料等完整信息）
- 3张优惠券（新用户专享、满减优惠等）
- 3个积分商品（积分商城）
- 2个商品券

### 完整初始化流程

1. ✅ 创建商家账号：`npm run init:merchant`
2. ✅ 创建示例数据：`npm run init:data`
3. 启动服务：`npm run dev`

## 核心功能模块

### 用户相关
- 微信登录/注册
- 用户信息管理
- 地址管理
- 积分系统
- 积分记录查询

### 商品相关
- 商品列表/详情
- 商品分类
- 特价套餐
- 购物车管理

### 订单相关
- 订单创建
- 订单查询
- 订单状态管理
- 订单评价

### 优惠券相关
- 优惠券领取
- 优惠券使用
- 优惠券管理（商家）
- 支持满减券、折扣券、特定商品免单券

### 积分商城
- 积分商品管理
- 积分兑换优惠券
- 积分兑换商品券
- 兑换记录查询

### 商品券
- 商品券兑换
- 商品券使用
- 商品券管理

### 支付相关
- 微信支付统一下单
- 支付回调处理
- 支付状态查询

## 接口文档
详见 `docs/API设计文档.md`

## 常见问题

### 数据库数据丢失问题

如果遇到每次重启后数据库数据丢失的问题，请查看 [MONGODB_TROUBLESHOOTING.md](./MONGODB_TROUBLESHOOTING.md) 进行排查。

快速诊断数据库连接：
```bash
npm run test:db
```

常见原因：
1. MongoDB 服务未正确启动
2. 数据目录配置错误或指向临时目录
3. 权限问题导致无法写入数据

解决方案：
- 检查 MongoDB 服务状态
- 确认数据目录配置正确
- 使用云数据库（MongoDB Atlas）作为替代方案
