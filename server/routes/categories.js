const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { success, error } = require('../utils/response');

// 获取分类列表
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ sort: 1 });
    
    const list = [
      { id: 0, name: '全部', sort: 0 },
      ...categories.map(c => ({
        id: c._id,
        name: c.name,
        sort: c.sort
      }))
    ];

    success(res, list);
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
