# 微信支付接入说明

## 概述

本项目已集成微信支付功能，支持小程序支付。支付流程如下：

1. 用户在小程序中创建订单
2. 跳转到支付页面
3. 调用 `/v1/payment/create` 接口创建支付订单
4. 调用微信支付 API 发起支付
5. 微信支付完成后，通过回调接口更新订单状态

## 配置步骤

### 1. 开通微信支付

1. 在[微信支付商户平台](https://pay.weixin.qq.com/)注册商户号
2. 完成企业认证和资质审核
3. 获取以下信息：
   - 商户号（mchid）
   - API v3 密钥（32位字符串）
   - 商户私钥（apiclient_key.pem）
   - 证书序列号

### 2. 配置环境变量

在 `.env` 文件中添加以下配置：

```env
# 微信支付商户号
WX_MCHID=你的商户号

# 微信支付 API v3 密钥（32位字符串）
WX_API_KEY=你的API密钥

# 商户私钥
# 方式1：直接填写私钥内容（推荐用于开发环境）
WX_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n你的私钥内容\n-----END PRIVATE KEY-----

# 方式2：填写私钥文件路径（推荐用于生产环境）
# WX_PRIVATE_KEY=file:///path/to/apiclient_key.pem

# 证书序列号
WX_CERT_SERIAL_NO=你的证书序列号

# 微信支付平台证书公钥（可选，用于验证回调）
# WX_PUBLIC_KEY=-----BEGIN CERTIFICATE-----\n公钥内容\n-----END CERTIFICATE-----

# 支付回调地址（可选，默认使用 API_BASE_URL + /v1/payment/notify）
# WX_NOTIFY_URL=https://yourdomain.com/v1/payment/notify

# API 基础地址（用于生成回调地址）
# API_BASE_URL=https://yourdomain.com
```

### 3. 配置支付回调地址

在微信支付商户平台配置支付回调地址：
- 回调地址：`https://yourdomain.com/v1/payment/notify`
- 确保该地址可以通过公网访问

## API 接口说明

### 1. 创建支付订单

**接口地址：** `POST /v1/payment/create`

**请求头：**
```
Authorization: Bearer {token}
```

**请求体：**
```json
{
  "orderId": "订单ID"
}
```

**响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "orderId": "订单ID",
    "orderNo": "订单号",
    "payParams": {
      "timeStamp": "时间戳",
      "nonceStr": "随机字符串",
      "package": "prepay_id=xxx",
      "signType": "RSA",
      "paySign": "签名"
    }
  }
}
```

### 2. 查询支付状态

**接口地址：** `GET /v1/payment/query/:orderId`

**请求头：**
```
Authorization: Bearer {token}
```

**响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "orderId": "订单ID",
    "orderNo": "订单号",
    "status": "paid",
    "payTime": "支付时间",
    "paymentInfo": {
      "tradeState": "SUCCESS",
      "tradeStateDesc": "支付成功"
    }
  }
}
```

### 3. 支付回调接口

**接口地址：** `POST /v1/payment/notify`

**说明：** 此接口由微信服务器调用，无需认证。会自动更新订单状态和用户积分。

## 小程序端使用

### 1. 创建订单

```javascript
const orderData = await apiService.order.create({
  cartItemIds: ['商品ID1', '商品ID2'],
  deliveryType: 'pickup',
  deliveryAddressId: '地址ID'
});
```

### 2. 跳转到支付页面

```javascript
wx.navigateTo({
  url: `/pages/pay/pay?orderId=${orderData.orderId}&orderNo=${orderData.orderNo}&totalPrice=${orderData.totalPrice}`
});
```

### 3. 支付页面调用支付

支付页面会自动：
1. 调用 `/v1/payment/create` 获取支付参数
2. 调用 `wx.requestPayment()` 发起支付
3. 支付成功后查询订单状态
4. 跳转到订单列表

## 注意事项

1. **私钥配置**
   - 开发环境：可以直接在环境变量中填写私钥内容
   - 生产环境：建议使用文件路径方式，确保私钥文件安全

2. **回调地址**
   - 必须是 HTTPS 地址
   - 必须可以通过公网访问
   - 建议使用域名而非 IP 地址

3. **签名验证**
   - 如果配置了公钥，会自动验证回调签名
   - 如果未配置公钥，回调仍会处理，但不会验证签名（不推荐）

4. **订单状态**
   - `pending`: 待支付
   - `paid`: 已支付
   - `making`: 制作中
   - `completed`: 已完成
   - `cancelled`: 已取消

5. **错误处理**
   - 如果微信支付服务不可用，会返回 503 错误
   - 用户取消支付不会显示错误提示
   - 支付失败会显示具体错误信息

## 测试

### 1. 测试环境

微信支付提供沙箱环境用于测试：
- 沙箱环境配置与正式环境相同
- 使用沙箱环境的商户号和密钥
- 测试金额建议使用 0.01 元

### 2. 测试流程

1. 创建测试订单
2. 调用支付接口
3. 使用微信支付测试工具完成支付
4. 检查订单状态是否更新
5. 检查用户积分是否增加

## 常见问题

### 1. 支付参数获取失败

**原因：** 微信支付配置不正确或服务不可用

**解决：**
- 检查环境变量配置
- 检查商户号和密钥是否正确
- 检查私钥格式是否正确

### 2. 支付回调未收到

**原因：** 回调地址配置错误或网络问题

**解决：**
- 检查回调地址是否正确配置
- 检查服务器是否可以通过公网访问
- 检查防火墙和 Nginx 配置

### 3. 签名验证失败

**原因：** 公钥配置错误或回调数据被修改

**解决：**
- 检查公钥配置是否正确
- 检查回调地址是否使用 HTTPS
- 检查 Nginx 是否修改了请求体

## 相关文档

- [微信支付开发文档](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)
- [小程序支付接入指南](https://pay.weixin.qq.com/wiki/doc/apiv3/open/chapter2_8_0.shtml)
- [wechatpay-node-v3 文档](https://github.com/wechatpay-apiv3/wechatpay-node)
