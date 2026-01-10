const apiService = require('../../utils/api-service.js');
const { BASE_URL } = require('../../utils/api.js');

Page({
  data: {
    packageId: '',
    packageInfo: null,
    loading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ packageId: options.id });
      this.loadPackageDetail();
    }
  },

  // 加载特价套餐详情
  async loadPackageDetail() {
    try {
      this.setData({ loading: true });
      const packageInfo = await apiService.special.getDetail(this.data.packageId);
      
      // 处理图片URL
      const baseUrl = BASE_URL.replace('/v1', '');
      const processImage = (img) => {
        if (!img) return '';
        if (img.startsWith('http')) return img;
        if (img.startsWith('/')) return baseUrl + img;
        return baseUrl + '/' + img;
      };

      // 处理套餐封面图
      const coverImage = processImage(packageInfo.coverImage);
      
      // 处理套餐内商品图片
      const products = (packageInfo.products || []).map(item => ({
        ...item,
        image: processImage(item.image)
      }));

      this.setData({
        packageInfo: {
          ...packageInfo,
          coverImage,
          products
        }
      });
    } catch (err) {
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 跳转到商品详情
  goToProductDetail(e) {
    const productId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${productId}`
    });
  },

  // 加入购物车
  async addToCart() {
    try {
      const { packageInfo } = this.data;
      if (!packageInfo) return;

      // 将套餐作为整体加入购物车
      // 这里需要根据你的购物车API调整
      await apiService.cart.add({
        productId: packageInfo.mainProductId, // 使用主商品ID
        quantity: 1,
        packageId: packageInfo.id, // 标记这是套餐
        packageName: packageInfo.name,
        packagePrice: packageInfo.price
      });

      wx.showToast({
        title: '已加入购物车',
        icon: 'success'
      });
    } catch (err) {
      wx.showToast({
        title: err.message || '添加失败',
        icon: 'none'
      });
    }
  },

  // 立即购买
  buyNow() {
    wx.showToast({
      title: '跳转到结算页',
      icon: 'success'
    });
    // 这里可以跳转到结算页面
  }
});
