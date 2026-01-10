const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { success, error } = require('../utils/response');
const { merchantAuth, auth } = require('../middleware/auth');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

// 上传图片（需要商家认证）
router.post('/image', merchantAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return error(res, '没有上传文件', 400);
    }

    const url = `/uploads/${req.file.filename}`;
    success(res, { url });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 用户上传头像（需要用户认证）
router.post('/avatar', auth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return error(res, '没有上传文件', 400);
    }

    const url = `/uploads/${req.file.filename}`;
    success(res, { url });
  } catch (err) {
    error(res, err.message, 500);
  }
});

// 通用上传接口（需要用户认证，用于评价图片等）
router.post('/', auth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return error(res, '没有上传文件', 400);
    }

    const url = `/uploads/${req.file.filename}`;
    success(res, { url });
  } catch (err) {
    error(res, err.message, 500);
  }
});

module.exports = router;
