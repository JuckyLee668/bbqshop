const express = require('express');
const router = express.Router();
const SpecialPackage = require('../models/SpecialPackage');
const Product = require('../models/Product');
const { success, error } = require('../utils/response');
const { merchantAuth } = require('../middleware/auth');

// 获取特价套餐列表
router.get('/', merchantAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [list, total] = await Promise.all([
      SpecialPackage.find()
        .populate('products.productId', 'name price images')
        .sort({ sort: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SpecialPackage.countDocuments()
    ]);

    success(res, {
      list: list.map(item => ({
        id: item._id,
        name: item.name,
        desc: item.desc,
        price: item.price,
        oldPrice: item.oldPrice,
        coverImage: item.coverImage,
        products: item.products.map(p => ({
          productId: p.productId?._id || p.productId,
          productName: p.productId?.name || '',
          quantity: p.quantity
        })),
        status: item.status,
        sort: item.sort
      })),
      total
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 获取特价套餐详情
router.get('/:id', merchantAuth, async (req, res) => {
  try {
    const specialPackage = await SpecialPackage.findById(req.params.id)
      .populate('products.productId', 'name price images');

    if (!specialPackage) {
      return error(res, '特价套餐不存在', 404);
    }

    success(res, {
      id: specialPackage._id,
      name: specialPackage.name,
      desc: specialPackage.desc,
      price: specialPackage.price,
      oldPrice: specialPackage.oldPrice,
      coverImage: specialPackage.coverImage,
      products: specialPackage.products.map(p => ({
        productId: p.productId?._id || p.productId,
        productName: p.productId?.name || '',
        quantity: p.quantity
      })),
      status: specialPackage.status,
      sort: specialPackage.sort
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 创建特价套餐
router.post('/', merchantAuth, async (req, res) => {
  try {
    const { name, desc, price, oldPrice, coverImage, products, status, sort } = req.body;

    // 如果设置为激活，先取消其他激活的特价套餐
    if (status === 'active') {
      await SpecialPackage.updateMany(
        { _id: { $ne: null } },
        { $set: { status: 'inactive' } }
      );
    }

    const specialPackage = new SpecialPackage({
      name,
      desc,
      price,
      oldPrice,
      coverImage,
      products: products || [],
      status: status || 'active',
      sort: sort || 0
    });

    await specialPackage.save();
    success(res, { id: specialPackage._id });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 更新特价套餐
router.put('/:id', merchantAuth, async (req, res) => {
  try {
    const { name, desc, price, oldPrice, coverImage, products, status, sort } = req.body;

    // 如果设置为激活，先取消其他激活的特价套餐
    if (status === 'active') {
      await SpecialPackage.updateMany(
        { _id: { $ne: req.params.id } },
        { $set: { status: 'inactive' } }
      );
    }

    await SpecialPackage.findByIdAndUpdate(req.params.id, {
      name,
      desc,
      price,
      oldPrice,
      coverImage,
      products: products || [],
      status,
      sort
    });

    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 删除特价套餐
router.delete('/:id', merchantAuth, async (req, res) => {
  try {
    await SpecialPackage.findByIdAndDelete(req.params.id);
    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
