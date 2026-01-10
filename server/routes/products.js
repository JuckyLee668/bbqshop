const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const { success, error } = require('../utils/response');

// 获取商品列表
router.get('/', async (req, res) => {
  try {
    const { categoryId, page = 1, pageSize = 10, keyword } = req.query;
    
    const query = { status: 'on_sale' };
    
    if (categoryId && categoryId !== '0') {
      query.categoryId = categoryId;
    }
    
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { desc: { $regex: keyword, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [list, total] = await Promise.all([
      Product.find(query)
        .populate('categoryId', 'name')
        .sort({ sort: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query)
    ]);

    success(res, {
      list: list.map(item => ({
        id: item._id,
        name: item.name,
        desc: item.desc,
        price: item.price,
        oldPrice: item.oldPrice,
        image: item.images?.[0] || '',
        images: item.images || [],
        stock: item.stock,
        tag: item.tag,
        categoryId: item.categoryId?._id || item.categoryId,
        categoryName: item.categoryId?.name || ''
      })),
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 获取商品详情
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name');

    if (!product) {
      return error(res, '商品不存在', 404);
    }

    success(res, {
      id: product._id,
      name: product.name,
      desc: product.desc,
      price: product.price,
      oldPrice: product.oldPrice,
      images: product.images || [],
      stock: product.stock,
      status: product.stock > 0 ? '有货' : '缺货',
      flavors: product.flavors?.map(f => ({
        value: f,
        label: f === 'original' ? '原味' : f === 'spicy' ? '香辣' : '孜然'
      })) || [],
      spicyLevels: product.spicyLevels?.map(s => ({
        value: s,
        label: s === 'none' ? '不辣' : s === 'mild' ? '微辣' : s === 'medium' ? '中辣' : '重辣'
      })) || [],
      addons: product.addons || [],
      enableAddons: product.enableAddons !== false
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
