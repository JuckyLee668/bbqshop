const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Merchant = require('../models/Merchant');
const SpecialPackage = require('../models/SpecialPackage');
const { success, error } = require('../utils/response');
const { auth } = require('../middleware/auth');

// 获取首页数据
router.get('/index', async (req, res) => {
  try {
    // 获取门店信息（假设只有一个商家）
    const merchant = await Merchant.findOne();
    const storeInfo = merchant ? {
      id: merchant._id,
      name: merchant.storeInfo?.name || merchant.name,
      address: merchant.storeInfo?.address || '',
      status: merchant.storeInfo?.status === 'open' ? '营业中' : '已打烊',
      businessHours: merchant.storeInfo?.businessHours || '',
      deliveryRange: merchant.storeInfo?.deliveryRange || 0,
      latitude: merchant.storeInfo?.latitude,
      longitude: merchant.storeInfo?.longitude,
      freeDeliveryThreshold: merchant.storeInfo?.freeDeliveryThreshold || 50,
      deliveryFee: merchant.storeInfo?.deliveryFee || 5,
      showDeliveryFee: merchant.storeInfo?.showDeliveryFee !== false
    } : null;

    // 获取特价套餐（优先从SpecialPackage获取）
    let special = null;
    const specialPackage = await SpecialPackage.findOne({ status: 'active' })
      .populate('products.productId', 'name desc price images')
      .sort({ sort: -1, createdAt: -1 });
    
    if (specialPackage) {
      special = {
        id: specialPackage._id,
        name: specialPackage.name,
        desc: specialPackage.desc,
        price: specialPackage.price,
        oldPrice: specialPackage.oldPrice,
        image: specialPackage.coverImage,
        tag: '特价套餐',
        type: 'package',
        products: specialPackage.products.map(p => ({
          productId: p.productId?._id || p.productId,
          productName: p.productId?.name || '',
          quantity: p.quantity
        }))
      };
    } else {
      // 如果没有特价套餐，则使用isSpecial字段的商品
      const specialProduct = await Product.findOne({ 
        isSpecial: true,
        status: 'on_sale'
      })
        .sort({ createdAt: -1 });
      
      if (specialProduct) {
        special = {
          id: specialProduct._id,
          name: specialProduct.name,
          desc: specialProduct.desc,
          price: specialProduct.price,
          oldPrice: specialProduct.oldPrice,
          image: specialProduct.images?.[0],
          tag: specialProduct.tag || '限时特价',
          type: 'product'
        };
      }
    }

    // 获取热销商品（按销量或排序）
    const hotProducts = await Product.find({ status: 'on_sale' })
      .sort({ sort: -1, createdAt: -1 })
      .limit(4)
      .select('name desc price images tag');

    // 获取新用户专享优惠券配置
    let newUserCoupon = null;
    if (merchant && merchant.storeInfo && merchant.storeInfo.newUserCoupon && merchant.storeInfo.newUserCoupon.enabled) {
      const Coupon = require('../models/Coupon');
      const UserCoupon = require('../models/UserCoupon');
      const coupon = await Coupon.findById(merchant.storeInfo.newUserCoupon.couponId);
      
      if (coupon) {
        // 检查用户是否已领取（可选认证，如果用户已登录则检查）
        let isAvailable = true;
        let isReceived = false;
        
        // 尝试获取userId（如果用户已登录）
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
          try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            const userId = decoded.userId;
            
            if (userId) {
              const existingUserCoupon = await UserCoupon.findOne({
                userId: userId,
                couponId: coupon._id,
                status: { $in: ['available', 'used'] }
              });
              
              if (existingUserCoupon) {
                isReceived = true;
                isAvailable = false;
              }
            }
          } catch (err) {
            // token无效或解析失败，忽略（允许未登录用户查看）
          }
        }
        
        // 检查库存
        if (coupon.totalCount !== -1 && coupon.usedCount >= coupon.totalCount) {
          isAvailable = false;
        }
        
        // 检查是否过期
        if (coupon.expireTime && new Date(coupon.expireTime) < new Date()) {
          isAvailable = false;
        }
        
        newUserCoupon = {
          enabled: true,
          couponId: coupon._id,
          title: merchant.storeInfo.newUserCoupon.title || '新用户专享',
          desc: merchant.storeInfo.newUserCoupon.desc || coupon.desc || '',
          isAvailable,
          isReceived
        };
      }
    }

    success(res, {
      storeInfo,
      special: special,
      hotProducts: hotProducts.map(p => ({
        id: p._id,
        name: p.name,
        desc: p.desc,
        price: p.price,
        image: p.images?.[0],
        isFavorite: false
      })),
      newUserCoupon
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
