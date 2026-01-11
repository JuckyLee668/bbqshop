# 手工烤面筋管理后台

基于 Vue 3 + Element Plus 开发的管理后台系统。

## 技术栈
- Vue 3 (Composition API)
- Element Plus
- Vue Router
- Pinia
- Axios
- TypeScript
- Vite

## 功能模块

### 商品管理
- 商品列表（支持搜索、筛选）
- 新增商品（支持图片上传、口味/辣度/加料配置）
- 编辑商品
- 商品状态管理（上架/下架）

### 分类管理
- 分类列表
- 新增/编辑分类
- 分类排序

### 门店管理
- 门店信息配置
- 配送设置（配送费、免配送费门槛）
- 营业时间设置

### 订单管理
- 订单列表（支持状态筛选）
- 订单详情查看
- 订单状态更新（待制作/制作中/已完成/已取消）

### 活动管理
- **特价套餐管理**：创建、编辑特价套餐
- **优惠券管理**：创建优惠券、设置发放状态、查看使用统计
- **积分商城管理**：配置积分商品、设置兑换限制、关联优惠券类型

### 用户管理
- 用户列表（支持搜索）
- 用户详情查看
- 用户地址管理

### 评论管理
- 评论列表
- 评论审核
- 评论删除

### 数据统计
- 订单统计
- 销售统计
- 用户统计

## 安装依赖
```bash
npm install
```

## 开发
```bash
npm run dev
```

## 构建
```bash
npm run build
```

## API配置

### 开发环境
创建 `.env.development` 文件：
```
VITE_API_BASE_URL=http://localhost:3000/v1
```

### 生产环境
创建 `.env.production` 文件：
```
VITE_API_BASE_URL=https://your-api-domain.com/v1
```

## 登录说明

默认管理员账号：
- 用户名：`admin`
- 密码：`admin123`

⚠️ **首次登录后请立即修改密码！**

如需创建自定义账号，请使用后端脚本：
```bash
cd ../server
node scripts/init-merchant-custom.js
```

## 项目结构

```
admin/
├── src/
│   ├── api/              # API 接口封装
│   │   ├── index.ts      # Axios 配置
│   │   └── merchant.ts   # 商家 API
│   ├── views/            # 页面组件
│   │   ├── Dashboard.vue      # 数据统计
│   │   ├── Products/            # 商品管理
│   │   ├── Categories/          # 分类管理
│   │   ├── Orders/              # 订单管理
│   │   ├── Store/               # 门店管理
│   │   ├── SpecialPackages/     # 特价套餐
│   │   ├── Coupons/             # 优惠券管理
│   │   ├── PointsMall/          # 积分商城
│   │   ├── Users/               # 用户管理
│   │   └── Reviews/             # 评论管理
│   ├── layout/           # 布局组件
│   ├── router/           # 路由配置
│   └── main.ts           # 入口文件
├── package.json
└── vite.config.ts
```

## 路由说明

- `/login` - 登录页
- `/dashboard` - 数据统计
- `/products` - 商品列表
- `/products/add` - 新增商品
- `/products/edit/:id` - 编辑商品
- `/categories` - 分类管理
- `/orders` - 订单管理
- `/store` - 门店管理
- `/special-packages` - 特价套餐
- `/coupons` - 优惠券管理
- `/points-mall` - 积分商城
- `/users` - 用户管理
- `/reviews` - 评论管理

## 开发规范

- 使用 Composition API
- 组件命名：PascalCase
- 文件命名：PascalCase（组件）、kebab-case（工具文件）
- 代码风格：遵循 Vue 3 官方风格指南
