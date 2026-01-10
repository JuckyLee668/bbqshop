const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

// 所有路由需要认证
router.use(auth);

// 获取购物车
router.get('/', async (req, res) => {
  try {
    const carts = await Cart.find({ userId: req.userId })
      .populate('productId', 'name price images')
      .sort({ createdAt: -1 });

    const list = carts.map(cart => ({
      id: cart._id,
      productId: cart.productId._id,
      productName: cart.productId.name,
      price: cart.productId.price,
      quantity: cart.quantity,
      spec: cart.spec,
      image: cart.productId.images?.[0],
      checked: cart.checked !== false
    }));

    const totalPrice = list
      .filter(item => item.checked)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    const selectedCount = list
      .filter(item => item.checked)
      .reduce((sum, item) => sum + item.quantity, 0);

    success(res, {
      list,
      totalPrice,
      selectedCount
    });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 添加商品到购物车
router.post('/add', async (req, res) => {
  try {
    const { productId, quantity, flavor, spicy, addons, spec } = req.body;
    
    console.log('收到添加购物车请求:', {
      productId,
      quantity,
      flavor,
      spicy,
      addons,
      spec,
      userId: req.userId
    });

    if (!productId) {
      return error(res, '缺少商品ID', 400);
    }

    // 验证 productId 格式
    if (!require('mongoose').Types.ObjectId.isValid(productId)) {
      return error(res, '商品ID格式不正确', 400);
    }

    const product = await Product.findById(productId);
    if (!product) {
      return error(res, '商品不存在', 404);
    }

    // 规范化 addons 数组
    // 注意：Product 的 addons 没有 id，小程序可能使用索引或名称来标识
    let normalizedAddons = [];
    if (Array.isArray(addons) && addons.length > 0) {
      normalizedAddons = addons.map(addon => {
        try {
          // 如果没有 id，使用 name 作为标识
          let addonId = addon.id;
          
          // 如果 id 是数字（索引），转换为字符串
          if (typeof addonId === 'number') {
            addonId = String(addonId);
          }
          
          // 如果 id 是有效的 ObjectId 字符串，转换为 ObjectId
          if (typeof addonId === 'string' && require('mongoose').Types.ObjectId.isValid(addonId) && addonId.length === 24) {
            addonId = new require('mongoose').Types.ObjectId(addonId);
          }
          
          // 如果没有 id，使用 name 作为标识
          if (!addonId && addon.name) {
            addonId = addon.name;
          }
          
          if (!addonId) {
            console.warn('addon 缺少标识:', addon);
            return null;
          }
          
          return {
            id: addonId,
            name: addon.name || '',
            price: addon.price || 0
          };
        } catch (e) {
          console.error('处理 addon 失败:', e, addon);
          return null;
        }
      }).filter(addon => addon && (addon.id !== null && addon.id !== undefined));
    }

    // 规范化 flavor 和 spicy（将 undefined/null/空字符串统一处理）
    const normalizedFlavor = (flavor && typeof flavor === 'string' && flavor.trim()) || null;
    const normalizedSpicy = (spicy && typeof spicy === 'string' && spicy.trim()) || null;

    // 查找该用户该商品的所有购物车项
    const allCarts = await Cart.find({
      userId: req.userId,
      productId
    });

    // 检查是否有完全匹配的（包括 flavor、spicy 和 addons）
    let existingCart = null;
    for (const cart of allCarts) {
      // 比较 flavor
      const cartFlavor = (cart.flavor && typeof cart.flavor === 'string' && cart.flavor.trim()) || null;
      if (cartFlavor !== normalizedFlavor) continue;

      // 比较 spicy
      const cartSpicy = (cart.spicy && typeof cart.spicy === 'string' && cart.spicy.trim()) || null;
      if (cartSpicy !== normalizedSpicy) continue;

      // 比较 addons
      const cartAddons = cart.addons || [];
      
      // 如果都是空数组，匹配
      if (normalizedAddons.length === 0 && cartAddons.length === 0) {
        existingCart = cart;
        break;
      }
      
      // 如果长度不同，不匹配
      if (normalizedAddons.length !== cartAddons.length) continue;
      
      // 比较每个 addon 的 id（排序后比较）
      const cartAddonIds = cartAddons
        .map(a => {
          if (a.id) {
            return typeof a.id === 'object' ? a.id.toString() : String(a.id);
          }
          return null;
        })
        .filter(id => id)
        .sort();
      const newAddonIds = normalizedAddons
        .map(a => {
          if (a.id) {
            return typeof a.id === 'object' ? a.id.toString() : String(a.id);
          }
          return null;
        })
        .filter(id => id)
        .sort();
      
      if (JSON.stringify(cartAddonIds) === JSON.stringify(newAddonIds)) {
        existingCart = cart;
        break;
      }
    }

    if (existingCart) {
      // 如果已存在相同规格，增加数量
      existingCart.quantity += (quantity || 1);
      await existingCart.save();
      return success(res, { cartItemId: existingCart._id });
    }

    // 创建新的购物车项
    const cartData = {
      userId: req.userId,
      productId,
      quantity: quantity || 1
    };

    if (normalizedFlavor) cartData.flavor = normalizedFlavor;
    if (normalizedSpicy) cartData.spicy = normalizedSpicy;
    if (normalizedAddons.length > 0) cartData.addons = normalizedAddons;
    if (spec) cartData.spec = spec;

    const cart = new Cart(cartData);
    console.log('准备保存购物车项:', cartData);

    try {
      await cart.save();
      console.log('购物车项保存成功:', cart._id);
      success(res, { cartItemId: cart._id });
    } catch (saveErr) {
      // 如果是唯一索引冲突，可能是数据库中有旧索引
      if (saveErr.code === 11000) {
        console.error('唯一索引冲突，可能是数据库索引问题:', saveErr);
        // 尝试删除旧索引并重试
        try {
          await Cart.collection.dropIndex('user_1').catch(() => {});
          await Cart.collection.dropIndex('userId_1').catch(() => {});
          // 重新创建用户
          const retryCart = new Cart(cartData);
          await retryCart.save();
          console.log('清理索引后，购物车项保存成功，ID:', retryCart._id);
          return success(res, { cartItemId: retryCart._id });
        } catch (retryErr) {
          throw new Error('创建购物车项失败，请检查数据库索引配置。错误：' + retryErr.message);
        }
      } else {
        throw saveErr;
      }
    }
  } catch (err) {
    console.error('添加购物车失败 - 详细错误:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code
    });
    error(res, err.message || '添加购物车失败', 500);
  }
});

// 清空购物车（必须在 /:id 之前定义，否则 /clear 会被当作 id）
router.delete('/clear', async (req, res) => {
  try {
    await Cart.deleteMany({ userId: req.userId });
    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 更新购物车商品数量
router.put('/:id', async (req, res) => {
  try {
    const { quantity, checked } = req.body;
    const cart = await Cart.findOne({ _id: req.params.id, userId: req.userId });

    if (!cart) {
      return error(res, '购物车项不存在', 404);
    }

    if (quantity !== undefined) cart.quantity = quantity;
    if (checked !== undefined) cart.checked = checked;
    
    await cart.save();
    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 删除购物车商品
router.delete('/:id', async (req, res) => {
  try {
    await Cart.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
