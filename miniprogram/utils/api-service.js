// API 服务封装
const api = require('./api.js');

// 认证相关
const auth = {
  // 微信登录
  wxLogin(code, userInfo) {
    return api.post('/auth/wx-login', { code, userInfo });
  },
  
  // 绑定手机号
  bindPhone(data) {
    return api.post('/auth/bind-phone', data);
  }
};

// 首页相关
const home = {
  // 获取首页数据
  getIndex() {
    return api.get('/home/index');
  },
  
  // 获取门店信息
  getStoreInfo() {
    return api.get('/home/index').then(res => res.storeInfo);
  }
};

// 特价套餐相关
const special = {
  // 获取当前启用的特价套餐
  getActive() {
    return api.get('/special-packages/active');
  },
  // 获取特价套餐详情
  getDetail(id) {
    return api.get(`/special-packages/${id}`);
  }
};

// 商品相关
const product = {
  // 获取商品列表
  getList(params = {}) {
    return api.get('/products', params);
  },
  
  // 获取商品详情
  getDetail(id) {
    return api.get(`/products/${id}`);
  }
};

// 分类相关
const category = {
  // 获取分类列表
  getList() {
    return api.get('/categories');
  }
};

// 购物车相关
const cart = {
  // 获取购物车
  getList() {
    return api.get('/cart');
  },
  
  // 添加商品
  add(data) {
    return api.post('/cart/add', data);
  },
  
  // 更新商品
  update(id, data) {
    return api.put(`/cart/${id}`, data);
  },
  
  // 删除商品
  delete(id) {
    return api.delete(`/cart/${id}`);
  },
  
  // 清空购物车
  clear() {
    return api.delete('/cart/clear');
  }
};

// 订单相关
const order = {
  // 创建订单
  create(data) {
    return api.post('/orders', data);
  },
  
  // 获取订单列表
  getList(params = {}) {
    return api.get('/orders', params);
  },
  
  // 获取订单详情
  getDetail(id) {
    return api.get(`/orders/${id}`);
  },
  
  // 取消订单
  cancel(id, reason) {
    return api.put(`/orders/${id}/cancel`, { reason });
  },
  
  // 更新订单地址
  updateAddress(id, deliveryAddressId) {
    return api.put(`/orders/${id}/address`, { deliveryAddressId });
  },
  
  // 支付订单
  pay(id) {
    return api.put(`/orders/${id}/pay`);
  },
  
  // 完成订单
  complete(id) {
    return api.put(`/orders/${id}/complete`);
  }
};

// 评价相关
const review = {
  // 创建评价
  create(data) {
    return api.post('/reviews', data);
  },
  
  // 获取订单的评价
  getByOrderId(orderId) {
    return api.get(`/reviews/order/${orderId}`);
  },
  
  // 获取商品的所有评价
  getByProductId(productId, params = {}) {
    return api.get(`/reviews/product/${productId}`, params);
  }
};

// 地址相关
const address = {
  // 获取地址列表
  getList() {
    return api.get('/addresses');
  },
  
  // 添加地址
  add(data) {
    return api.post('/addresses', data);
  },
  
  // 更新地址
  update(id, data) {
    return api.put(`/addresses/${id}`, data);
  },
  
  // 删除地址
  delete(id) {
    return api.delete(`/addresses/${id}`);
  }
};

// 用户相关
const user = {
  // 获取用户信息
  getInfo() {
    return api.get('/user/info');
  },
  
  // 更新用户信息
  updateInfo(data) {
    return api.put('/user/info', data);
  }
};

// 上传相关
const upload = {
  // 上传图片
  image(filePath) {
    return api.uploadFile(filePath);
  }
};

// 反馈相关
const feedback = {
  // 提交反馈
  submit(data) {
    return api.post('/feedback', data);
  }
};

// 优惠券相关
const coupon = {
  // 获取优惠券列表
  getList(status) {
    return api.get('/coupons', { status });
  }
};

module.exports = {
  auth,
  home,
  product,
  category,
  special,
  cart,
  order,
  address,
  user,
  upload,
  feedback,
  coupon,
  review
};
