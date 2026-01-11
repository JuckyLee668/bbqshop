const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const UserCoupon = require('../models/UserCoupon');
const { auth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

// 获取用户优惠券列表
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = { userId: req.userId };
    if (status) {
      query.status = status;
    }

    const userCoupons = await UserCoupon.find(query)
      .populate('couponId')
      .sort({ createdAt: -1 });

    const now = new Date();
    const list = userCoupons.map(uc => {
      const coupon = uc.couponId;
      if (!coupon) {
        return null;
      }
      
      // 检查是否过期
      let actualStatus = uc.status;
      if (actualStatus === 'available' && coupon.expireTime && new Date(coupon.expireTime) < now) {
        actualStatus = 'expired';
        // 更新状态
        uc.status = 'expired';
        uc.save().catch(err => console.error('更新优惠券状态失败:', err));
      }
      
      return {
        id: uc._id,
        userCouponId: uc._id,
        couponId: coupon._id,
        name: coupon.name,
        desc: coupon.desc,
        type: coupon.type,
        value: coupon.value,
        minAmount: coupon.minAmount,
        productId: coupon.productId || null, // 特定商品免单券关联的商品ID
        status: actualStatus,
        expireTime: coupon.expireTime,
        usedTime: uc.usedTime,
        createdAt: uc.createdAt
      };
    }).filter(item => item !== null);

    success(res, list);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 获取可领取的优惠券列表（公开接口，不需要认证）
router.get('/available', async (req, res) => {
  try {
    const now = new Date();
    const { distributed } = req.query; // 是否只获取已发放的优惠券
    
    // 构建查询条件
    const query = {
      $or: [
        { expireTime: { $gt: now } },
        { expireTime: null }
      ]
    };
    
    // 如果指定只获取已发放的，添加条件
    if (distributed === 'true') {
      query.isDistributed = true;
    }
    
    // 查询所有可用的优惠券（未过期、有库存）
    const coupons = await Coupon.find(query).sort({ createdAt: -1 });

    const list = coupons.map(coupon => {
      // 检查库存
      const isAvailable = coupon.totalCount === -1 || coupon.usedCount < coupon.totalCount;
      
      return {
        id: coupon._id,
        name: coupon.name,
        desc: coupon.desc,
        type: coupon.type,
        value: coupon.value,
        minAmount: coupon.minAmount,
        expireTime: coupon.expireTime,
        isAvailable,
        remainingCount: coupon.totalCount === -1 ? -1 : (coupon.totalCount - coupon.usedCount),
        isDistributed: coupon.isDistributed || false
      };
    });

    success(res, list);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 领取优惠券（需要登录）
router.post('/receive/:couponId', auth, async (req, res) => {
  try {
    const { couponId } = req.params;
    
    // 检查优惠券是否存在
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return error(res, '优惠券不存在', 404);
    }

    // 检查是否过期
    if (coupon.expireTime && new Date(coupon.expireTime) < new Date()) {
      return error(res, '优惠券已过期', 400);
    }

    // 检查库存
    if (coupon.totalCount !== -1 && coupon.usedCount >= coupon.totalCount) {
      return error(res, '优惠券已领完', 400);
    }

    // 检查用户是否已领取
    const existingUserCoupon = await UserCoupon.findOne({
      userId: req.userId,
      couponId: couponId,
      status: { $in: ['available', 'used'] }
    });

    if (existingUserCoupon) {
      return error(res, '您已领取过此优惠券', 400);
    }

    // 创建用户优惠券
    const userCoupon = new UserCoupon({
      userId: req.userId,
      couponId: couponId,
      status: 'available'
    });

    await userCoupon.save();

    // 更新优惠券使用计数
    await Coupon.findByIdAndUpdate(couponId, {
      $inc: { usedCount: 1 }
    });

    success(res, {
      id: userCoupon._id,
      couponId: coupon._id,
      name: coupon.name,
      desc: coupon.desc,
      type: coupon.type,
      value: coupon.value,
      minAmount: coupon.minAmount,
      expireTime: coupon.expireTime
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 获取可用优惠券（用于订单选择）
router.get('/usable', auth, async (req, res) => {
  try {
    const { amount, cartItems } = req.query; // 订单金额和购物车商品列表
    
    const orderAmount = parseFloat(amount) || 0;
    const now = new Date();
    
    // 解析购物车商品列表（JSON字符串）
    let cartItemsList = [];
    if (cartItems) {
      try {
        cartItemsList = typeof cartItems === 'string' ? JSON.parse(cartItems) : cartItems;
      } catch (e) {
        console.error('解析购物车商品列表失败:', e);
      }
    }

    // 查询用户可用的优惠券
    const userCoupons = await UserCoupon.find({
      userId: req.userId,
      status: 'available'
    }).populate('couponId').sort({ createdAt: -1 });

    const usableCoupons = userCoupons
      .filter(uc => {
        const coupon = uc.couponId;
        if (!coupon) return false;
        
        // 检查是否过期
        if (coupon.expireTime && new Date(coupon.expireTime) < now) {
          return false;
        }
        
        // 特定商品免单券：检查购物车中是否有该商品
        if (coupon.type === 'freeProduct' && coupon.productId) {
          const couponProductIdStr = coupon.productId.toString();
          const hasProduct = cartItemsList.some(item => {
            if (!item.checked || !item.productId) return false;
            // 统一转换为字符串进行比较
            const itemProductIdStr = typeof item.productId === 'object' 
              ? item.productId.toString() 
              : String(item.productId);
            return itemProductIdStr === couponProductIdStr;
          });
          if (!hasProduct) {
            return false; // 购物车中没有该商品，不可用
          }
        }
        
        // 检查是否满足使用条件（最低消费金额）
        if (orderAmount > 0 && coupon.minAmount > 0 && orderAmount < coupon.minAmount) {
          return false;
        }
        
        return true;
      })
      .map(uc => {
        const coupon = uc.couponId;
        let discountAmount = 0;
        
        // 计算优惠金额
        if (coupon.type === 'discount') {
          // 折扣券：按百分比计算
          discountAmount = Math.round(orderAmount * (coupon.value / 100) * 100) / 100;
        } else if (coupon.type === 'reduce') {
          // 满减券：直接减金额
          discountAmount = coupon.value;
        } else if (coupon.type === 'freeProduct' && coupon.productId) {
          // 特定商品免单券：只减免一个商品的价格（一张券只能免一次）
          const couponProductIdStr = coupon.productId.toString();
          for (const item of cartItemsList) {
            if (item.checked && item.productId) {
              // 统一转换为字符串进行比较
              const itemProductIdStr = typeof item.productId === 'object' 
                ? item.productId.toString() 
                : String(item.productId);
              
              if (itemProductIdStr === couponProductIdStr) {
                // 只减免一个商品的价格，不是所有数量
                const itemPrice = parseFloat(item.price) || 0;
                discountAmount = itemPrice; // 只减免一个商品的价格
                break; // 找到第一个匹配的商品后立即退出
              }
            }
          }
        }
        
        return {
          id: uc._id,
          userCouponId: uc._id,
          couponId: coupon._id,
          name: coupon.name,
          desc: coupon.desc,
          type: coupon.type,
          value: coupon.value,
          minAmount: coupon.minAmount,
          productId: coupon.productId || null, // 特定商品免单券关联的商品ID
          expireTime: coupon.expireTime,
          discountAmount: discountAmount
        };
      });

    success(res, usableCoupons);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 使用优惠券（在订单支付成功后调用）
router.post('/use/:userCouponId', auth, async (req, res) => {
  try {
    const { userCouponId } = req.params;
    
    const userCoupon = await UserCoupon.findOne({
      _id: userCouponId,
      userId: req.userId,
      status: 'available'
    }).populate('couponId');

    if (!userCoupon) {
      return error(res, '优惠券不存在或已使用', 404);
    }

    const coupon = userCoupon.couponId;
    if (!coupon) {
      return error(res, '优惠券信息不存在', 404);
    }

    // 检查是否过期
    if (coupon.expireTime && new Date(coupon.expireTime) < new Date()) {
      userCoupon.status = 'expired';
      await userCoupon.save();
      return error(res, '优惠券已过期', 400);
    }

    // 更新优惠券状态
    userCoupon.status = 'used';
    userCoupon.usedTime = new Date();
    await userCoupon.save();

    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 获取通知中心可领取的优惠券（已发放的优惠券）
router.get('/distributed', auth, async (req, res) => {
  try {
    const now = new Date();
    
    // 查询已发放且未过期的优惠券
    const coupons = await Coupon.find({
      isDistributed: true,
      $or: [
        { expireTime: { $gt: now } },
        { expireTime: null }
      ]
    }).sort({ createdAt: -1 });

    // 获取用户已领取的优惠券ID列表
    const userCoupons = await UserCoupon.find({
      userId: req.userId,
      status: { $in: ['available', 'used'] }
    }).select('couponId');
    
    const receivedCouponIds = userCoupons.map(uc => uc.couponId.toString());

    const list = coupons
      .filter(coupon => {
        // 检查库存
        const hasStock = coupon.totalCount === -1 || coupon.usedCount < coupon.totalCount;
        return hasStock;
      })
      .map(coupon => {
        const isReceived = receivedCouponIds.includes(coupon._id.toString());
        
        return {
          id: coupon._id,
          name: coupon.name,
          desc: coupon.desc,
          type: coupon.type,
          value: coupon.value,
          minAmount: coupon.minAmount,
          expireTime: coupon.expireTime,
          isReceived,
          remainingCount: coupon.totalCount === -1 ? -1 : (coupon.totalCount - coupon.usedCount)
        };
      });

    success(res, list);
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
