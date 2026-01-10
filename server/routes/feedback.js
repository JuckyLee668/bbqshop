const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

// 意见反馈（可以创建Feedback模型，这里简化处理）
router.post('/', auth, async (req, res) => {
  try {
    const { content, images, contact } = req.body;

    if (!content) {
      return error(res, '反馈内容不能为空', 400);
    }

    // 这里可以保存到数据库
    // const feedback = new Feedback({ userId: req.userId, content, images, contact });
    // await feedback.save();

    success(res);
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
