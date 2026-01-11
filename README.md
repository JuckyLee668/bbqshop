# 手工烤面筋微信小程序项目

一个完整的手工烤面筋点餐系统，包含微信小程序、后端 API 和管理后台。

## 项目结构

```
miniprogram-5/
├── miniprogram/          # 微信小程序前端
│   ├── pages/           # 页面目录
│   ├── utils/           # 工具函数
│   ├── assets/          # 静态资源
│   └── app.json         # 小程序配置
├── server/              # Node.js 后端 API
│   ├── models/          # 数据模型
│   ├── routes/          # 路由
│   ├── middleware/      # 中间件
│   └── app.js           # 入口文件
├── admin/               # Vue3 管理后台
│   ├── src/
│   │   ├── views/       # 页面
│   │   ├── api/         # API 接口
│   │   └── router/      # 路由配置
│   └── package.json
└── docs/                # 项目文档
    ├── API设计文档.md
    ├── 项目目录说明.md
    └── 部署说明.md
```

## 技术栈

### 小程序
- 微信小程序原生框架
- TDesign Miniprogram 组件库
- TypeScript / JavaScript

### 后端
- Node.js + Express
- MongoDB + Mongoose
- JWT 认证

### 管理后台
- Vue 3
- Element Plus
- TypeScript
- Vite

## 快速开始

### 1. 后端服务

```bash
cd server
npm install
cp .env.example .env
# 编辑 .env 配置
npm run dev
```

### 2. 小程序

1. 使用微信开发者工具打开 `miniprogram` 目录
2. 配置 AppID（在 `project.config.json` 中）
3. 修改 `miniprogram/utils/config.js` 中的 API 地址（生产环境）
4. 编译运行

### 3. 管理后台

```bash
cd admin
npm install
# 编辑 .env.development 配置 API 地址
npm run dev
```

## 功能特性

### 用户端（小程序）
- ✅ 商品浏览和搜索
- ✅ 购物车管理（支持优惠券、商品券）
- ✅ 订单管理（支持到店自取/外卖配送）
- ✅ 地址管理
- ✅ 个人中心
- ✅ 优惠券管理（领取、使用）
- ✅ 积分商城（积分兑换优惠券、商品券）
- ✅ 商品券管理（兑换、使用）
- ✅ 特价套餐浏览
- ✅ 订单评价

### 商家端（管理后台）
- ✅ 商品管理（商品列表、新增、编辑）
- ✅ 分类管理
- ✅ 门店管理（门店信息、配送设置）
- ✅ 订单管理（订单列表、状态更新）
- ✅ 特价套餐管理
- ✅ 优惠券管理（创建、发放、统计）
- ✅ 积分商城管理（积分商品配置）
- ✅ 用户管理
- ✅ 评论管理
- ✅ 数据统计

## 文档

- [API 设计文档](./docs/API设计文档.md)
- [项目目录说明](./docs/项目目录说明.md)
- [部署说明](./docs/部署说明.md)

## 开发规范

- 代码风格：遵循各框架官方规范
- 提交规范：使用清晰的 commit message
- 分支管理：main（生产）、develop（开发）

## 许可证

ISC
