const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Merchant = require('../models/Merchant');
const SpecialPackage = require('../models/SpecialPackage');
const { success, error } = require('../utils/response');

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

    // 优惠活动（可以从优惠券表获取）
    const promotions = [{
      id: 1,
      title: '新用户专享',
      desc: '首单立减5元，满30减10',
      type: 'new_user'
    }];

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
      promotions
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
