const apiService = require('../../utils/api-service.js');
const { BASE_URL } = require('../../utils/api.js');

Page({
  data: {
    cartCount: 0,
    storeInfo: null,
    special: null,
    hotProducts: [],
    newUserCoupon: null, // 新用户专享优惠券
    showNotification: false, // 是否显示通知中心
    distributedCoupons: [], // 可领取的优惠券列表
    notificationCount: 0 // 通知数量（未领取的优惠券数量）
  },

  onLoad() {
    this.loadHomeData()
    this.updateCartCount()
    this.loadDistributedCoupons()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadHomeData()
    this.updateCartCount()
    this.loadDistributedCoupons()
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

      // 基础数据：门店、热销、新用户专享
      this.setData({
        storeInfo: data.storeInfo,
        hotProducts: (data.hotProducts || []).map(item => ({
          ...item,
          image: processImage(item.image),
          gradient: this.getGradientByIndex(item.id)
        })),
        newUserCoupon: data.newUserCoupon || null
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

  // 领取新用户专享优惠券
  async getNewUserCoupon(e) {
    const couponId = e.currentTarget.dataset.couponId
    if (!couponId) {
      return
    }

    try {
      wx.showLoading({ title: '领取中...' })
      await apiService.coupon.receive(couponId)
      
      wx.hideLoading()
      wx.showToast({
        title: '领取成功',
        icon: 'success'
      })
      
      // 重新加载首页数据
      this.loadHomeData()
      
      // 刷新优惠券页面（如果已打开）
      const pages = getCurrentPages()
      const couponPage = pages.find(page => page.route === 'pages/coupon/coupon')
      if (couponPage && couponPage.loadCoupons) {
        couponPage.loadCoupons()
      }
      
      // 如果用户在个人中心，刷新优惠券数量
      const profilePage = pages.find(page => page.route === 'pages/profile/profile')
      if (profilePage && profilePage.loadUserInfo) {
        profilePage.loadUserInfo()
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '领取失败',
        icon: 'none'
      })
    }
  },

  // 显示通知中心
  showNotificationCenter() {
    this.setData({ showNotification: true })
    this.loadDistributedCoupons()
  },

  // 隐藏通知中心
  hideNotificationCenter() {
    this.setData({ showNotification: false })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止点击内容区域时关闭弹窗
  },

  // 加载可领取的优惠券
  async loadDistributedCoupons() {
    try {
      const coupons = await apiService.coupon.getDistributed()
      const unReceivedCount = coupons.filter(c => !c.isReceived).length
      
      this.setData({
        distributedCoupons: coupons || [],
        notificationCount: unReceivedCount
      })
    } catch (err) {
      console.error('加载可领取优惠券失败:', err)
      this.setData({
        distributedCoupons: [],
        notificationCount: 0
      })
    }
  },

  // 领取优惠券
  async receiveCoupon(e) {
    const couponId = e.currentTarget.dataset.couponId
    if (!couponId) return

    try {
      wx.showLoading({ title: '领取中...' })
      await apiService.coupon.receive(couponId)
      
      wx.hideLoading()
      wx.showToast({
        title: '领取成功',
        icon: 'success'
      })
      
      // 重新加载优惠券列表
      await this.loadDistributedCoupons()
      
      // 检查是否还有未领取的优惠券，如果没有则关闭弹窗
      const unReceivedCount = this.data.distributedCoupons.filter(c => !c.isReceived).length
      if (unReceivedCount === 0) {
        // 延迟关闭，让用户看到"领取成功"的提示
        setTimeout(() => {
          this.hideNotificationCenter()
        }, 500)
      }
      
      // 刷新优惠券页面（如果已打开）
      const pages = getCurrentPages()
      const couponPage = pages.find(page => page.route === 'pages/coupon/coupon')
      if (couponPage && couponPage.loadCoupons) {
        couponPage.loadCoupons()
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '领取失败',
        icon: 'none'
      })
    }
  }
})
