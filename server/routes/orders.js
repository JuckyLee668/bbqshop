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
    const { cartItemIds, deliveryType, deliveryAddressId, remark, couponId, productVoucherIds } = req.body;

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

    // 计算优惠券折扣
    let couponDiscount = 0;
    let finalProductTotal = productTotal;
    
    if (couponId) {
      const UserCoupon = require('../models/UserCoupon');
      const userCoupon = await UserCoupon.findOne({
        _id: couponId,
        userId: req.userId,
        status: 'available'
      }).populate('couponId');
      
      if (userCoupon && userCoupon.couponId) {
        const coupon = userCoupon.couponId;
        
        // 检查是否过期
        const now = new Date();
        if (!coupon.expireTime || new Date(coupon.expireTime) >= now) {
          // 检查是否满足最低消费
          if (!coupon.minAmount || productTotal >= coupon.minAmount) {
            if (coupon.type === 'discount') {
              // 折扣券：计算折扣金额（原价 - 折扣后价格）
              // 例如：9折券（value=90），折扣金额 = 原价 * (1 - 90/100) = 原价 * 0.1
              couponDiscount = Math.round(productTotal * (1 - coupon.value / 100) * 100) / 100;
            } else if (coupon.type === 'reduce') {
              // 满减券：直接减金额
              couponDiscount = coupon.value;
            } else if (coupon.type === 'freeProduct' && coupon.productId) {
              // 特定商品免单券：只减免一个商品的价格（一张券只能免一次）
              // 从购物车商品中查找匹配的商品
              for (const cartItem of cartItems) {
                if (cartItem.productId && cartItem.productId._id && 
                    cartItem.productId._id.toString() === coupon.productId.toString()) {
                  // 只减免一个商品的价格，不是所有数量
                  couponDiscount = cartItem.productId.price || 0;
                  break; // 找到第一个匹配的商品后立即退出
                }
              }
            }
            
            // 确保折扣不超过商品总价
            couponDiscount = Math.min(couponDiscount, productTotal);
            finalProductTotal = Math.max(0, productTotal - couponDiscount);
            
            // 标记优惠券为已使用（但先不更新，等支付成功后再更新）
            // 这里先记录，支付成功后在回调中更新
          }
        }
      }
    }

    // 订单总价 = 商品总价（优惠后） + 配送费
    const totalPrice = finalProductTotal + deliveryFee;

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
      couponId,
      productVoucherIds: productVoucherIds || [], // 保存商品券ID
      cartItemIds: cartItemIds // 保存购物车商品ID，用于支付成功后删除购物车
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

    // 处理商品券：将商品券对应的商品添加到订单中
    if (productVoucherIds && productVoucherIds.length > 0) {
      const UserProductVoucher = require('../models/UserProductVoucher');
      const ProductVoucher = require('../models/ProductVoucher');
      const OrderItem = require('../models/OrderItem');
      
      for (const voucherId of productVoucherIds) {
        const userVoucher = await UserProductVoucher.findOne({
          _id: voucherId,
          userId: req.userId,
          status: 'available'
        }).populate('productVoucherId');
        
        if (userVoucher && userVoucher.productVoucherId) {
          const voucher = userVoucher.productVoucherId;
          await voucher.populate('productId');
          const product = voucher.productId;
          
          if (product) {
            // 将商品券对应的商品添加到订单商品中（价格为0，因为是用积分兑换的）
            const orderItem = new OrderItem({
              orderId: order._id,
              productId: product._id,
              productName: product.name,
              price: 0, // 商品券商品价格为0
              quantity: voucher.quantity,
              spec: `商品券：${voucher.name}`
            });
            await orderItem.save();
            orderItems.push(orderItem);

            // 减少商品库存
            await Product.findByIdAndUpdate(product._id, {
              $inc: { stock: -voucher.quantity }
            });
          }
        }
      }
    }

    // ⚠️ 重要：不在创建订单时删除购物车
    // 只有在支付成功后才删除购物车，避免支付失败时购物车丢失
    // 购物车删除逻辑已移至支付成功回调中（server/routes/payment.js）

    // 更新用户累计消费（订单创建时先不更新，等支付完成后再更新）
    // 这里先不更新，等订单支付完成后再更新

    // 注意：支付参数不再在这里生成，需要前端调用 /v1/payment/create 接口获取
    // 这样可以确保支付参数是最新的，避免过期

    success(res, {
      orderId: order._id,
      orderNo: order.orderNo,
      totalPrice,
      productTotal,
      finalProductTotal, // 优惠后的商品总价
      couponDiscount, // 优惠金额
      deliveryFee,
      deliveryType: order.deliveryType
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

    // 计算优惠券折扣（如果有）
    let couponDiscount = 0;
    let couponInfo = null;
    if (order.couponId) {
      const UserCoupon = require('../models/UserCoupon');
      const userCoupon = await UserCoupon.findById(order.couponId)
        .populate('couponId');
      
      if (userCoupon && userCoupon.couponId) {
        const coupon = userCoupon.couponId;
        const productTotal = order.productTotal || 0;
        
        if (coupon.type === 'discount') {
          couponDiscount = Math.round(productTotal * (1 - coupon.value / 100) * 100) / 100;
        } else if (coupon.type === 'reduce') {
          couponDiscount = coupon.value;
        }
        couponDiscount = Math.min(couponDiscount, productTotal);
        
        couponInfo = {
          id: coupon._id,
          name: coupon.name,
          type: coupon.type,
          value: coupon.value,
          desc: coupon.desc || '',
          minAmount: coupon.minAmount || 0
        };
      }
    }

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
      totalAmount: order.totalPrice, // 兼容字段
      productAmount: order.productTotal || 0, // 商品金额（优惠前）
      productTotal: order.productTotal || 0, // 兼容字段
      deliveryFee: order.deliveryFee || 0, // 配送费
      couponDiscount: couponDiscount, // 优惠券折扣金额
      coupon: couponInfo, // 优惠券信息
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

// 更新订单优惠券
router.put('/:id/coupon', async (req, res) => {
  try {
    const { couponId } = req.body;
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.userId,
      status: 'pending'
    });

    if (!order) {
      return error(res, '订单不存在或无法修改', 404);
    }

    // 获取订单商品总价
    const orderItems = await OrderItem.find({ orderId: order._id }).populate('productId');
    let productTotal = 0;
    for (const item of orderItems) {
      productTotal += item.productId.price * item.quantity;
    }

    let couponDiscount = 0;
    let finalProductTotal = productTotal;

    if (couponId) {
      const UserCoupon = require('../models/UserCoupon');
      const userCoupon = await UserCoupon.findOne({
        _id: couponId,
        userId: req.userId,
        status: 'available'
      }).populate('couponId');
      
      if (userCoupon && userCoupon.couponId) {
        const coupon = userCoupon.couponId;
        
        // 检查是否过期
        const now = new Date();
        if (!coupon.expireTime || new Date(coupon.expireTime) >= now) {
          // 检查是否满足最低消费
          if (!coupon.minAmount || productTotal >= coupon.minAmount) {
            if (coupon.type === 'discount') {
              // 折扣券：按百分比计算折扣金额
              couponDiscount = Math.round(productTotal * (1 - coupon.value / 100) * 100) / 100;
            } else if (coupon.type === 'reduce') {
              // 满减券：直接减金额
              couponDiscount = coupon.value;
            } else if (coupon.type === 'freeProduct' && coupon.productId) {
              // 特定商品免单券：只减免一个商品的价格（一张券只能免一次）
              for (const orderItem of orderItems) {
                if (orderItem.productId && orderItem.productId._id && 
                    orderItem.productId._id.toString() === coupon.productId.toString()) {
                  // 只减免一个商品的价格，不是所有数量
                  couponDiscount = orderItem.productId.price || 0;
                  break; // 找到第一个匹配的商品后立即退出
                }
              }
            }
            
            // 确保折扣不超过商品总价
            couponDiscount = Math.min(couponDiscount, productTotal);
            finalProductTotal = Math.max(0, productTotal - couponDiscount);
          } else {
            return error(res, `该优惠券需要满¥${coupon.minAmount}才能使用`, 400);
          }
        } else {
          return error(res, '优惠券已过期', 400);
        }
      } else {
        return error(res, '优惠券不存在或已使用', 404);
      }
    }

    // 更新订单
    order.couponId = couponId || null;
    const totalPrice = finalProductTotal + order.deliveryFee;
    order.totalPrice = totalPrice;
    order.productTotal = productTotal;
    
    await order.save();

    success(res, {
      totalPrice,
      finalProductTotal,
      couponDiscount,
      productTotal
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 支付完成（已废弃：实际支付由微信支付回调触发，此接口保留用于兼容）
// 注意：真实支付应使用 /v1/payment/create 接口
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
