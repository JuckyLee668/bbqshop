const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const UserCoupon = require('../models/UserCoupon');
const { auth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

// 获取优惠券列表
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

    const list = userCoupons.map(uc => {
      const coupon = uc.couponId;
      return {
        id: uc._id,
        name: coupon.name,
        desc: coupon.desc,
        type: coupon.type,
        value: coupon.value,
        minAmount: coupon.minAmount,
        status: uc.status,
        expireTime: coupon.expireTime
      };
    });

    success(res, list);
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
