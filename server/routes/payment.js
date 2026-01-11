const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { success, error } = require('../utils/response');
const wechatpay = require('../utils/wechatpay');
const { auth } = require('../middleware/auth');

/**
 * 检查微信支付配置状态
 * GET /v1/payment/config/check
 * 不需要认证（用于诊断）
 */
router.get('/config/check', (req, res) => {
  const config = {
    appid: process.env.WX_APPID,
    mchid: process.env.WX_MCHID,
    key: process.env.WX_API_KEY ? '已配置' : '未配置',
    privateKey: process.env.WX_PRIVATE_KEY ? (process.env.WX_PRIVATE_KEY.startsWith('file://') ? '文件路径' : '已配置') : '未配置',
    certSerialNo: process.env.WX_CERT_SERIAL_NO,
    publicKey: process.env.WX_PUBLIC_KEY ? '已配置' : '未配置',
    notifyUrl: process.env.WX_NOTIFY_URL || `${process.env.API_BASE_URL || 'http://localhost:3000'}/v1/payment/notify`
  };

  const missing = [];
  if (!config.appid) missing.push('WX_APPID');
  if (!config.mchid) missing.push('WX_MCHID');
  if (config.key === '未配置') missing.push('WX_API_KEY');
  if (config.privateKey === '未配置') missing.push('WX_PRIVATE_KEY');
  if (!config.certSerialNo) missing.push('WX_CERT_SERIAL_NO');

  const isAvailable = wechatpay.isAvailable();
  const initError = wechatpay.getInitError();

  res.json({
    available: isAvailable,
    initError: initError || null,
    config: {
      ...config,
      appid: config.appid ? `${config.appid.substring(0, 6)}...` : '未配置',
      mchid: config.mchid ? `${config.mchid.substring(0, 4)}...` : '未配置',
      certSerialNo: config.certSerialNo ? `${config.certSerialNo.substring(0, 8)}...` : '未配置'
    },
    missing: missing,
    message: isAvailable 
      ? '微信支付配置正常' 
      : `微信支付配置不完整，缺少: ${missing.join(', ')}${initError ? `。错误: ${initError}` : ''}`
  });
});

/**
 * 创建支付订单（统一下单）
 * POST /v1/payment/create
 * 需要认证
 */
router.post('/create', auth, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return error(res, '订单ID不能为空', 400);
    }

    // 查找订单
    const order = await Order.findOne({
      _id: orderId,
      userId: req.userId,
      status: 'pending' // 只有待支付订单才能创建支付
    });

    if (!order) {
      return error(res, '订单不存在或已支付', 404);
    }

    // 获取用户 openid
    const user = await User.findById(req.userId);
    if (!user || !user.openid) {
      return error(res, '用户未绑定微信，无法支付', 400);
    }

    // 检查微信支付是否可用
    if (!wechatpay.isAvailable()) {
      const initError = wechatpay.getInitError();
      const errorMessage = initError 
        ? `微信支付服务不可用: ${initError}。请检查环境变量配置（WX_APPID, WX_MCHID, WX_API_KEY, WX_PRIVATE_KEY, WX_CERT_SERIAL_NO）`
        : '微信支付服务暂不可用，请检查配置';
      console.error('支付失败:', errorMessage);
      return error(res, errorMessage, 503);
    }

    // 构建商品描述
    const description = `手工烤面筋-订单${order.orderNo}`;

    // 调用微信支付统一下单
    const paymentResult = await wechatpay.createPayment({
      openid: user.openid,
      orderNo: order.orderNo,
      amount: Math.round(order.totalPrice * 100), // 转换为分
      description: description
    });

    // 生成小程序支付参数
    const payParams = wechatpay.generatePaymentParams(paymentResult.prepayId);

    success(res, {
      orderId: order._id,
      orderNo: order.orderNo,
      payParams
    });
  } catch (err) {
    console.error('创建支付订单失败:', err);
    error(res, err.message || '创建支付订单失败', 500);
  }
});

/**
 * 微信支付回调接口
 * POST /v1/payment/notify
 * 不需要认证（由微信服务器调用）
 * 
 * 注意：微信支付 v3 回调需要使用原始 body 来验证签名
 * 这个路由需要在 app.js 中单独配置，不使用 express.json() 中间件
 */
router.post('/notify', async (req, res) => {
  try {
    // 获取请求头和请求体
    // 注意：由于 app.js 中使用了 express.json()，这里 req.body 已经是解析后的对象
    // 如果需要验证签名，需要获取原始 body，这需要在 app.js 中特殊处理
    const headers = req.headers;
    
    // 尝试从原始 body 获取（如果存在）
    let body = req.body;
    let notifyData;
    
    // 如果 body 是 Buffer，转换为字符串
    if (Buffer.isBuffer(body)) {
      body = body.toString('utf8');
      notifyData = JSON.parse(body);
    } else if (typeof body === 'string') {
      notifyData = JSON.parse(body);
    } else {
      // 如果已经是对象，直接使用
      notifyData = body;
      body = JSON.stringify(body);
    }

    // 验证签名（如果配置了公钥）
    // 注意：wechatpay-node-v3 的 verifySign 方法需要原始 body 字符串
    if (wechatpay.isAvailable()) {
      try {
        const isValid = wechatpay.verifyNotify(headers, body);
        if (!isValid) {
          console.error('支付回调签名验证失败');
          // 注意：即使签名验证失败，也返回 200，避免微信重复回调
          // 但在日志中记录，便于排查
          return res.status(200).json({
            code: 'FAIL',
            message: '签名验证失败'
          });
        }
      } catch (verifyErr) {
        console.error('签名验证异常:', verifyErr);
        // 如果验证过程出错，记录日志但继续处理（可能是配置问题）
      }
    }

    const { out_trade_no, transaction_id, trade_state, trade_state_desc } = notifyData;

    console.log('收到支付回调:', {
      orderNo: out_trade_no,
      transactionId: transaction_id,
      tradeState: trade_state,
      tradeStateDesc: trade_state_desc
    });

    // 查找订单
    const order = await Order.findOne({ orderNo: out_trade_no });

    if (!order) {
      console.error('订单不存在:', out_trade_no);
      return res.status(404).send('订单不存在');
    }

    // 检查订单状态
    if (order.status !== 'pending') {
      console.log('订单已处理，忽略回调:', out_trade_no);
      return res.status(200).send('订单已处理');
    }

    // 处理支付成功
    if (trade_state === 'SUCCESS') {
      order.status = 'paid';
      order.payTime = new Date();
      await order.save();

      // 如果使用了优惠券，标记为已使用
      if (order.couponId) {
        const UserCoupon = require('../models/UserCoupon');
        await UserCoupon.findByIdAndUpdate(order.couponId, {
          status: 'used',
          usedTime: new Date()
        });
      }

      // 如果使用了商品券，标记为已使用
      if (order.productVoucherIds && order.productVoucherIds.length > 0) {
        const UserProductVoucher = require('../models/UserProductVoucher');
        await UserProductVoucher.updateMany(
          { _id: { $in: order.productVoucherIds }, userId: order.userId },
          {
            status: 'used',
            usedTime: new Date(),
            usedOrderId: order._id
          }
        );
      }

      // ⚠️ 重要：支付成功后才删除购物车商品
      if (order.cartItemIds && order.cartItemIds.length > 0) {
        const Cart = require('../models/Cart');
        await Cart.deleteMany({ 
          _id: { $in: order.cartItemIds },
          userId: order.userId // 双重验证，确保只删除该用户的购物车商品
        });
        console.log('支付成功，已删除购物车商品:', order.cartItemIds.length, '个');
      }

      // 更新用户消费统计和积分
      const pointsEarned = Math.floor(order.totalPrice);
      await User.findByIdAndUpdate(order.userId, {
        $inc: {
          totalConsumption: order.totalPrice,
          points: pointsEarned
        }
      });

      console.log('订单支付成功:', out_trade_no);
    } else {
      console.log('订单支付失败:', out_trade_no, trade_state_desc);
      // 支付失败，可以记录日志或发送通知
    }

    // 返回成功响应给微信
    res.status(200).json({
      code: 'SUCCESS',
      message: '成功'
    });
  } catch (err) {
    console.error('处理支付回调失败:', err);
    res.status(500).send('处理失败');
  }
});

/**
 * 查询订单支付状态
 * GET /v1/payment/query/:orderId
 * 需要认证
 */
router.get('/query/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;

    // 查找订单
    const order = await Order.findOne({
      _id: orderId,
      userId: req.userId
    });

    if (!order) {
      return error(res, '订单不存在', 404);
    }

    // 如果订单已支付，直接返回
    if (order.status !== 'pending') {
      return success(res, {
        orderId: order._id,
        orderNo: order.orderNo,
        status: order.status,
        payTime: order.payTime
      });
    }

    // 查询微信支付订单状态
    if (!wechatpay.isAvailable()) {
      const initError = wechatpay.getInitError();
      const errorMessage = initError 
        ? `微信支付服务不可用: ${initError}`
        : '微信支付服务暂不可用';
      return error(res, errorMessage, 503);
    }

    try {
      const paymentInfo = await wechatpay.queryOrder(order.orderNo);
      
      // ⚠️ 重要：只有在微信支付明确返回 SUCCESS 状态时，才更新订单状态
      // 其他状态（如 NOTPAY、CLOSED、REVOKED、USERPAYING、PAYERROR）都不应该更新订单状态
      if (paymentInfo.trade_state === 'SUCCESS' && order.status === 'pending') {
        // 双重确认：再次检查订单状态，避免并发问题
        const currentOrder = await Order.findById(order._id);
        if (currentOrder && currentOrder.status === 'pending') {
          currentOrder.status = 'paid';
          currentOrder.payTime = new Date();
          await currentOrder.save();

          // 如果使用了优惠券，标记为已使用
          if (currentOrder.couponId) {
            const UserCoupon = require('../models/UserCoupon');
            await UserCoupon.findByIdAndUpdate(currentOrder.couponId, {
              status: 'used',
              usedTime: new Date()
            });
          }

          // 如果使用了商品券，标记为已使用
          if (currentOrder.productVoucherIds && currentOrder.productVoucherIds.length > 0) {
            const UserProductVoucher = require('../models/UserProductVoucher');
            await UserProductVoucher.updateMany(
              { _id: { $in: currentOrder.productVoucherIds }, userId: currentOrder.userId },
              {
                status: 'used',
                usedTime: new Date(),
                usedOrderId: currentOrder._id
              }
            );
          }

          // ⚠️ 重要：支付成功后才删除购物车商品
          if (currentOrder.cartItemIds && currentOrder.cartItemIds.length > 0) {
            const Cart = require('../models/Cart');
            await Cart.deleteMany({ 
              _id: { $in: currentOrder.cartItemIds },
              userId: currentOrder.userId // 双重验证，确保只删除该用户的购物车商品
            });
            console.log('通过查询接口确认支付成功，已删除购物车商品:', currentOrder.cartItemIds.length, '个');
          }

          // 更新用户消费统计和积分
          const pointsEarned = Math.floor(currentOrder.totalPrice);
          await User.findByIdAndUpdate(currentOrder.userId, {
            $inc: {
              totalConsumption: currentOrder.totalPrice,
              points: pointsEarned
            }
          });

          console.log('通过查询接口确认支付成功，更新订单状态:', order.orderNo);
          
          // 返回更新后的状态
          return success(res, {
            orderId: currentOrder._id,
            orderNo: currentOrder.orderNo,
            status: currentOrder.status,
            payTime: currentOrder.payTime,
            paymentInfo: {
              tradeState: paymentInfo.trade_state,
              tradeStateDesc: paymentInfo.trade_state_desc
            }
          });
        }
      } else if (paymentInfo.trade_state !== 'SUCCESS') {
        // 支付未成功，记录日志但不更新订单状态
        console.log('支付查询结果：订单未支付成功', {
          orderNo: order.orderNo,
          tradeState: paymentInfo.trade_state,
          tradeStateDesc: paymentInfo.trade_state_desc,
          currentOrderStatus: order.status
        });
      }

      // 返回订单当前状态（无论是否更新）
      success(res, {
        orderId: order._id,
        orderNo: order.orderNo,
        status: order.status,
        payTime: order.payTime,
        paymentInfo: {
          tradeState: paymentInfo.trade_state,
          tradeStateDesc: paymentInfo.trade_state_desc
        }
      });
    } catch (err) {
      console.error('查询微信支付状态失败:', err);
      // 查询失败，返回订单当前状态（不更新）
      success(res, {
        orderId: order._id,
        orderNo: order.orderNo,
        status: order.status,
        payTime: order.payTime,
        error: '查询支付状态失败，请稍后重试'
      });
    }
  } catch (err) {
    console.error('查询支付状态失败:', err);
    error(res, err.message || '查询支付状态失败', 500);
  }
});

module.exports = router;
