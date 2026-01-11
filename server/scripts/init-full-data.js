/**
 * 完整数据库初始化脚本 - 创建所有模拟数据
 * 使用方法：node scripts/init-full-data.js
 * 
 * 此脚本会创建：
 * 1. 商户信息
 * 2. 商品分类
 * 3. 商品数据
 * 4. 特价套餐
 * 5. 优惠券
 * 6. 积分商品（积分商城）
 * 7. 商品券
 * 8. 测试用户
 * 9. 用户地址
 * 10. 购物车数据
 * 11. 订单数据
 * 12. 评价数据
 * 13. 用户优惠券
 * 14. 用户商品券
 * 15. 用户积分记录
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Merchant = require('../models/Merchant');
const Category = require('../models/Category');
const Product = require('../models/Product');
const SpecialPackage = require('../models/SpecialPackage');
const Coupon = require('../models/Coupon');
const PointsProduct = require('../models/PointsProduct');
const ProductVoucher = require('../models/ProductVoucher');
const User = require('../models/User');
const Address = require('../models/Address');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Review = require('../models/Review');
const UserCoupon = require('../models/UserCoupon');
const UserProductVoucher = require('../models/UserProductVoucher');
const UserPointsRecord = require('../models/UserPointsRecord');

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/noodles_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB连接成功');
  console.log('开始初始化完整数据...\n');
  
  // 确保在退出前关闭数据库连接
  process.on('SIGINT', async () => {
    console.log('\n收到退出信号，正在关闭数据库连接...');
    await mongoose.connection.close();
    process.exit(0);
  });

  try {
    // 1. 创建商户
    console.log('🏪 创建商户信息...');
    const merchant = await createMerchant();
    console.log(`✅ 商户创建成功: ${merchant.name}\n`);

    // 2. 创建商品分类
    console.log('📁 创建商品分类...');
    const categories = await createCategories();
    console.log(`✅ 已创建 ${categories.length} 个分类\n`);

    // 3. 创建商品数据
    console.log('🛍️  创建商品数据...');
    const products = await createProducts(categories);
    console.log(`✅ 已创建 ${products.length} 个商品\n`);

    // 4. 创建特价套餐
    console.log('🎁 创建特价套餐...');
    const specialPackages = await createSpecialPackages(products);
    console.log(`✅ 已创建 ${specialPackages.length} 个特价套餐\n`);

    // 5. 创建优惠券
    console.log('🎫 创建优惠券数据...');
    const coupons = await createCoupons();
    console.log(`✅ 已创建 ${coupons.length} 张优惠券\n`);

    // 6. 创建积分商品
    console.log('🎁 创建积分商品...');
    const pointsProducts = await createPointsProducts(products);
    console.log(`✅ 已创建 ${pointsProducts.length} 个积分商品\n`);

    // 7. 创建商品券
    console.log('🎟️  创建商品券...');
    const productVouchers = await createProductVouchers(products);
    console.log(`✅ 已创建 ${productVouchers.length} 个商品券\n`);

    // 8. 创建测试用户
    console.log('👤 创建测试用户...');
    const users = await createUsers();
    console.log(`✅ 已创建 ${users.length} 个用户\n`);

    // 9. 创建用户地址
    console.log('📍 创建用户地址...');
    const addresses = await createAddresses(users);
    console.log(`✅ 已创建 ${addresses.length} 个地址\n`);

    // 10. 创建购物车数据
    console.log('🛒 创建购物车数据...');
    const cartItems = await createCartItems(users, products);
    console.log(`✅ 已创建 ${cartItems.length} 个购物车项\n`);

    // 11. 创建订单数据
    console.log('📦 创建订单数据...');
    const orders = await createOrders(users, products, addresses);
    console.log(`✅ 已创建 ${orders.length} 个订单\n`);

    // 12. 创建评价数据
    console.log('⭐ 创建评价数据...');
    const reviews = await createReviews(users, orders);
    console.log(`✅ 已创建 ${reviews.length} 条评价\n`);

    // 13. 创建用户优惠券
    console.log('🎫 创建用户优惠券...');
    const userCoupons = await createUserCoupons(users, coupons);
    console.log(`✅ 已创建 ${userCoupons.length} 张用户优惠券\n`);

    // 14. 创建用户商品券
    console.log('🎟️  创建用户商品券...');
    const userProductVouchers = await createUserProductVouchers(users, productVouchers);
    console.log(`✅ 已创建 ${userProductVouchers.length} 张用户商品券\n`);

    // 15. 创建用户积分记录
    console.log('💎 创建用户积分记录...');
    const pointsRecords = await createPointsRecords(users, pointsProducts, productVouchers);
    console.log(`✅ 已创建 ${pointsRecords.length} 条积分记录\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 完整数据初始化完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 数据统计:');
    console.log(`  商户: 1`);
    console.log(`  分类: ${categories.length}`);
    console.log(`  商品: ${products.length}`);
    console.log(`  特价套餐: ${specialPackages.length}`);
    console.log(`  优惠券: ${coupons.length}`);
    console.log(`  积分商品: ${pointsProducts.length}`);
    console.log(`  商品券: ${productVouchers.length}`);
    console.log(`  用户: ${users.length}`);
    console.log(`  地址: ${addresses.length}`);
    console.log(`  购物车项: ${cartItems.length}`);
    console.log(`  订单: ${orders.length}`);
    console.log(`  评价: ${reviews.length}`);
    console.log(`  用户优惠券: ${userCoupons.length}`);
    console.log(`  用户商品券: ${userProductVouchers.length}`);
    console.log(`  积分记录: ${pointsRecords.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
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

// 创建商户
async function createMerchant() {
  let merchant = await Merchant.findOne();
  if (!merchant) {
    // 直接传入明文密码，Merchant 模型的 pre('save') hook 会自动加密
    merchant = new Merchant({
      username: 'admin',
      password: 'admin123', // 明文密码，保存时会自动加密
      name: '手工烤面筋',
      storeInfo: {
        name: '手工烤面筋',
        address: '北京市朝阳区某某街道123号',
        businessHours: '10:00-22:00',
        deliveryRange: 5,
        status: 'open',
        latitude: 39.9042,
        longitude: 116.4074,
        phone: '13800138000',
        freeDeliveryThreshold: 20, // 满20元免配送费
        deliveryFee: 5, // 配送费5元
        showDeliveryFee: true
      }
    });
    await merchant.save();
    console.log(`  ✓ 商户: ${merchant.name}`);
    console.log(`  ✓ 用户名: admin`);
    console.log(`  ✓ 密码: admin123`);
  } else {
    console.log(`  - 商户已存在: ${merchant.name}`);
  }
  return merchant;
}

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
  const drinkCategory = categories.find(c => c.name === '饮品');

  const productData = [
    {
      name: '原味烤面筋',
      desc: '经典原味，Q弹有嚼劲，现烤现卖',
      price: 5,
      oldPrice: 6,
      stock: 100,
      categoryId: classicCategory?._id,
      status: 'on_sale',
      images: ['/uploads/product-1.jpg'],
      flavors: ['原味', '香辣', '孜然'],
      spicyLevels: ['不辣', '微辣', '中辣', '特辣'],
      addons: [
        { name: '香菜', price: 1, image: '' },
        { name: '花生碎', price: 2, image: '' }
      ],
      sort: 1,
      tag: '限时特价',
      isRecommend: true
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
      tag: '热销',
      isRecommend: true
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
      sort: 3,
      isRecommend: false
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
      tag: '限时特价',
      isRecommend: true
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
      tag: '热销',
      isRecommend: true
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
    },
    {
      name: '可乐',
      desc: '冰镇可乐，清爽解腻',
      price: 3,
      stock: 200,
      categoryId: drinkCategory?._id,
      status: 'on_sale',
      images: ['/uploads/drink-1.jpg'],
      flavors: [],
      spicyLevels: [],
      addons: [],
      sort: 1
    },
    {
      name: '雪碧',
      desc: '冰镇雪碧，清爽解腻',
      price: 3,
      stock: 200,
      categoryId: drinkCategory?._id,
      status: 'on_sale',
      images: ['/uploads/drink-2.jpg'],
      flavors: [],
      spicyLevels: [],
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

// 创建特价套餐
async function createSpecialPackages(products) {
  const classicProducts = products.filter(p => p.name.includes('面筋') && !p.name.includes('套餐'));
  const comboProducts = products.filter(p => p.name.includes('套餐'));

  const packageData = [
    {
      name: '周末特惠套餐',
      desc: '周末专享，超值优惠',
      price: 25,
      oldPrice: 35,
      status: 'active',
      sort: 1,
      products: [
        { productId: classicProducts[0]?._id, quantity: 2 },
        { productId: classicProducts[1]?._id, quantity: 2 },
        { productId: products.find(p => p.name === '烤豆皮')?._id, quantity: 1 }
      ]
    },
    {
      name: '夜宵套餐',
      desc: '夜宵必备，深夜食堂',
      price: 30,
      oldPrice: 40,
      status: 'active',
      sort: 2,
      products: [
        { productId: classicProducts[0]?._id, quantity: 3 },
        { productId: classicProducts[1]?._id, quantity: 2 },
        { productId: products.find(p => p.name === '烤金针菇')?._id, quantity: 2 }
      ]
    }
  ];

  const packages = [];
  for (const data of packageData) {
    let pkg = await SpecialPackage.findOne({ name: data.name });
    if (!pkg) {
      pkg = new SpecialPackage(data);
      await pkg.save();
      packages.push(pkg);
      console.log(`  ✓ ${data.name} - ¥${data.price}`);
    } else {
      console.log(`  - ${data.name} (已存在)`);
      packages.push(pkg);
    }
  }
  return packages;
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
      expireTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
      name: '满30减10',
      desc: '满30元立减10元',
      type: 'discount',
      value: 10,
      minAmount: 30,
      totalCount: 500,
      usedCount: 0,
      expireTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
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

// 创建测试用户
async function createUsers() {
  const userData = [
    {
      openid: 'test_openid_001',
      unionid: 'test_unionid_001',
      nickName: '测试用户1',
      avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/vi_32/test1.png',
      phone: '13800138001',
      points: 50,
      totalConsumption: 100
    },
    {
      openid: 'test_openid_002',
      unionid: 'test_unionid_002',
      nickName: '测试用户2',
      avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/vi_32/test2.png',
      phone: '13800138002',
      points: 30,
      totalConsumption: 60
    },
    {
      openid: 'test_openid_003',
      unionid: 'test_unionid_003',
      nickName: '测试用户3',
      avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/vi_32/test3.png',
      phone: '13800138003',
      points: 20,
      totalConsumption: 40
    }
  ];

  const users = [];
  for (const data of userData) {
    let user = await User.findOne({ openid: data.openid });
    if (!user) {
      user = new User(data);
      await user.save();
      users.push(user);
      console.log(`  ✓ ${data.nickName} (${data.phone})`);
    } else {
      console.log(`  - ${data.nickName} (已存在)`);
      users.push(user);
    }
  }
  return users;
}

// 创建用户地址
async function createAddresses(users) {
  const addresses = [];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const addressData = [
      {
        userId: user._id,
        name: `用户${i + 1}`,
        phone: user.phone,
        address: '北京市朝阳区某某街道',
        detail: `${100 + i}号`,
        latitude: 39.9042 + (i * 0.01),
        longitude: 116.4074 + (i * 0.01),
        isDefault: i === 0 // 第一个地址设为默认
      },
      {
        userId: user._id,
        name: `用户${i + 1}`,
        phone: user.phone,
        address: '北京市海淀区某某路',
        detail: `${200 + i}号`,
        latitude: 39.9542 + (i * 0.01),
        longitude: 116.3074 + (i * 0.01),
        isDefault: false
      }
    ];

    for (const data of addressData) {
      let address = await Address.findOne({ 
        userId: data.userId, 
        address: data.address,
        detail: data.detail
      });
      if (!address) {
        address = new Address(data);
        await address.save();
        addresses.push(address);
        console.log(`  ✓ ${data.address}${data.detail} (${user.nickName})`);
      } else {
        console.log(`  - ${data.address}${data.detail} (已存在)`);
        addresses.push(address);
      }
    }
  }
  return addresses;
}

// 创建购物车数据
async function createCartItems(users, products) {
  const cartItems = [];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const product = products[i % products.length];
    
    const cartData = {
      userId: user._id,
      productId: product._id,
      quantity: i + 1,
      flavor: i % 2 === 0 ? '香辣' : '原味',
      spicy: i % 3 === 0 ? '微辣' : i % 3 === 1 ? '中辣' : '不辣',
      addons: i % 2 === 0 ? [
        { id: '1', name: '香菜', price: 1 }
      ] : [],
      checked: true
    };

    let cart = await Cart.findOne({ 
      userId: user._id, 
      productId: product._id 
    });
    if (!cart) {
      cart = new Cart(cartData);
      await cart.save();
      cartItems.push(cart);
      console.log(`  ✓ ${user.nickName} - ${product.name} x${cartData.quantity}`);
    } else {
      console.log(`  - ${user.nickName} - ${product.name} (已存在)`);
      cartItems.push(cart);
    }
  }
  return cartItems;
}

// 创建订单数据
async function createOrders(users, products, addresses) {
  const orders = [];
  const statuses = ['pending', 'paid', 'making', 'completed', 'cancelled'];
  const deliveryTypes = ['pickup', 'delivery'];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const userAddresses = addresses.filter(a => a.userId.toString() === user._id.toString());
    const defaultAddress = userAddresses.find(a => a.isDefault) || userAddresses[0];
    
    // 为每个用户创建2-3个订单
    for (let j = 0; j < 2; j++) {
      const orderNo = Order.generateOrderNo();
      const status = statuses[i % statuses.length];
      const deliveryType = deliveryTypes[i % deliveryTypes.length];
      
      // 选择商品
      const selectedProducts = products.slice(i % products.length, (i % products.length) + 2);
      let productTotal = 0;
      selectedProducts.forEach(p => {
        productTotal += p.price * (j + 1);
      });

      // 计算配送费
      let deliveryFee = 0;
      if (deliveryType === 'delivery') {
        const merchant = await Merchant.findOne();
        const freeThreshold = merchant?.storeInfo?.freeDeliveryThreshold || 20;
        const fee = merchant?.storeInfo?.deliveryFee || 5;
        if (productTotal < freeThreshold) {
          deliveryFee = fee;
        }
      }

      const totalPrice = productTotal + deliveryFee;

      const orderData = {
        orderNo,
        userId: user._id,
        totalPrice,
        productTotal,
        deliveryFee,
        status,
        deliveryType,
        deliveryAddressId: deliveryType === 'delivery' ? defaultAddress?._id : null,
        remark: j === 0 ? '不要香菜' : '尽快送达'
      };

      let order = await Order.findOne({ orderNo });
      if (!order) {
        order = new Order(orderData);
        await order.save();

        // 创建订单项
        for (const product of selectedProducts) {
          const orderItem = new OrderItem({
            orderId: order._id,
            productId: product._id,
            productName: product.name,
            price: product.price,
            quantity: j + 1,
            spec: `${product.flavors?.[0] || '原味'}-${product.spicyLevels?.[0] || '不辣'}`,
            flavor: product.flavors?.[0] || '原味',
            spicy: product.spicyLevels?.[0] || '不辣',
            addons: []
          });
          await orderItem.save();
        }

        orders.push(order);
        console.log(`  ✓ 订单 ${orderNo} - ${user.nickName} - ¥${totalPrice} - ${status}`);
      } else {
        console.log(`  - 订单 ${orderNo} (已存在)`);
        orders.push(order);
      }
    }
  }
  return orders;
}

// 创建评价数据
async function createReviews(users, orders) {
  const reviews = [];
  const completedOrders = orders.filter(o => o.status === 'completed');

  for (let i = 0; i < Math.min(completedOrders.length, 5); i++) {
    const order = completedOrders[i];
    const orderItems = await OrderItem.find({ orderId: order._id });
    if (orderItems.length === 0) continue;

    const productId = orderItems[0].productId;
    const ratings = [5, 5, 4, 5, 4];
    const contents = [
      '很好吃，下次还会再来！',
      '味道不错，配送也很快',
      '还可以，就是有点辣',
      '非常满意，推荐！',
      '不错，性价比很高'
    ];

    let review = await Review.findOne({ orderId: order._id });
    if (!review) {
      review = new Review({
        orderId: order._id,
        userId: order.userId,
        productId: productId,
        rating: ratings[i % ratings.length],
        content: contents[i % contents.length],
        images: []
      });
      await review.save();
      reviews.push(review);
      console.log(`  ✓ 评价 - 订单 ${order.orderNo} - ${ratings[i % ratings.length]}星`);
    } else {
      console.log(`  - 评价 (已存在)`);
      reviews.push(review);
    }
  }
  return reviews;
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
      maxExchangePerUser: 3, // 每人限兑3次
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
      maxExchangePerUser: 2, // 每人限兑2次
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
      maxExchangePerUser: 5, // 每人限兑5次
      status: 'active',
      sort: 3,
      couponType: 'freeProduct',
      couponValue: 0,
      couponMinAmount: 0,
      productId: products.find(p => p.name === '孜然烤面筋')?._id
    },
    {
      name: '可乐免单券',
      desc: '兑换后可免费获得一瓶可乐',
      image: '/uploads/coupon-4.jpg',
      points: 20,
      stock: 300,
      usedCount: 0,
      maxExchangePerUser: -1, // 无限制
      status: 'active',
      sort: 4,
      couponType: 'freeProduct',
      couponValue: 0,
      couponMinAmount: 0,
      productId: products.find(p => p.name === '可乐')?._id
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
      expireTime: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90天后过期
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
      expireTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60天后过期
    },
    {
      name: '3瓶可乐券',
      desc: '兑换后可获得3瓶可乐',
      image: '/uploads/voucher-3.jpg',
      productId: products.find(p => p.name === '可乐')?._id,
      quantity: 3,
      points: 8,
      stock: 500,
      usedCount: 0,
      maxExchangePerUser: -1, // 无限制
      status: 'active',
      expireTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天后过期
    }
  ];

  const productVouchers = [];
  for (const data of productVoucherData) {
    // 如果 productId 不存在，跳过该商品券
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

// 创建用户优惠券
async function createUserCoupons(users, coupons) {
  const userCoupons = [];
  
  // 为每个用户分配一些优惠券
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    // 每个用户分配2-3张优惠券
    const userCouponCount = 2 + (i % 2);
    const selectedCoupons = coupons.slice(0, userCouponCount);
    
    for (const coupon of selectedCoupons) {
      // 检查是否已存在
      let userCoupon = await UserCoupon.findOne({
        userId: user._id,
        couponId: coupon._id
      });
      
      if (!userCoupon) {
        userCoupon = new UserCoupon({
          userId: user._id,
          couponId: coupon._id,
          status: 'available'
        });
        await userCoupon.save();
        userCoupons.push(userCoupon);
      } else {
        userCoupons.push(userCoupon);
      }
    }
  }
  
  if (userCoupons.length > 0) {
    console.log(`  ✓ 已为用户分配 ${userCoupons.length} 张优惠券`);
  }
  
  return userCoupons;
}

// 创建用户商品券
async function createUserProductVouchers(users, productVouchers) {
  const userProductVouchers = [];
  
  // 为部分用户分配商品券
  for (let i = 0; i < Math.min(users.length, 2); i++) {
    const user = users[i];
    const productVoucher = productVouchers[i % productVouchers.length];
    
    if (!productVoucher) continue;
    
    // 每个用户分配1-2张商品券
    const voucherCount = 1 + (i % 2);
    
    for (let j = 0; j < voucherCount; j++) {
      let userProductVoucher = await UserProductVoucher.findOne({
        userId: user._id,
        productVoucherId: productVoucher._id,
        status: 'available'
      });
      
      if (!userProductVoucher) {
        userProductVoucher = new UserProductVoucher({
          userId: user._id,
          productVoucherId: productVoucher._id,
          status: 'available'
        });
        await userProductVoucher.save();
        userProductVouchers.push(userProductVoucher);
      } else {
        userProductVouchers.push(userProductVoucher);
      }
    }
  }
  
  if (userProductVouchers.length > 0) {
    console.log(`  ✓ 已为用户分配 ${userProductVouchers.length} 张商品券`);
  }
  
  return userProductVouchers;
}

// 创建用户积分记录
async function createPointsRecords(users, pointsProducts, productVouchers) {
  const pointsRecords = [];
  
  // 为每个用户创建一些积分记录
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    // 创建积分获得记录（消费获得积分）
    const earnRecord = new UserPointsRecord({
      userId: user._id,
      points: 10 + (i * 5), // 不同用户获得不同积分
      type: 'earn',
      description: '消费获得积分',
      status: 'completed'
    });
    await earnRecord.save();
    pointsRecords.push(earnRecord);
    
    // 为部分用户创建兑换记录
    if (i < 2 && pointsProducts.length > 0) {
      const pointsProduct = pointsProducts[i % pointsProducts.length];
      const exchangeRecord = new UserPointsRecord({
        userId: user._id,
        pointsProductId: pointsProduct._id,
        points: -pointsProduct.points, // 负数表示扣除积分
        type: 'exchange',
        description: `兑换${pointsProduct.name}`,
        status: 'completed'
      });
      await exchangeRecord.save();
      pointsRecords.push(exchangeRecord);
    }
    
    // 为部分用户创建商品券兑换记录
    if (i < 2 && productVouchers.length > 0) {
      const productVoucher = productVouchers[i % productVouchers.length];
      const voucherExchangeRecord = new UserPointsRecord({
        userId: user._id,
        productVoucherId: productVoucher._id,
        points: -productVoucher.points,
        type: 'exchange',
        description: `兑换${productVoucher.name}`,
        status: 'completed'
      });
      await voucherExchangeRecord.save();
      pointsRecords.push(voucherExchangeRecord);
    }
  }
  
  if (pointsRecords.length > 0) {
    console.log(`  ✓ 已创建 ${pointsRecords.length} 条积分记录`);
  }
  
  return pointsRecords;
}
