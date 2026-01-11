const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config();

const app = express();

// 中间件
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 连接MongoDB
const logger = require('./utils/logger');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/noodles_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => logger.info('MongoDB连接成功'))
.catch(err => logger.error('MongoDB连接失败:', err));

// 路由
app.use('/v1/auth', require('./routes/auth'));
app.use('/v1/home', require('./routes/home'));
app.use('/v1/products', require('./routes/products'));
app.use('/v1/categories', require('./routes/categories'));
app.use('/v1/cart', require('./routes/cart'));
app.use('/v1/orders', require('./routes/orders'));
app.use('/v1/reviews', require('./routes/reviews'));
app.use('/v1/addresses', require('./routes/addresses'));
app.use('/v1/user', require('./routes/user'));
app.use('/v1/merchant', require('./routes/merchant'));
// 商家侧特价套餐管理
app.use('/v1/merchant/special-packages', require('./routes/special-packages'));
// 小程序侧特价套餐查询
app.use('/v1/special-packages', require('./routes/special-packages-public'));
app.use('/v1/upload', require('./routes/upload'));
app.use('/v1/feedback', require('./routes/feedback'));
app.use('/v1/coupons', require('./routes/coupons'));
app.use('/v1/payment', require('./routes/payment'));
app.use('/v1/points', require('./routes/points'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API服务正常运行' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  // 记录错误堆栈（生产环境应该写入日志文件）
  logger.error('请求错误:', {
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack
  });
  
  // 生产环境不返回详细错误信息
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const errorMessage = isDevelopment 
    ? err.message || '服务器错误'
    : '服务器内部错误';
  
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: errorMessage,
    data: null
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`服务器运行在端口 ${PORT}`, {
    env: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

module.exports = app;
