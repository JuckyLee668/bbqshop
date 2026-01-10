const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Order = require('../models/Order');
const { auth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

// 所有路由需要认证
router.use(auth);

// 创建评价
router.post('/', async (req, res) => {
  try {
    const { orderId, productId, rating, content, images } = req.body;
    const userId = req.userId;

    if (!orderId || !productId || !rating) {
      return error(res, '缺少必要参数', 400);
    }

    if (rating < 1 || rating > 5) {
      return error(res, '评分必须在1-5之间', 400);
    }

    // 检查订单是否存在且属于当前用户
    const order = await Order.findOne({
      _id: orderId,
      userId: userId,
      status: 'completed'
    });

    if (!order) {
      return error(res, '订单不存在或未完成，无法评价', 404);
    }

    // 检查是否已经评价过
    const existingReview = await Review.findOne({ orderId });
    if (existingReview) {
      return error(res, '该订单已评价', 400);
    }

    // 创建评价
    const review = new Review({
      orderId,
      userId,
      productId,
      rating,
      content: content || '',
      images: images || []
    });

    await review.save();

    success(res, {
      id: review._id,
      rating: review.rating,
      content: review.content,
      images: review.images
    });
  } catch (err) {
    if (err.code === 11000) {
      return error(res, '该订单已评价', 400);
    }
    error(res, err.message, 500);
  }
});

// 获取订单的评价
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.userId;

    // 检查订单是否属于当前用户
    const order = await Order.findOne({
      _id: orderId,
      userId: userId
    });

    if (!order) {
      return error(res, '订单不存在', 404);
    }

    const review = await Review.findOne({ orderId })
      .populate('userId', 'nickName avatarUrl')
      .lean();

    if (!review) {
      return success(res, null);
    }

    success(res, {
      id: review._id,
      rating: review.rating,
      content: review.content,
      images: review.images,
      merchantReply: review.merchantReply,
      merchantReplyTime: review.merchantReplyTime,
      userInfo: {
        nickName: review.userId?.nickName || '微信用户',
        avatarUrl: review.userId?.avatarUrl
      },
      createdAt: review.createdAt
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 获取商品的所有评价
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, pageSize = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [reviews, total] = await Promise.all([
      Review.find({ productId })
        .populate('userId', 'nickName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments({ productId })
    ]);

    const list = reviews.map(review => ({
      id: review._id,
      rating: review.rating,
      content: review.content,
      images: review.images,
      merchantReply: review.merchantReply,
      merchantReplyTime: review.merchantReplyTime,
      userInfo: {
        nickName: review.userId?.nickName || '微信用户',
        avatarUrl: review.userId?.avatarUrl
      },
      createdAt: review.createdAt
    }));

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

module.exports = router;
