const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const Review = require('../models/Review');
const { auth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

// 所有路由需要认证
router.use(auth);

// 获取用户信息
router.get('/info', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return error(res, '用户不存在', 404);
    }

    // 统计订单数
    const orderCount = await Order.countDocuments({ userId: req.userId });

    // 统计各状态订单数量
    const orderStats = await Order.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // 将统计结果转换为对象
    const statsMap = {};
    orderStats.forEach(stat => {
      statsMap[stat._id] = stat.count;
    });

    // 获取所有已完成的订单ID
    const completedOrders = await Order.find({
      userId: user._id,
      status: 'completed'
    }).select('_id').lean();

    const completedOrderIds = completedOrders.map(o => o._id);

    // 检查哪些已完成订单已经评价过
    const reviewedOrderIds = await Review.find({
      orderId: { $in: completedOrderIds }
    }).select('orderId').lean();

    const reviewedOrderIdSet = new Set(reviewedOrderIds.map(r => r.orderId.toString()));

    // 计算未评价的已完成订单数量（已评价的从已完成中排除）
    const completedCount = (statsMap.completed || 0);
    const reviewedCount = reviewedOrderIdSet.size;
    const unReviewedCompletedCount = completedCount - reviewedCount;

    // 待制作包括 pending 和 paid 状态
    const pendingCount = (statsMap.pending || 0) + (statsMap.paid || 0);

    success(res, {
      id: user._id,
      openid: user.openid,
      nickName: user.nickName,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      orderCount,
      totalConsumption: user.totalConsumption,
      points: user.points,
      orderStats: {
        pending: pendingCount, // 待制作（包括pending和paid）
        making: statsMap.making || 0, // 制作中
        completed: unReviewedCompletedCount, // 已完成（已评价的订单已排除）
        cancelled: statsMap.cancelled || 0 // 已取消
      }
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 更新用户信息
router.put('/info', async (req, res) => {
  try {
    const { nickName, avatarUrl } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return error(res, '用户不存在', 404);
    }

    // 更新昵称（如果提供且不为空）
    if (nickName && nickName.trim() && nickName.trim() !== '微信用户') {
      user.nickName = nickName.trim();
    } else if (nickName && nickName.trim() === '') {
      // 如果传入空字符串，保持原值
      // 不更新
    }
    
    // 更新头像（如果提供）
    if (avatarUrl !== undefined && avatarUrl !== null) {
      // 如果是完整URL，提取相对路径
      let relativeUrl = avatarUrl;
      if (avatarUrl.startsWith('http')) {
        // 提取相对路径（假设是服务器URL）
        const baseUrl = req.protocol + '://' + req.get('host');
        if (avatarUrl.startsWith(baseUrl)) {
          relativeUrl = avatarUrl.replace(baseUrl, '');
        } else {
          // 如果是外部URL（如微信头像），保持原样
          relativeUrl = avatarUrl;
        }
      }
      user.avatarUrl = relativeUrl.trim() || null;
    }

    await user.save();
    console.log('用户信息已更新 - nickName:', user.nickName, 'avatarUrl:', user.avatarUrl);
    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
