const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Merchant = require('../models/Merchant');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');
const Address = require('../models/Address');
const Review = require('../models/Review');
const { merchantAuth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

// 商家登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return error(res, '缺少用户名或密码', 400);
    }

    const merchant = await Merchant.findOne({ username });
    if (!merchant) {
      return error(res, '用户名或密码错误', 401);
    }

    const isMatch = await merchant.comparePassword(password);
    if (!isMatch) {
      return error(res, '用户名或密码错误', 401);
    }

    const token = jwt.sign(
      { merchantId: merchant._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    success(res, {
      token,
      merchantInfo: {
        id: merchant._id,
        name: merchant.name,
        username: merchant.username
      }
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 以下路由需要商家认证
router.use(merchantAuth);

// 获取统计数据
router.get('/statistics', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // 今日订单
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    // 今日营业额
    const todayRevenueResult = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalPrice' }
        }
      }
    ]);
    const todayRevenue = todayRevenueResult[0]?.total || 0;

    // 昨日数据
    const yesterday = new Date(startOfDay);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0));
    const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999));

    const yesterdayOrders = await Order.countDocuments({
      createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd }
    });

    const yesterdayRevenueResult = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalPrice' }
        }
      }
    ]);
    const yesterdayRevenue = yesterdayRevenueResult[0]?.total || 0;

    // 新订单数
    const newOrders = await Order.countDocuments({
      status: { $in: ['pending', 'paid'] }
    });

    const orderGrowth = yesterdayOrders > 0 
      ? Math.round(((todayOrders - yesterdayOrders) / yesterdayOrders) * 100)
      : 0;
    
    const revenueGrowth = yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : 0;

    success(res, {
      todayOrders,
      todayRevenue,
      yesterdayOrders,
      yesterdayRevenue,
      orderGrowth,
      revenueGrowth,
      newOrders
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 获取订单列表（商家）
router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1, pageSize = 10 } = req.query;
    
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('userId', 'nickName phone')
        .populate('deliveryAddressId', 'name phone address detail')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query)
    ]);

    const OrderItem = require('../models/OrderItem');
    const orderIds = orders.map(o => o._id);
    const orderItems = await OrderItem.find({ orderId: { $in: orderIds } });

    const list = orders.map(order => {
      const items = orderItems.filter(item => 
        item.orderId.toString() === order._id.toString()
      );
      return {
        id: order._id,
        orderNo: order.orderNo,
        status: order.status,
        statusText: {
          pending: '待制作',
          paid: '待制作',
          making: '制作中',
          completed: '已完成',
          cancelled: '已取消'
        }[order.status] || '未知',
        totalPrice: order.totalPrice,
        deliveryType: order.deliveryType,
        deliveryTypeText: order.deliveryType === 'pickup' ? '到店自取' : '外卖配送',
        deliveryAddress: order.deliveryAddressId,
        createTime: order.createdAt,
        items: items.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          spec: item.spec
        }))
      };
    });

    success(res, {
      list,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 接单
router.put('/orders/:id/accept', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return error(res, '订单不存在', 404);
    }

    if (order.status !== 'pending' && order.status !== 'paid') {
      return error(res, '订单状态不允许接单', 400);
    }

    order.status = 'making';
    await order.save();

    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 完成订单
router.put('/orders/:id/complete', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return error(res, '订单不存在', 404);
    }

    order.status = 'completed';
    order.completeTime = new Date();
    await order.save();

    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 获取商品列表（商家）
router.get('/products', async (req, res) => {
  try {
    const { status, page = 1, pageSize = 10 } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [list, total] = await Promise.all([
      Product.find(query)
        .populate('categoryId', 'name')
        .sort({ sort: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query)
    ]);

    success(res, {
      list: list.map(item => ({
        id: item._id,
        name: item.name,
        price: item.price,
        stock: item.stock,
        status: item.status,
        image: item.images?.[0],
        categoryId: item.categoryId?._id || item.categoryId,
        isRecommend: item.isRecommend || false,
        isSpecial: item.isSpecial || false
      })),
      total
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 创建商品
router.post('/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    success(res, { id: product._id });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 获取商品详情（商家）
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name');
    
    if (!product) {
      return error(res, '商品不存在', 404);
    }

    success(res, {
      id: product._id,
      name: product.name,
      desc: product.desc,
      price: product.price,
      oldPrice: product.oldPrice,
      stock: product.stock,
      categoryId: product.categoryId?._id || product.categoryId,
      images: product.images || [],
      addons: product.addons || [],
      enableAddons: product.enableAddons !== false,
      flavors: product.flavors || [],
      spicyLevels: product.spicyLevels || [],
      status: product.status,
      sort: product.sort,
      tag: product.tag
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 更新商品
router.put('/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, req.body);
    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 删除商品
router.delete('/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    
    // 检查商品是否存在
    const product = await Product.findById(productId);
    if (!product) {
      return error(res, '商品不存在', 404);
    }
    
    // 检查是否有订单使用该商品
    const OrderItem = require('../models/OrderItem');
    const orderItemsCount = await OrderItem.countDocuments({ productId });
    if (orderItemsCount > 0) {
      return error(res, `该商品已被 ${orderItemsCount} 个订单使用，无法删除`, 400);
    }
    
    // 检查是否有购物车使用该商品
    const Cart = require('../models/Cart');
    const cartCount = await Cart.countDocuments({ productId });
    if (cartCount > 0) {
      return error(res, `该商品在 ${cartCount} 个购物车中，请先清空相关购物车`, 400);
    }
    
    // 删除商品
    await Product.findByIdAndDelete(productId);
    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 上下架商品
router.put('/products/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await Product.findByIdAndUpdate(req.params.id, { status });
    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 设置/取消推荐商品
router.put('/products/:id/recommend', async (req, res) => {
  try {
    const { isRecommend } = req.body;
    
    // 如果设置为推荐，先取消其他推荐商品
    if (isRecommend) {
      await Product.updateMany(
        { _id: { $ne: req.params.id } },
        { $set: { isRecommend: false } }
      );
    }
    
    await Product.findByIdAndUpdate(req.params.id, { isRecommend: !!isRecommend });
    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 设置/取消特价套餐
router.put('/products/:id/special', async (req, res) => {
  try {
    const { isSpecial } = req.body;
    
    // 如果设置为特价套餐，先取消其他特价套餐
    if (isSpecial) {
      await Product.updateMany(
        { _id: { $ne: req.params.id } },
        { $set: { isSpecial: false } }
      );
    }
    
    await Product.findByIdAndUpdate(req.params.id, { isSpecial: !!isSpecial });
    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 获取分类列表（商家）
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ sort: 1 });
    success(res, categories.map(c => ({
      id: c._id,
      name: c.name,
      sort: c.sort
    })));
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 创建分类
router.post('/categories', async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    success(res, { id: category._id });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 更新分类
router.put('/categories/:id', async (req, res) => {
  try {
    await Category.findByIdAndUpdate(req.params.id, req.body);
    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 删除分类
router.delete('/categories/:id', async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    // 检查是否有商品使用该分类
    const productsCount = await Product.countDocuments({ categoryId });
    if (productsCount > 0) {
      return error(res, `该分类下还有 ${productsCount} 个商品，无法删除`, 400);
    }
    
    // 删除分类
    await Category.findByIdAndDelete(categoryId);
    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 获取门店信息
router.get('/store', async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) {
      return error(res, '商家不存在', 404);
    }

    success(res, {
      id: merchant._id,
      name: merchant.storeInfo?.name || merchant.name,
      address: merchant.storeInfo?.address || '',
      businessHours: merchant.storeInfo?.businessHours || '',
      deliveryRange: merchant.storeInfo?.deliveryRange || 0,
      status: merchant.storeInfo?.status || 'open',
      latitude: merchant.storeInfo?.latitude,
      longitude: merchant.storeInfo?.longitude,
      phone: merchant.storeInfo?.phone || '',
      freeDeliveryThreshold: merchant.storeInfo?.freeDeliveryThreshold || 50,
      deliveryFee: merchant.storeInfo?.deliveryFee || 5,
      showDeliveryFee: merchant.storeInfo?.showDeliveryFee !== false
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 更新门店信息
router.put('/store', async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) {
      return error(res, '商家不存在', 404);
    }

    merchant.storeInfo = {
      ...merchant.storeInfo,
      ...req.body,
      // 确保配送费相关字段被正确保存
      freeDeliveryThreshold: req.body.freeDeliveryThreshold !== undefined 
        ? req.body.freeDeliveryThreshold 
        : (merchant.storeInfo?.freeDeliveryThreshold || 50),
      deliveryFee: req.body.deliveryFee !== undefined 
        ? req.body.deliveryFee 
        : (merchant.storeInfo?.deliveryFee || 5),
      showDeliveryFee: req.body.showDeliveryFee !== undefined 
        ? req.body.showDeliveryFee 
        : (merchant.storeInfo?.showDeliveryFee !== false)
    };

    await merchant.save();
    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 获取用户列表
router.get('/users', async (req, res) => {
  try {
    const { keyword, page = 1, pageSize = 10 } = req.query;
    
    const query = {};
    if (keyword) {
      query.$or = [
        { phone: { $regex: keyword, $options: 'i' } },
        { nickName: { $regex: keyword, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    // 获取每个用户的订单数和地址
    const userIds = users.map(u => u._id);
    const [orderCounts, addresses] = await Promise.all([
      Order.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } }
      ]),
      Address.find({ userId: { $in: userIds } }).lean()
    ]);

    const orderCountMap = {};
    orderCounts.forEach(item => {
      orderCountMap[item._id.toString()] = item.count;
    });

    const addressMap = {};
    addresses.forEach(addr => {
      const userId = addr.userId.toString();
      if (!addressMap[userId]) {
        addressMap[userId] = [];
      }
      addressMap[userId].push(addr);
    });

    const baseUrl = req.protocol + '://' + req.get('host');
    const list = users.map(user => {
      // 处理头像URL，确保返回完整URL
      let avatarUrl = user.avatarUrl;
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        avatarUrl = avatarUrl.startsWith('/') 
          ? `${baseUrl}${avatarUrl}`
          : `${baseUrl}/${avatarUrl}`;
      }
      
      return {
        id: user._id,
        nickName: user.nickName || '微信用户',
        phone: user.phone || null,
        openid: user.openid,
        avatarUrl: avatarUrl || null,
        orderCount: orderCountMap[user._id.toString()] || 0,
        totalConsumption: user.totalConsumption || 0,
        points: user.points || 0,
        addresses: addressMap[user._id.toString()] || [],
        createdAt: user.createdAt
      };
    });

    success(res, {
      list,
      total
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 获取评论列表
router.get('/reviews', async (req, res) => {
  try {
    const { keyword, page = 1, pageSize = 10, productId } = req.query;
    
    const query = {};
    if (keyword) {
      query.content = { $regex: keyword, $options: 'i' };
    }
    if (productId) {
      query.productId = productId;
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('userId', 'nickName avatarUrl phone')
        .populate('productId', 'name')
        .populate('orderId', 'orderNo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(query)
    ]);

    const baseUrl = req.protocol + '://' + req.get('host');
    const list = reviews.map(review => {
      const img = review.userId?.avatarUrl;
      const fullImage = !img
        ? ''
        : img.startsWith('http')
        ? img
        : img.startsWith('/')
        ? `${baseUrl}${img}`
        : `${baseUrl}/${img}`;

      return {
        id: review._id,
        orderNo: review.orderId?.orderNo || '',
        productName: review.productId?.name || '',
        userInfo: {
          nickName: review.userId?.nickName || '微信用户',
          avatarUrl: fullImage,
          phone: review.userId?.phone || ''
        },
        rating: review.rating,
        content: review.content,
        images: review.images || [],
        merchantReply: review.merchantReply || '',
        merchantReplyTime: review.merchantReplyTime,
        createdAt: review.createdAt
      };
    });

    success(res, {
      list,
      total
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 回复评论
router.put('/reviews/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply) {
      return error(res, '回复内容不能为空', 400);
    }

    const review = await Review.findByIdAndUpdate(
      id,
      {
        merchantReply: reply,
        merchantReplyTime: new Date()
      },
      { new: true }
    );

    if (!review) {
      return error(res, '评论不存在', 404);
    }

    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 删除评论
router.delete('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndDelete(id);

    if (!review) {
      return error(res, '评论不存在', 404);
    }

    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
