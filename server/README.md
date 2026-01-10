# 手工烤面筋小程序后端API

## 技术栈
- Node.js + Express
- MongoDB + Mongoose
- JWT 认证
- 微信小程序登录

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

详细说明请查看 `管理后台登录账号初始化说明.txt`

### 初始化示例数据

创建商品分类、商品和优惠券等示例数据：
```bash
npm run init:data
```

此脚本会创建：
- 4个商品分类（经典面筋、特色套餐、加料小食、饮品）
- 7个示例商品（包含图片、口味、辣度、加料等完整信息）
- 3张优惠券（新用户专享、满减优惠等）

### 完整初始化流程

1. ✅ 创建商家账号：`npm run init:merchant`
2. ✅ 创建示例数据：`npm run init:data`
3. 启动服务：`npm run dev`

## 接口文档
详见 `docs/API设计文档.md`
