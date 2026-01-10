/**
 * 数据库初始化脚本 - 创建示例数据
 * 使用方法：node scripts/init-data.js
 * 
 * 此脚本会创建：
 * 1. 商品分类
 * 2. 商品数据（包含图片、口味、辣度、加料等）
 * 3. 优惠券数据
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/noodles_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB连接成功');
  console.log('开始初始化数据...\n');

  try {
    // 1. 创建商品分类
    console.log('📁 创建商品分类...');
    const categories = await createCategories();
    console.log(`✅ 已创建 ${categories.length} 个分类\n`);

    // 2. 创建商品数据
    console.log('🛍️  创建商品数据...');
    const products = await createProducts(categories);
    console.log(`✅ 已创建 ${products.length} 个商品\n`);

    // 3. 创建优惠券
    console.log('🎫 创建优惠券数据...');
    const coupons = await createCoupons();
    console.log(`✅ 已创建 ${coupons.length} 张优惠券\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 数据初始化完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ 初始化失败:', err);
    process.exit(1);
  }
})
.catch(err => {
  console.error('❌ MongoDB连接失败:', err);
  process.exit(1);
});

// 创建商品分类
async function createCategories() {
  const categoryData = [
    { name: '经典面筋', sort: 1 },
    { name: '特色套餐', sort: 2 },
    { name: '加料小食', sort: 3 },
    { name: '饮品', sort: 4 }
  ];

  const categories = [];
  for (const data of categoryData) {
    let category = await Category.findOne({ name: data.name });
    if (!category) {
      category = new Category(data);
      await category.save();
      categories.push(category);
      console.log(`  ✓ ${data.name}`);
    } else {
      console.log(`  - ${data.name} (已存在)`);
      categories.push(category);
    }
  }
  return categories;
}

// 创建商品数据
async function createProducts(categories) {
  const classicCategory = categories.find(c => c.name === '经典面筋');
  const comboCategory = categories.find(c => c.name === '特色套餐');
  const addonCategory = categories.find(c => c.name === '加料小食');

  const productData = [
    {
      name: '原味烤面筋',
      desc: '经典原味，Q弹有嚼劲，现烤现卖',
      price: 5,
      oldPrice: 6,
      stock: 100,
      categoryId: classicCategory?._id,
      status: 'on_sale',
      images: ['/uploads/product-1.jpg'], // 需要实际图片路径
      flavors: ['original', 'spicy', 'cumin'],
      spicyLevels: ['none', 'mild', 'medium', 'hot'],
      addons: [
        { name: '香菜', price: 1, image: '' },
        { name: '花生碎', price: 2, image: '' }
      ],
      sort: 1,
      tag: '限时特价'
    },
    {
      name: '香辣烤面筋',
      desc: '香辣可口，回味无穷',
      price: 6,
      oldPrice: 7,
      stock: 80,
      categoryId: classicCategory?._id,
      status: 'on_sale',
      images: ['/uploads/product-2.jpg'],
      flavors: ['spicy', 'cumin'],
      spicyLevels: ['mild', 'medium', 'hot'],
      addons: [
        { name: '香菜', price: 1, image: '' },
        { name: '花生碎', price: 2, image: '' },
        { name: '芝麻', price: 1, image: '' }
      ],
      sort: 2,
      tag: '热销'
    },
    {
      name: '孜然烤面筋',
      desc: '孜然香味浓郁，口感丰富',
      price: 6,
      stock: 90,
      categoryId: classicCategory?._id,
      status: 'on_sale',
      images: ['/uploads/product-3.jpg'],
      flavors: ['cumin', 'original'],
      spicyLevels: ['none', 'mild', 'medium'],
      addons: [
        { name: '香菜', price: 1, image: '' },
        { name: '花生碎', price: 2, image: '' }
      ],
      sort: 3
    },
    {
      name: '套餐A - 3串面筋+1串豆皮',
      desc: '超值套餐，3串面筋搭配1串豆皮',
      price: 18,
      oldPrice: 22,
      stock: 50,
      categoryId: comboCategory?._id,
      status: 'on_sale',
      images: ['/uploads/combo-1.jpg'],
      flavors: ['original', 'spicy', 'cumin'],
      spicyLevels: ['none', 'mild', 'medium', 'hot'],
      addons: [],
      sort: 1,
      tag: '限时特价'
    },
    {
      name: '套餐B - 5串面筋+2串豆皮',
      desc: '豪华套餐，5串面筋搭配2串豆皮',
      price: 28,
      oldPrice: 35,
      stock: 30,
      categoryId: comboCategory?._id,
      status: 'on_sale',
      images: ['/uploads/combo-2.jpg'],
      flavors: ['original', 'spicy', 'cumin'],
      spicyLevels: ['none', 'mild', 'medium', 'hot'],
      addons: [],
      sort: 2,
      tag: '热销'
    },
    {
      name: '烤豆皮',
      desc: '香脆可口，外酥内嫩',
      price: 3,
      stock: 120,
      categoryId: addonCategory?._id,
      status: 'on_sale',
      images: ['/uploads/addon-1.jpg'],
      flavors: ['original', 'spicy'],
      spicyLevels: ['none', 'mild', 'medium'],
      addons: [],
      sort: 1
    },
    {
      name: '烤金针菇',
      desc: '鲜嫩多汁，营养丰富',
      price: 4,
      stock: 100,
      categoryId: addonCategory?._id,
      status: 'on_sale',
      images: ['/uploads/addon-2.jpg'],
      flavors: ['original', 'spicy'],
      spicyLevels: ['none', 'mild', 'medium'],
      addons: [],
      sort: 2
    }
  ];

  const products = [];
  for (const data of productData) {
    let product = await Product.findOne({ name: data.name });
    if (!product) {
      product = new Product(data);
      await product.save();
      products.push(product);
      console.log(`  ✓ ${data.name} - ¥${data.price}`);
    } else {
      console.log(`  - ${data.name} (已存在)`);
      products.push(product);
    }
  }
  return products;
}

// 创建优惠券
async function createCoupons() {
  const couponData = [
    {
      name: '新用户专享',
      desc: '首单立减5元',
      type: 'discount',
      value: 5,
      minAmount: 0,
      totalCount: 1000,
      usedCount: 0,
      expireTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天后过期
    },
    {
      name: '满30减10',
      desc: '满30元立减10元',
      type: 'discount',
      value: 10,
      minAmount: 30,
      totalCount: 500,
      usedCount: 0,
      expireTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60天后过期
    },
    {
      name: '满50减15',
      desc: '满50元立减15元',
      type: 'discount',
      value: 15,
      minAmount: 50,
      totalCount: 300,
      usedCount: 0,
      expireTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    }
  ];

  const coupons = [];
  for (const data of couponData) {
    let coupon = await Coupon.findOne({ name: data.name });
    if (!coupon) {
      coupon = new Coupon(data);
      await coupon.save();
      coupons.push(coupon);
      console.log(`  ✓ ${data.name} - ${data.desc}`);
    } else {
      console.log(`  - ${data.name} (已存在)`);
      coupons.push(coupon);
    }
  }
  return coupons;
}
