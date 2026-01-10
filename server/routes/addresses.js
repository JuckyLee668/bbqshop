const express = require('express');
const router = express.Router();
const Address = require('../models/Address');
const { auth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

// 所有路由需要认证
router.use(auth);

// 获取地址列表
router.get('/', async (req, res) => {
  try {
    // 不按默认地址排序，保持创建时间顺序
    const addresses = await Address.find({ userId: req.userId })
      .sort({ createdAt: -1 });

    success(res, addresses.map(addr => ({
      id: addr._id,
      name: addr.name,
      phone: addr.phone,
      address: addr.address,
      detail: addr.detail,
      latitude: addr.latitude,
      longitude: addr.longitude,
      isDefault: addr.isDefault
    })));
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 添加地址
router.post('/', async (req, res) => {
  try {
    const { name, phone, address, detail, latitude, longitude, isDefault } = req.body;

    if (!name || !phone || !address) {
      return error(res, '缺少必要参数', 400);
    }

    // 如果设置为默认地址，取消其他默认地址
    if (isDefault) {
      await Address.updateMany(
        { userId: req.userId },
        { $set: { isDefault: false } }
      );
    }

    const newAddress = new Address({
      userId: req.userId,
      name,
      phone,
      address,
      detail,
      latitude,
      longitude,
      isDefault: isDefault || false
    });

    await newAddress.save();
    success(res, { id: newAddress._id });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 更新地址
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, address, detail, latitude, longitude, isDefault } = req.body;
    const addr = await Address.findOne({ _id: req.params.id, userId: req.userId });

    if (!addr) {
      return error(res, '地址不存在', 404);
    }

    if (name) addr.name = name;
    if (phone) addr.phone = phone;
    if (address) addr.address = address;
    if (detail !== undefined) addr.detail = detail;
    if (latitude !== undefined) addr.latitude = latitude;
    if (longitude !== undefined) addr.longitude = longitude;
    
    // 处理默认地址设置
    if (isDefault !== undefined) {
      if (isDefault) {
        // 如果设置为默认，先取消其他默认地址
        await Address.updateMany(
          { userId: req.userId, _id: { $ne: req.params.id } },
          { $set: { isDefault: false } }
        );
        addr.isDefault = true;
      } else {
        // 如果取消默认，直接设置为 false
        addr.isDefault = false;
      }
    }

    await addr.save();
    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 删除地址
router.delete('/:id', async (req, res) => {
  try {
    await Address.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
