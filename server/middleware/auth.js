const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 用户认证中间件
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        code: 401,
        message: '未授权，请先登录',
        data: null
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在',
        data: null
      });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    res.status(401).json({
      code: 401,
      message: 'Token无效或已过期',
      data: null
    });
  }
};

// 商家认证中间件
const merchantAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        code: 401,
        message: '未授权，请先登录',
        data: null
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const Merchant = require('../models/Merchant');
    const merchant = await Merchant.findById(decoded.merchantId);
    
    if (!merchant) {
      return res.status(401).json({
        code: 401,
        message: '商家不存在',
        data: null
      });
    }

    req.merchant = merchant;
    req.merchantId = merchant._id;
    next();
  } catch (error) {
    res.status(401).json({
      code: 401,
      message: 'Token无效或已过期',
      data: null
    });
  }
};

module.exports = { auth, merchantAuth };
