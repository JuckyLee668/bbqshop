const apiService = require('../../utils/api-service.js');
const { BASE_URL } = require('../../utils/api.js');

Page({
  data: {
    cartCount: 0,
    storeInfo: null,
    special: null,
    hotProducts: [],
    promotions: []
  },

  onLoad() {
    this.loadHomeData()
    this.updateCartCount()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadHomeData()
    this.updateCartCount()
  },

  // 加载首页数据
  async loadHomeData() {
    try {
      wx.showLoading({ title: '加载中...' })
      const data = await apiService.home.getIndex()
      console.log('首页数据加载成功:', data)
      
      // 处理图片URL
      const baseUrl = BASE_URL.replace('/v1', '')
      const processImage = (img) => {
        if (!img) return ''
        if (img.startsWith('http')) return img
        if (img.startsWith('/')) return baseUrl + img
        return baseUrl + '/' + img
      }

      // 基础数据：门店、热销、促销
      this.setData({
        storeInfo: data.storeInfo,
        hotProducts: (data.hotProducts || []).map(item => ({
          ...item,
          image: processImage(item.image),
          gradient: this.getGradientByIndex(item.id)
        })),
        promotions: data.promotions || []
      })

      // 单独请求特价套餐，使用新的特价套餐 API
      try {
        const special = await apiService.special.getActive()
        if (special) {
          this.setData({
            special: {
              ...special,
              image: processImage(special.coverImage || special.image)
            }
          })
        } else {
          this.setData({ special: null })
        }
      } catch (e) {
        console.warn('加载特价套餐失败:', e?.message || e)
      }
    } catch (err) {
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 根据ID生成渐变色
  getGradientByIndex(id) {
    const gradients = [
      'linear-gradient(135deg, #FED7AA 0%, #FB923C 100%)',
      'linear-gradient(135deg, #FCA5A5 0%, #EF4444 100%)',
      'linear-gradient(135deg, #FDE047 0%, #EAB308 100%)',
      'linear-gradient(135deg, #D8B4FE 0%, #A855F7 100%)'
    ]
    const index = typeof id === 'string' ? parseInt(id) % gradients.length : id % gradients.length
    return gradients[index]
  },

  updateCartCount() {
    // 优先从API获取，失败则从本地存储获取
    apiService.cart.getList()
      .then(data => {
        const count = data.list?.reduce((sum, item) => sum + item.quantity, 0) || 0
        this.setData({ cartCount: count })
      })
      .catch(() => {
        const cart = wx.getStorageSync('cart') || []
        const count = cart.reduce((sum, item) => sum + item.quantity, 0)
        this.setData({ cartCount: count })
      })
  },

  goToCart() {
    wx.switchTab({
      url: '/pages/cart/cart'
    })
  },

  goToProductList() {
    wx.switchTab({
      url: '/pages/product-list/product-list'
    })
  },

  goToProductDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${id}`
    })
  },

  // 跳转到特价套餐详情
  goToSpecialPackageDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/special-package-detail/special-package-detail?id=${id}`
    })
  },

  async addToCart(e) {
    try {
      const id = e.currentTarget.dataset.id
      const product = this.data.hotProducts.find((p) => p.id === id)
      if (!product) return

      await apiService.cart.add({
        productId: id,
        quantity: 1
      })

      this.updateCartCount()
      wx.showToast({
        title: '已加入购物车',
        icon: 'success'
      })
    } catch (err) {
      wx.showToast({
        title: err.message || '添加失败',
        icon: 'none'
      })
    }
  },

  getPromotion() {
    wx.showToast({
      title: '优惠已领取',
      icon: 'success'
    })
  }
})
