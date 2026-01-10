const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Review = require('../models/Review');
const { auth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

// 所有路由需要认证
router.use(auth);

// 创建订单
router.post('/', async (req, res) => {
  try {
    const { cartItemIds, deliveryType, deliveryAddressId, remark, couponId } = req.body;

    if (!cartItemIds || cartItemIds.length === 0) {
      return error(res, '请选择要购买的商品', 400);
    }

    // 获取购物车商品
    const cartItems = await Cart.find({
      _id: { $in: cartItemIds },
      userId: req.userId,
      checked: true
    }).populate('productId');

    if (cartItems.length === 0) {
      return error(res, '购物车为空', 400);
    }

    // 计算商品总价
    let productTotal = 0;
    for (const item of cartItems) {
      const product = item.productId;
      if (product.stock < item.quantity) {
        return error(res, `${product.name}库存不足`, 400);
      }
      productTotal += product.price * item.quantity;
    }

    // 计算配送费
    let deliveryFee = 0;
    if (deliveryType === 'delivery') {
      // 获取门店信息
      const Merchant = require('../models/Merchant');
      const merchant = await Merchant.findOne();
      
      if (merchant && merchant.storeInfo) {
        const freeThreshold = merchant.storeInfo.freeDeliveryThreshold || 50;
        const fee = merchant.storeInfo.deliveryFee || 5;
        
        // 如果商品总价小于免费配送界限，则收取配送费
        if (productTotal < freeThreshold) {
          deliveryFee = fee;
        }
      }
    }

    // 订单总价 = 商品总价 + 配送费
    const totalPrice = productTotal + deliveryFee;

    // 创建订单
    const order = new Order({
      orderNo: Order.generateOrderNo(),
      userId: req.userId,
      totalPrice,
      productTotal, // 商品总价
      deliveryFee, // 配送费
      deliveryType: deliveryType || 'pickup',
      deliveryAddressId,
      remark,
      couponId
    });

    await order.save();

    // 创建订单商品
    const orderItems = [];
    for (const item of cartItems) {
      const orderItem = new OrderItem({
        orderId: order._id,
        productId: item.productId._id,
        productName: item.productId.name,
        price: item.productId.price,
        quantity: item.quantity,
        spec: item.spec,
        flavor: item.flavor,
        spicy: item.spicy,
        addons: item.addons
      });
      await orderItem.save();
      orderItems.push(orderItem);

      // 减少库存
      await Product.findByIdAndUpdate(item.productId._id, {
        $inc: { stock: -item.quantity }
      });
    }

    // 删除购物车商品
    await Cart.deleteMany({ _id: { $in: cartItemIds } });

    // 更新用户累计消费（订单创建时先不更新，等支付完成后再更新）
    // 这里先不更新，等订单支付完成后再更新

    // 生成支付参数（这里需要集成微信支付）
    const payParams = {
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: Math.random().toString(36).substr(2, 15),
      package: 'prepay_id=xxx', // 需要调用微信支付接口获取
      signType: 'RSA',
      paySign: '签名' // 需要计算签名
    };

    success(res, {
      orderId: order._id,
      orderNo: order.orderNo,
      totalPrice,
      productTotal,
      deliveryFee,
      deliveryType: order.deliveryType,
      payParams
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 获取订单列表
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, pageSize = 10 } = req.query;
    
    const query = { userId: req.userId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query)
    ]);

    // 获取订单商品
    const orderIds = orders.map(o => o._id);
    const orderItems = await OrderItem.find({ orderId: { $in: orderIds } })
      .populate('productId', 'images');

    // 检查哪些订单已评价
    const reviews = await Review.find({ orderId: { $in: orderIds } })
      .select('orderId')
      .lean();
    const reviewedOrderIdSet = new Set(reviews.map(r => r.orderId.toString()));

    const list = orders.map(order => {
      const items = orderItems.filter(item => item.orderId.toString() === order._id.toString());
      const isReviewed = reviewedOrderIdSet.has(order._id.toString());
      
      // 如果订单已完成且已评价，显示"已评价"状态
      let statusText = {
        pending: '待制作',
        paid: '待制作',
        making: '制作中',
        completed: isReviewed ? '已评价' : '已完成',
        cancelled: '已取消'
      }[order.status] || '未知';

      return {
        id: order._id,
        orderNo: order.orderNo,
        status: order.status,
        statusText,
        isReviewed, // 添加是否已评价标识
        totalPrice: order.totalPrice,
        deliveryType: order.deliveryType,
        deliveryTypeText: order.deliveryType === 'pickup' ? '到店自取' : '外卖配送',
        createTime: order.createdAt,
        items: items.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          spec: item.spec,
          image: item.productId?.images?.[0] || ''
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

// 获取订单详情
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findOne({
      $or: [
        { _id: req.params.id },
        { orderNo: req.params.id }
      ],
      userId: req.userId
    }).populate('deliveryAddressId');

    if (!order) {
      return error(res, '订单不存在', 404);
    }

    const items = await OrderItem.find({ orderId: order._id })
      .populate('productId', 'images');

    success(res, {
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
      deliveryAddress: order.deliveryAddressId,
      remark: order.remark,
      createTime: order.createdAt,
      items: items.map(item => ({
        productId: item.productId?._id || item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        spec: item.spec,
        image: item.productId?.images?.[0]
      })),
      merchantInfo: {
        name: '夜市烤面筋',
        phone: '138****8888'
      }
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 取消订单
router.put('/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.userId,
      status: { $in: ['pending', 'paid'] }
    });

    if (!order) {
      return error(res, '订单不存在或无法取消', 404);
    }

    order.status = 'cancelled';
    order.cancelReason = reason || '用户主动取消';
    await order.save();

    // 恢复库存
    const items = await OrderItem.find({ orderId: order._id });
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity }
      });
    }

    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 更新订单地址（仅限待支付订单）
router.put('/:id/address', async (req, res) => {
  try {
    const { deliveryAddressId } = req.body;
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.userId,
      status: 'pending'
    });

    if (!order) {
      return error(res, '订单不存在或无法修改', 404);
    }

    if (order.deliveryType === 'delivery' && !deliveryAddressId) {
      return error(res, '外卖配送必须选择地址', 400);
    }

    order.deliveryAddressId = deliveryAddressId;
    await order.save();

    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 支付完成（模拟支付，实际应该由微信支付回调触发）
router.put('/:id/pay', async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.userId,
      status: 'pending'
    });

    if (!order) {
      return error(res, '订单不存在或已支付', 404);
    }

    order.status = 'paid';
    order.payTime = new Date();
    await order.save();

    // 更新用户消费统计和积分（支付完成时更新）
    const User = require('../models/User');
    // 计算积分：每消费1元获得1积分
    const pointsEarned = Math.floor(order.totalPrice);
    
    await User.findByIdAndUpdate(req.userId, {
      $inc: { 
        totalConsumption: order.totalPrice,
        points: pointsEarned
      }
    });

    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 完成订单
router.put('/:id/complete', async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.userId
    });

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

module.exports = router;
