const express = require('express');
const router = express.Router();
const PointsProduct = require('../models/PointsProduct');
const ProductVoucher = require('../models/ProductVoucher');
const UserProductVoucher = require('../models/UserProductVoucher');
const UserCoupon = require('../models/UserCoupon');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const Cart = require('../models/Cart');
const { auth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

// 获取积分商城商品列表（包含优惠券和商品券）
router.get('/shop', auth, async (req, res) => {
  try {
    const now = new Date();
    
    // 获取积分商品（优惠券类型）
    const couponProducts = await PointsProduct.find({
      status: 'active'
    }).sort({ sort: -1, createdAt: -1 });

    // 获取商品券
    const productVouchers = await ProductVoucher.find({
      status: 'active',
      $or: [
        { expireTime: { $gt: now } },
        { expireTime: null }
      ]
    }).populate('productId').sort({ createdAt: -1 });

    // 获取用户积分
    const user = await User.findById(req.userId);
    const userPoints = user.points || 0;

    // 获取用户已兑换的商品券
    const userVouchers = await UserProductVoucher.find({
      userId: req.userId,
      status: 'available'
    }).select('productVoucherId');

    const userVoucherIds = userVouchers.map(uv => uv.productVoucherId.toString());

    // 获取用户已兑换的优惠券（通过积分商品兑换的）
    const userCoupons = await UserCoupon.find({
      userId: req.userId,
      status: { $in: ['available', 'used'] }
    }).populate('couponId');
    
    // 获取所有通过积分商品兑换的优惠券名称（用于匹配）
    const userCouponNames = userCoupons
      .filter(uc => uc.couponId && uc.couponId.name)
      .map(uc => uc.couponId.name);

    // 为每个优惠券检查是否已兑换（通过名称匹配）和用户兑换次数
    const UserPointsRecord = require('../models/UserPointsRecord');
    const couponsWithStatus = await Promise.all(
      couponProducts.map(async (item) => {
        const isExchangedByName = userCouponNames.includes(item.name);
        
        // 统计用户已兑换该积分商品的次数（无论是否有每人限制，都要统计）
        const userExchangeCount = await UserPointsRecord.countDocuments({
          userId: req.userId,
          pointsProductId: item._id,
          type: 'exchange',
          status: 'completed'
        });
        
        const isExchanged = isExchangedByName || (item.maxExchangePerUser !== -1 && userExchangeCount >= item.maxExchangePerUser);
        
        return {
          id: item._id,
          name: item.name,
          desc: item.desc,
          image: item.image,
          points: item.points,
          stock: item.stock,
          usedCount: item.usedCount,
          maxExchangePerUser: item.maxExchangePerUser !== undefined ? item.maxExchangePerUser : -1,
          userExchangeCount: userExchangeCount,
          type: 'coupon',
          remainingCount: item.stock === -1 ? -1 : (item.stock - item.usedCount),
          isExchanged: isExchanged
        };
      })
    );

    success(res, {
      userPoints,
      coupons: couponsWithStatus,
      productVouchers: await Promise.all(
        productVouchers
          .filter(pv => {
            const hasStock = pv.stock === -1 || pv.usedCount < pv.stock;
            return hasStock && pv.productId;
          })
          .map(async (pv) => {
            // 统计用户已兑换该商品券的次数（无论是否有每人限制，都要统计）
            const userExchangeCount = await UserProductVoucher.countDocuments({
              userId: req.userId,
              productVoucherId: pv._id
            });
            
            const isReceived = userVoucherIds.includes(pv._id.toString());
            const isExchanged = pv.maxExchangePerUser !== -1 && userExchangeCount >= pv.maxExchangePerUser;
            
            return {
              id: pv._id,
              name: pv.name,
              desc: pv.desc,
              image: pv.image,
              productId: pv.productId._id,
              productName: pv.productId.name,
              quantity: pv.quantity,
              points: pv.points,
              stock: pv.stock,
              usedCount: pv.usedCount,
              maxExchangePerUser: pv.maxExchangePerUser,
              userExchangeCount: userExchangeCount,
              type: 'productVoucher',
              expireTime: pv.expireTime,
              isReceived: isReceived,
              isExchanged: isExchanged,
              remainingCount: pv.stock === -1 ? -1 : (pv.stock - pv.usedCount)
            };
          })
      )
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 兑换优惠券（用积分兑换优惠券）
router.post('/exchange/coupon/:couponId', auth, async (req, res) => {
  try {
    const { couponId } = req.params;
    
    // 查找优惠券（通过积分商品ID）
    const pointsProduct = await PointsProduct.findById(couponId);
    if (!pointsProduct) {
      return error(res, '优惠券不存在', 404);
    }

    // 检查状态
    if (pointsProduct.status !== 'active') {
      return error(res, '优惠券已下架', 400);
    }

    // 检查库存
    if (pointsProduct.stock !== -1 && pointsProduct.usedCount >= pointsProduct.stock) {
      return error(res, '优惠券已兑换完', 400);
    }

    // 获取用户信息
    const user = await User.findById(req.userId);
    if (!user) {
      return error(res, '用户不存在', 404);
    }

    // 检查积分是否足够
    if (user.points < pointsProduct.points) {
      return error(res, `积分不足，需要${pointsProduct.points}积分`, 400);
    }

    // 检查用户是否已兑换过（如果有限制）
    // 这里可以根据业务需求添加限制逻辑

    // 查找或创建关联的优惠券
    let coupon;
    const existingCoupon = await Coupon.findOne({ name: pointsProduct.name });
    
    if (existingCoupon) {
      coupon = existingCoupon;
    } else {
      // 根据积分商品的配置创建对应的优惠券
      const couponType = pointsProduct.couponType || 'reduce';
      const couponValue = pointsProduct.couponValue !== undefined ? pointsProduct.couponValue : 5;
      const couponMinAmount = pointsProduct.couponMinAmount !== undefined ? pointsProduct.couponMinAmount : 0;
      
      coupon = new Coupon({
        name: pointsProduct.name,
        desc: pointsProduct.desc,
        type: couponType,
        value: couponValue,
        minAmount: couponMinAmount,
        productId: pointsProduct.productId || undefined, // 特定商品免单券关联的商品ID
        totalCount: -1, // 不限制使用次数
        usedCount: 0,
        isDistributed: false
      });
      await coupon.save();
    }

    // 创建用户优惠券
    const userCoupon = new UserCoupon({
      userId: req.userId,
      couponId: coupon._id,
      status: 'available'
    });
    await userCoupon.save();

    // 扣除用户积分
    user.points -= pointsProduct.points;
    await user.save();

    // 更新积分商品使用计数
    pointsProduct.usedCount += 1;
    await pointsProduct.save();

    // 记录积分使用记录
    const UserPointsRecord = require('../models/UserPointsRecord');
    const record = new UserPointsRecord({
      userId: req.userId,
      pointsProductId: pointsProduct._id,
      type: 'exchange',
      points: -pointsProduct.points,
      description: `兑换优惠券：${pointsProduct.name}`,
      status: 'completed'
    });
    await record.save();

    success(res, {
      userCouponId: userCoupon._id,
      couponId: coupon._id,
      remainingPoints: user.points
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 兑换商品券
router.post('/exchange/product-voucher/:voucherId', auth, async (req, res) => {
  try {
    const { voucherId } = req.params;
    
    // 查找商品券
    const productVoucher = await ProductVoucher.findById(voucherId).populate('productId');
    if (!productVoucher || !productVoucher.productId) {
      return error(res, '商品券不存在', 404);
    }

    // 检查状态
    if (productVoucher.status !== 'active') {
      return error(res, '商品券已下架', 400);
    }

    // 检查是否过期
    if (productVoucher.expireTime && new Date(productVoucher.expireTime) < new Date()) {
      return error(res, '商品券已过期', 400);
    }

    // 检查库存
    if (productVoucher.stock !== -1 && productVoucher.usedCount >= productVoucher.stock) {
      return error(res, '商品券已兑换完', 400);
    }

    // 获取用户信息
    const user = await User.findById(req.userId);
    if (!user) {
      return error(res, '用户不存在', 404);
    }

    // 检查积分是否足够
    if (user.points < productVoucher.points) {
      return error(res, `积分不足，需要${productVoucher.points}积分`, 400);
    }

    // 检查每人兑换次数限制
    if (productVoucher.maxExchangePerUser !== -1) {
      // 统计用户已兑换该商品券的次数（包括已使用和未使用的）
      const userExchangeCount = await UserProductVoucher.countDocuments({
        userId: req.userId,
        productVoucherId: voucherId
      });
      
      if (userExchangeCount >= productVoucher.maxExchangePerUser) {
        return error(res, `您已达到兑换上限，每人最多可兑换${productVoucher.maxExchangePerUser}次`, 400);
      }
    } else {
      // 如果没有限制每人兑换次数，但限制每人只能兑换一次（默认行为）
      const existingVoucher = await UserProductVoucher.findOne({
        userId: req.userId,
        productVoucherId: voucherId,
        status: 'available'
      });

      if (existingVoucher) {
        return error(res, '您已兑换过此商品券', 400);
      }
    }

    // 创建用户商品券
    const userProductVoucher = new UserProductVoucher({
      userId: req.userId,
      productVoucherId: voucherId,
      status: 'available'
    });
    await userProductVoucher.save();

    // 扣除用户积分
    user.points -= productVoucher.points;
    await user.save();

    // 更新商品券使用计数
    productVoucher.usedCount += 1;
    await productVoucher.save();

    // 记录积分使用记录
    const UserPointsRecord = require('../models/UserPointsRecord');
    const record = new UserPointsRecord({
      userId: req.userId,
      productVoucherId: voucherId,
      type: 'exchange',
      points: -productVoucher.points,
      description: `兑换商品券：${productVoucher.name}（${productVoucher.quantity}${productVoucher.productId.name}）`,
      status: 'completed'
    });
    await record.save();

    success(res, {
      userVoucherId: userProductVoucher._id,
      remainingPoints: user.points
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 获取用户商品券列表
router.get('/product-vouchers', auth, async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = { userId: req.userId };
    if (status) {
      query.status = status;
    }

    const userVouchers = await UserProductVoucher.find(query)
      .populate('productVoucherId')
      .sort({ createdAt: -1 });

    const now = new Date();
    const list = userVouchers
      .filter(uv => uv.productVoucherId)
      .map(uv => {
        const voucher = uv.productVoucherId;
        let actualStatus = uv.status;
        
        // 检查是否过期
        if (actualStatus === 'available' && voucher.expireTime && new Date(voucher.expireTime) < now) {
          actualStatus = 'expired';
          // 异步更新状态
          uv.status = 'expired';
          uv.save().catch(err => console.error('更新商品券状态失败:', err));
        }

        // 获取商品信息
        const product = voucher.productId;
        const productName = product && product.name ? product.name : '商品';

        return {
          id: uv._id,
          voucherId: voucher._id,
          name: voucher.name,
          desc: voucher.desc,
          image: voucher.image,
          productId: product ? product._id : voucher.productId,
          productName: productName,
          quantity: voucher.quantity,
          status: actualStatus,
          expireTime: voucher.expireTime,
          usedTime: uv.usedTime,
          createdAt: uv.createdAt
        };
      });

    success(res, list);
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
