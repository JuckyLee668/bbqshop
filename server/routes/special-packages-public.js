const express = require('express');
const router = express.Router();
const SpecialPackage = require('../models/SpecialPackage');
const Product = require('../models/Product');
const { success, error } = require('../utils/response');

// 获取当前启用的特价套餐
router.get('/active', async (req, res) => {
  try {
    const specialPackage = await SpecialPackage.findOne({ status: 'active' })
      .populate('products.productId', 'name desc price images tag')
      .sort({ sort: -1, createdAt: -1 });

    if (!specialPackage) {
      return success(res, null);
    }

    const products = specialPackage.products.map(p => ({
      productId: p.productId?._id || p.productId,
      productName: p.productId?.name || '',
      desc: p.productId?.desc || '',
      price: p.productId?.price || 0,
      image: (p.productId?.images && p.productId.images[0]) || '',
      quantity: p.quantity,
      tag: p.productId?.tag || ''
    }));

    const mainProductId = products[0]?.productId || null;

    success(res, {
      id: specialPackage._id,
      name: specialPackage.name,
      desc: specialPackage.desc,
      price: specialPackage.price,
      oldPrice: specialPackage.oldPrice,
      coverImage: specialPackage.coverImage,
      tag: '特价套餐',
      products,
      mainProductId
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 获取指定特价套餐详情
router.get('/:id', async (req, res) => {
  try {
    const specialPackage = await SpecialPackage.findById(req.params.id)
      .populate('products.productId', 'name desc price images tag');

    if (!specialPackage) {
      return error(res, '特价套餐不存在', 404);
    }

    const products = specialPackage.products.map(p => ({
      productId: p.productId?._id || p.productId,
      productName: p.productId?.name || '',
      desc: p.productId?.desc || '',
      price: p.productId?.price || 0,
      image: (p.productId?.images && p.productId.images[0]) || '',
      quantity: p.quantity,
      tag: p.productId?.tag || ''
    }));

    const mainProductId = products[0]?.productId || null;

    success(res, {
      id: specialPackage._id,
      name: specialPackage.name,
      desc: specialPackage.desc,
      price: specialPackage.price,
      oldPrice: specialPackage.oldPrice,
      coverImage: specialPackage.coverImage,
      tag: '特价套餐',
      products,
      mainProductId
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;

