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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/noodles_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB连接成功'))
.catch(err => console.error('MongoDB连接失败:', err));

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

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API服务正常运行' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || '服务器错误',
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
  console.log(`服务器运行在端口 ${PORT}`);
});

module.exports = app;
