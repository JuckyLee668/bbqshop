# 手工烤面筋小程序 API 设计文档

## 1. 概述

### 1.1 文档说明
本文档描述了手工烤面筋微信小程序的后端 API 接口设计，包括接口地址、请求参数、响应格式等。

### 1.2 技术栈建议
- **后端框架**：Node.js (Express/Koa) / PHP (Laravel) / Java (Spring Boot)
- **数据库**：MySQL / MongoDB
- **缓存**：Redis
- **文件存储**：OSS / 本地存储
- **支付**：微信支付

### 1.3 基础信息
- **API 基础路径**：`https://api.example.com/v1`
- **数据格式**：JSON
- **字符编码**：UTF-8
- **请求方式**：POST / GET / PUT / DELETE

### 1.4 通用响应格式

#### 成功响应
```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

#### 错误响应
```json
{
  "code": 400,
  "message": "错误信息",
  "data": null
}
```

#### 状态码说明
- `200`：成功
- `400`：请求参数错误
- `401`：未授权
- `403`：无权限
- `404`：资源不存在
- `500`：服务器错误

---

## 2. 用户认证

### 2.1 微信登录
**接口地址**：`POST /auth/wx-login`

**请求参数**：
```json
{
  "code": "微信登录凭证code",
  "userInfo": {
    "nickName": "用户昵称",
    "avatarUrl": "头像URL"
  }
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "JWT token",
    "userInfo": {
      "id": 1,
      "openid": "openid",
      "nickName": "用户昵称",
      "avatarUrl": "头像URL",
      "phone": "手机号"
    }
  }
}
```

### 2.2 绑定手机号
**接口地址**：`POST /auth/bind-phone`

**请求参数**：
```json
{
  "encryptedData": "加密数据",
  "iv": "初始向量"
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "phone": "138****8888"
  }
}
```

---

## 3. 首页相关

### 3.1 获取首页数据
**接口地址**：`GET /home/index`

**请求参数**：无

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "storeInfo": {
      "id": 1,
      "name": "夜市烤面筋",
      "address": "夜市美食街A区12号摊位",
      "status": "营业中",
      "businessHours": "09:00-23:00",
      "deliveryRange": 3,
      "latitude": 39.908823,
      "longitude": 116.397470
    },
    "recommend": {
      "id": 1,
      "name": "招牌烤面筋套餐",
      "desc": "5串面筋+1串豆皮+1串鱼豆腐",
      "price": 28,
      "oldPrice": 35,
      "image": "图片URL",
      "tag": "限时特价"
    },
    "hotProducts": [
      {
        "id": 1,
        "name": "原味烤面筋",
        "desc": "经典原味，Q弹有嚼劲",
        "price": 5,
        "image": "图片URL",
        "isFavorite": true
      }
    ],
    "promotions": [
      {
        "id": 1,
        "title": "新用户专享",
        "desc": "首单立减5元，满30减10",
        "type": "new_user"
      }
    ]
  }
}
```

---

## 4. 商品相关

### 4.1 获取商品列表
**接口地址**：`GET /products`

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| categoryId | int | 否 | 分类ID，0表示全部 |
| page | int | 否 | 页码，默认1 |
| pageSize | int | 否 | 每页数量，默认10 |
| keyword | string | 否 | 搜索关键词 |

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "原味烤面筋",
        "desc": "经典原味，Q弹有嚼劲，现烤现卖",
        "price": 5,
        "oldPrice": 6,
        "image": "图片URL",
        "stock": 128,
        "tag": "限时特价",
        "categoryId": 1,
        "categoryName": "原味"
      }
    ],
    "total": 20,
    "page": 1,
    "pageSize": 10
  }
}
```

### 4.2 获取商品详情
**接口地址**：`GET /products/:id`

**请求参数**：路径参数 `id`

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "name": "原味烤面筋",
    "desc": "精选优质面筋，采用传统工艺制作",
    "price": 5,
    "oldPrice": 6,
    "images": ["图片URL1", "图片URL2"],
    "stock": 128,
    "status": "有货",
    "flavors": [
      {"value": "original", "label": "原味"},
      {"value": "spicy", "label": "香辣"},
      {"value": "cumin", "label": "孜然"}
    ],
    "spicyLevels": [
      {"value": "none", "label": "不辣"},
      {"value": "mild", "label": "微辣"},
      {"value": "medium", "label": "中辣"},
      {"value": "hot", "label": "重辣"}
    ],
    "addons": [
      {
        "id": 1,
        "name": "加香菜",
        "price": 1,
        "image": "图片URL"
      }
    ]
  }
}
```

### 4.3 获取商品分类
**接口地址**：`GET /categories`

**请求参数**：无

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 0,
      "name": "全部",
      "sort": 0
    },
    {
      "id": 1,
      "name": "原味",
      "sort": 1
    }
  ]
}
```

---

## 5. 购物车相关

### 5.1 获取购物车
**接口地址**：`GET /cart`

**请求参数**：无（需要 token）

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "productId": 1,
        "productName": "原味烤面筋",
        "price": 5,
        "quantity": 2,
        "spec": "原味 / 中辣 / 加葱花",
        "image": "图片URL",
        "checked": true
      }
    ],
    "totalPrice": 15,
    "selectedCount": 2
  }
}
```

### 5.2 添加商品到购物车
**接口地址**：`POST /cart/add`

**请求参数**：
```json
{
  "productId": 1,
  "quantity": 1,
  "flavor": "original",
  "spicy": "medium",
  "addons": [2],
  "spec": "原味 / 中辣 / 加葱花"
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "cartItemId": 1
  }
}
```

### 5.3 更新购物车商品数量
**接口地址**：`PUT /cart/:id`

**请求参数**：
```json
{
  "quantity": 3
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

### 5.4 删除购物车商品
**接口地址**：`DELETE /cart/:id`

**请求参数**：路径参数 `id`

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

### 5.5 清空购物车
**接口地址**：`DELETE /cart/clear`

**请求参数**：无

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

---

## 6. 订单相关

### 6.1 创建订单
**接口地址**：`POST /orders`

**请求参数**：
```json
{
  "cartItemIds": [1, 2],
  "deliveryType": "pickup",
  "deliveryAddressId": 1,
  "remark": "不要香菜",
  "couponId": 0
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "orderId": "20240101123456",
    "totalPrice": 15,
    "payParams": {
      "timeStamp": "1609459200",
      "nonceStr": "随机字符串",
      "package": "prepay_id=xxx",
      "signType": "RSA",
      "paySign": "签名"
    }
  }
}
```

### 6.2 获取订单列表
**接口地址**：`GET /orders`

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| status | string | 否 | 订单状态：pending/making/completed/cancelled |
| page | int | 否 | 页码 |
| pageSize | int | 否 | 每页数量 |

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "orderNo": "20240101123456",
        "status": "pending",
        "statusText": "待制作",
        "totalPrice": 15,
        "deliveryType": "pickup",
        "deliveryTypeText": "到店自取",
        "createTime": "2024-01-01 12:30:00",
        "items": [
          {
            "productName": "原味烤面筋",
            "quantity": 2,
            "price": 5,
            "spec": "原味 / 中辣 / 加葱花"
          }
        ]
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 10
  }
}
```

### 6.3 获取订单详情
**接口地址**：`GET /orders/:id`

**请求参数**：路径参数 `id` 或 `orderNo`

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "orderNo": "20240101123456",
    "status": "making",
    "statusText": "制作中",
    "totalPrice": 15,
    "deliveryType": "pickup",
    "deliveryAddress": null,
    "remark": "不要香菜",
    "createTime": "2024-01-01 12:30:00",
    "items": [
      {
        "productName": "原味烤面筋",
        "quantity": 2,
        "price": 5,
        "spec": "原味 / 中辣 / 加葱花",
        "image": "图片URL"
      }
    ],
    "merchantInfo": {
      "name": "夜市烤面筋",
      "phone": "138****8888"
    }
  }
}
```

### 6.4 取消订单
**接口地址**：`PUT /orders/:id/cancel`

**请求参数**：
```json
{
  "reason": "用户主动取消"
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

### 6.5 确认收货/完成订单
**接口地址**：`PUT /orders/:id/complete`

**请求参数**：无

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

### 6.6 订单支付
**接口地址**：`POST /orders/:id/pay`

**请求参数**：
```json
{
  "paymentType": "wechat"
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "payParams": {
      "timeStamp": "1609459200",
      "nonceStr": "随机字符串",
      "package": "prepay_id=xxx",
      "signType": "RSA",
      "paySign": "签名"
    }
  }
}
```

### 6.7 支付回调
**接口地址**：`POST /orders/pay-callback`

**请求参数**：微信支付回调数据

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

---

## 7. 地址相关

### 7.1 获取地址列表
**接口地址**：`GET /addresses`

**请求参数**：无

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "张三",
      "phone": "138****8888",
      "address": "北京市朝阳区xxx街道xxx号",
      "detail": "详细地址",
      "latitude": 39.908823,
      "longitude": 116.397470,
      "isDefault": true
    }
  ]
}
```

### 7.2 添加地址
**接口地址**：`POST /addresses`

**请求参数**：
```json
{
  "name": "张三",
  "phone": "13800138000",
  "address": "北京市朝阳区xxx街道xxx号",
  "detail": "详细地址",
  "latitude": 39.908823,
  "longitude": 116.397470,
  "isDefault": false
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1
  }
}
```

### 7.3 更新地址
**接口地址**：`PUT /addresses/:id`

**请求参数**：同添加地址

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

### 7.4 删除地址
**接口地址**：`DELETE /addresses/:id`

**请求参数**：路径参数 `id`

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

---

## 8. 用户相关

### 8.1 获取用户信息
**接口地址**：`GET /user/info`

**请求参数**：无（需要 token）

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "nickName": "微信用户",
    "avatarUrl": "头像URL",
    "phone": "138****8888",
    "orderCount": 12,
    "totalConsumption": 368,
    "points": 128
  }
}
```

### 8.2 更新用户信息
**接口地址**：`PUT /user/info`

**请求参数**：
```json
{
  "nickName": "新昵称",
  "avatarUrl": "新头像URL"
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

---

## 9. 商家端 API

### 9.1 商家登录
**接口地址**：`POST /merchant/login`

**请求参数**：
```json
{
  "username": "商家账号",
  "password": "密码"
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "JWT token",
    "merchantInfo": {
      "id": 1,
      "name": "夜市烤面筋",
      "username": "商家账号"
    }
  }
}
```

### 9.2 获取统计数据
**接口地址**：`GET /merchant/statistics`

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| date | string | 否 | 日期，格式：YYYY-MM-DD，默认今天 |

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "todayOrders": 28,
    "todayRevenue": 856,
    "yesterdayOrders": 25,
    "yesterdayRevenue": 792,
    "orderGrowth": 12,
    "revenueGrowth": 8,
    "newOrders": 3
  }
}
```

### 9.3 获取订单列表（商家）
**接口地址**：`GET /merchant/orders`

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| status | string | 否 | 订单状态 |
| page | int | 否 | 页码 |
| pageSize | int | 否 | 每页数量 |

**响应数据**：同用户端订单列表

### 9.4 接单
**接口地址**：`PUT /merchant/orders/:id/accept`

**请求参数**：无

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

### 9.5 完成订单
**接口地址**：`PUT /merchant/orders/:id/complete`

**请求参数**：无

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

### 9.6 获取商品列表（商家）
**接口地址**：`GET /merchant/products`

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| status | string | 否 | 状态：on_sale/off_sale |
| page | int | 否 | 页码 |
| pageSize | int | 否 | 每页数量 |

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "原味烤面筋",
        "price": 5,
        "stock": 128,
        "status": "on_sale",
        "image": "图片URL",
        "categoryId": 1
      }
    ],
    "total": 10
  }
}
```

### 9.7 创建商品
**接口地址**：`POST /merchant/products`

**请求参数**：
```json
{
  "name": "原味烤面筋",
  "desc": "商品描述",
  "price": 5,
  "oldPrice": 6,
  "stock": 128,
  "categoryId": 1,
  "images": ["图片URL1", "图片URL2"],
  "flavors": ["original", "spicy"],
  "spicyLevels": ["none", "mild", "medium", "hot"],
  "addons": [
    {
      "name": "加香菜",
      "price": 1
    }
  ]
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1
  }
}
```

### 9.8 更新商品
**接口地址**：`PUT /merchant/products/:id`

**请求参数**：同创建商品

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

### 9.9 上下架商品
**接口地址**：`PUT /merchant/products/:id/status`

**请求参数**：
```json
{
  "status": "off_sale"
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

### 9.10 获取分类列表（商家）
**接口地址**：`GET /merchant/categories`

**请求参数**：无

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "原味",
      "sort": 1
    }
  ]
}
```

### 9.11 创建分类
**接口地址**：`POST /merchant/categories`

**请求参数**：
```json
{
  "name": "原味",
  "sort": 1
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1
  }
}
```

### 9.12 更新分类
**接口地址**：`PUT /merchant/categories/:id`

**请求参数**：
```json
{
  "name": "新分类名",
  "sort": 2
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

### 9.13 获取门店信息
**接口地址**：`GET /merchant/store`

**请求参数**：无

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "name": "夜市烤面筋",
    "address": "夜市美食街A区12号摊位",
    "businessHours": "09:00-23:00",
    "deliveryRange": 3,
    "status": "open",
    "latitude": 39.908823,
    "longitude": 116.397470,
    "phone": "138****8888"
  }
}
```

### 9.14 更新门店信息
**接口地址**：`PUT /merchant/store`

**请求参数**：
```json
{
  "name": "夜市烤面筋",
  "address": "夜市美食街A区12号摊位",
  "businessHours": "09:00-23:00",
  "deliveryRange": 3,
  "status": "open",
  "latitude": 39.908823,
  "longitude": 116.397470,
  "phone": "13800138000"
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

---

## 10. 其他功能

### 10.1 上传图片
**接口地址**：`POST /upload/image`

**请求参数**：multipart/form-data
- `file`: 图片文件

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "url": "图片URL"
  }
}
```

### 10.2 意见反馈
**接口地址**：`POST /feedback`

**请求参数**：
```json
{
  "content": "反馈内容",
  "images": ["图片URL1", "图片URL2"],
  "contact": "联系方式"
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

### 10.3 获取优惠券列表
**接口地址**：`GET /coupons`

**请求参数**：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| status | string | 否 | 状态：available/used/expired |

**响应数据**：
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "新用户专享",
      "desc": "首单立减5元",
      "type": "discount",
      "value": 5,
      "minAmount": 0,
      "status": "available",
      "expireTime": "2024-12-31 23:59:59"
    }
  ]
}
```

---

## 11. 数据库设计建议

### 11.1 用户表 (users)
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(100) UNIQUE NOT NULL,
  unionid VARCHAR(100),
  nick_name VARCHAR(100),
  avatar_url VARCHAR(500),
  phone VARCHAR(20),
  points INT DEFAULT 0,
  total_consumption DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 11.2 商品表 (products)
```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  desc TEXT,
  price DECIMAL(10,2) NOT NULL,
  old_price DECIMAL(10,2),
  stock INT DEFAULT 0,
  category_id INT,
  status ENUM('on_sale', 'off_sale') DEFAULT 'on_sale',
  images JSON,
  flavors JSON,
  spicy_levels JSON,
  sort INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 11.3 订单表 (orders)
```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'paid', 'making', 'completed', 'cancelled') DEFAULT 'pending',
  delivery_type ENUM('pickup', 'delivery') DEFAULT 'pickup',
  delivery_address_id INT,
  remark TEXT,
  coupon_id INT,
  pay_time TIMESTAMP NULL,
  complete_time TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 11.4 订单商品表 (order_items)
```sql
CREATE TABLE order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  spec TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 11.5 购物车表 (cart)
```sql
CREATE TABLE cart (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  flavor VARCHAR(50),
  spicy VARCHAR(50),
  addons JSON,
  spec TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 12. 安全建议

1. **Token 认证**：所有需要用户身份的接口都需要在 Header 中携带 Token
2. **参数校验**：所有输入参数都需要进行格式和合法性校验
3. **SQL 注入防护**：使用参数化查询，避免 SQL 注入
4. **XSS 防护**：对用户输入进行转义处理
5. **支付安全**：支付相关接口需要签名验证
6. **接口限流**：对高频接口进行限流保护
7. **数据加密**：敏感数据（如手机号）需要加密存储

---

## 13. 部署建议

1. **HTTPS**：所有 API 接口必须使用 HTTPS
2. **CORS**：配置跨域访问策略
3. **日志**：记录所有 API 请求和错误日志
4. **监控**：设置接口响应时间、错误率等监控指标
5. **备份**：定期备份数据库
6. **缓存**：对热点数据使用 Redis 缓存

---

## 14. 版本更新

- **v1.0**：基础功能（商品展示、下单支付、商家管理）
- **v2.0**：会员系统、优惠活动、数据分析
- **v3.0**：连锁多门店、分账系统
