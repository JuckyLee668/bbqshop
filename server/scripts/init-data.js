/**
 * 数据库初始化脚本 - 创建示例数据
 * 使用方法：node scripts/init-data.js
 * 
 * 此脚本会创建：
 * 1. 商品分类
 * 2. 商品数据（包含图片、口味、辣度、加料等）
 * 3. 优惠券数据
 * 4. 积分商品（积分商城）
 * 5. 商品券
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const PointsProduct = require('../models/PointsProduct');
const ProductVoucher = require('../models/ProductVoucher');

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

    // 4. 创建积分商品
    console.log('🎁 创建积分商品...');
    const pointsProducts = await createPointsProducts(products);
    console.log(`✅ 已创建 ${pointsProducts.length} 个积分商品\n`);

    // 5. 创建商品券
    console.log('🎟️  创建商品券...');
    const productVouchers = await createProductVouchers(products);
    console.log(`✅ 已创建 ${productVouchers.length} 个商品券\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 数据初始化完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ 初始化失败:', err);
    await mongoose.connection.close();
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
      flavors: ['原味', '香辣', '孜然'],
      spicyLevels: ['不辣', '微辣', '中辣', '特辣'],
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
      flavors: ['香辣', '孜然'],
      spicyLevels: ['微辣', '中辣', '特辣'],
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
      flavors: ['孜然', '原味'],
      spicyLevels: ['不辣', '微辣', '中辣'],
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
      flavors: ['原味', '香辣', '孜然'],
      spicyLevels: ['不辣', '微辣', '中辣', '特辣'],
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
      flavors: ['原味', '香辣', '孜然'],
      spicyLevels: ['不辣', '微辣', '中辣', '特辣'],
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
      flavors: ['原味', '香辣'],
      spicyLevels: ['不辣', '微辣', '中辣'],
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
      flavors: ['原味', '香辣'],
      spicyLevels: ['不辣', '微辣', '中辣'],
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
      type: 'reduce',
      value: 5,
      minAmount: 0,
      totalCount: 1000,
      usedCount: 0,
      expireTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天后过期
    },
    {
      name: '满30减10',
      desc: '满30元立减10元',
      type: 'reduce',
      value: 10,
      minAmount: 30,
      totalCount: 500,
      usedCount: 0,
      expireTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60天后过期
    },
    {
      name: '满50减15',
      desc: '满50元立减15元',
      type: 'reduce',
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

// 创建积分商品
async function createPointsProducts(products) {
  const pointsProductData = [
    {
      name: '满30减10优惠券',
      desc: '满30元立减10元优惠券',
      image: '/uploads/coupon-1.jpg',
      points: 50,
      stock: 100,
      usedCount: 0,
      maxExchangePerUser: 3,
      status: 'active',
      sort: 1,
      couponType: 'reduce',
      couponValue: 10,
      couponMinAmount: 30
    },
    {
      name: '5折优惠券',
      desc: '全场5折优惠券',
      image: '/uploads/coupon-2.jpg',
      points: 100,
      stock: 50,
      usedCount: 0,
      maxExchangePerUser: 2,
      status: 'active',
      sort: 2,
      couponType: 'discount',
      couponValue: 50,
      couponMinAmount: 0
    },
    {
      name: '孜然烤面筋免单券',
      desc: '兑换后可免费获得一份孜然烤面筋',
      image: '/uploads/coupon-3.jpg',
      points: 30,
      stock: 200,
      usedCount: 0,
      maxExchangePerUser: 5,
      status: 'active',
      sort: 3,
      couponType: 'freeProduct',
      couponValue: 0,
      couponMinAmount: 0,
      productId: products.find(p => p.name === '孜然烤面筋')?._id
    }
  ];

  const pointsProducts = [];
  for (const data of pointsProductData) {
    // 如果是特定商品免单券，检查关联商品是否存在
    if (data.couponType === 'freeProduct' && data.productId) {
      const product = products.find(p => p._id.toString() === data.productId.toString());
      if (!product) {
        console.log(`  - ${data.name} (关联商品不存在，跳过)`);
        continue;
      }
    }

    let pointsProduct = await PointsProduct.findOne({ name: data.name });
    if (!pointsProduct) {
      pointsProduct = new PointsProduct(data);
      await pointsProduct.save();
      pointsProducts.push(pointsProduct);
      console.log(`  ✓ ${data.name} - ${data.points}积分`);
    } else {
      console.log(`  - ${data.name} (已存在)`);
      pointsProducts.push(pointsProduct);
    }
  }
  return pointsProducts;
}

// 创建商品券
async function createProductVouchers(products) {
  const productVoucherData = [
    {
      name: '10串面筋券',
      desc: '兑换后可获得10串原味烤面筋',
      image: '/uploads/voucher-1.jpg',
      productId: products.find(p => p.name === '原味烤面筋')?._id,
      quantity: 10,
      points: 40,
      stock: 100,
      usedCount: 0,
      maxExchangePerUser: 3,
      status: 'active',
      expireTime: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    },
    {
      name: '5串面筋券',
      desc: '兑换后可获得5串香辣烤面筋',
      image: '/uploads/voucher-2.jpg',
      productId: products.find(p => p.name === '香辣烤面筋')?._id,
      quantity: 5,
      points: 25,
      stock: 200,
      usedCount: 0,
      maxExchangePerUser: 5,
      status: 'active',
      expireTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    }
  ];

  const productVouchers = [];
  for (const data of productVoucherData) {
    if (!data.productId) {
      console.log(`  - ${data.name} (关联商品不存在，跳过)`);
      continue;
    }

    let productVoucher = await ProductVoucher.findOne({ name: data.name });
    if (!productVoucher) {
      productVoucher = new ProductVoucher(data);
      await productVoucher.save();
      productVouchers.push(productVoucher);
      console.log(`  ✓ ${data.name} - ${data.points}积分`);
    } else {
      console.log(`  - ${data.name} (已存在)`);
      productVouchers.push(productVoucher);
    }
  }
  return productVouchers;
}
