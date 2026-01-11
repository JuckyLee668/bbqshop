const apiService = require('../../utils/api-service.js');
const { checkLogin } = require('../../utils/auth.js');

Page({
  data: {
    userPoints: 0,
    productsList: []
  },

  onLoad() {
    this.loadPointsData()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadPointsData()
  },

  // 加载积分数据
  async loadPointsData() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      // 检查登录状态
      const isLoggedIn = await checkLogin()
      if (!isLoggedIn) {
        wx.hideLoading()
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/profile/profile'
          })
        }, 1500)
        return
      }

      // 获取积分商城数据（包含用户积分和商品列表）
      const shopData = await apiService.points.getShop()
      const userPoints = shopData.userPoints || 0
      const products = [
        ...(shopData.coupons || []),
        ...(shopData.productVouchers || [])
      ]
      
      // 处理商品数据
      const baseUrl = require('../../utils/api.js').BASE_URL.replace('/v1', '')
      const processImage = (img) => {
        if (!img) return ''
        if (img.startsWith('http')) return img
        if (img.startsWith('/')) return baseUrl + img
        return baseUrl + '/' + img
      }

      const formattedProducts = (products || []).map(item => {
        // 计算是否可以兑换
        const hasStock = item.remainingCount === -1 || item.remainingCount > 0
        const hasPoints = userPoints >= item.points
        const userExchangeCount = item.userExchangeCount || 0
        const maxPerUser = item.maxExchangePerUser !== undefined ? item.maxExchangePerUser : -1
        
        // 检查是否达到每人兑换次数限制
        const isReachedUserLimit = maxPerUser !== -1 && userExchangeCount >= maxPerUser
        
        // 检查是否已兑换（针对商品券，isReceived表示已兑换）
        const isReceived = item.isReceived || false
        
        // 可以兑换的条件：有库存 && 有积分 && 未达到每人限制 && 未兑换过（商品券）
        const canExchange = hasStock && hasPoints && !isReachedUserLimit && !isReceived
        
        return {
          ...item,
          image: item.image ? processImage(item.image) : '',
          canExchange: canExchange,
          isReachedLimit: isReachedUserLimit || isReceived
        }
      })

      this.setData({
        userPoints: userPoints,
        productsList: formattedProducts
      })
    } catch (err) {
      console.error('加载积分商城失败:', err)
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 兑换商品
  async goToExchange(e) {
    const item = e.currentTarget.dataset.item
    if (!item) {
      console.error('未获取到商品信息')
      return
    }

    // 检查是否可以兑换（使用计算好的canExchange字段）
    if (!item.canExchange) {
      // 检查具体原因
      if (item.isReachedLimit) {
        wx.showToast({
          title: '您已达到兑换上限',
          icon: 'none'
        })
        return
      }
      
      if (item.remainingCount !== -1 && item.remainingCount <= 0) {
        wx.showToast({
          title: '商品已兑完',
          icon: 'none'
        })
        return
      }
      
      if (this.data.userPoints < item.points) {
        wx.showToast({
          title: '积分不足',
          icon: 'none'
        })
        return
      }
      
      wx.showToast({
        title: '当前不可兑换',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '兑换中...' })
      
      if (item.type === 'coupon') {
        // 兑换优惠券
        await apiService.points.exchangeCoupon(item.id)
      } else if (item.type === 'productVoucher') {
        // 兑换商品券
        await apiService.points.exchangeProductVoucher(item.id)
      } else {
        throw new Error('未知的商品类型')
      }

      wx.hideLoading()
      wx.showToast({
        title: '兑换成功',
        icon: 'success'
      })

      // 重新加载数据
      this.loadPointsData()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '兑换失败',
        icon: 'none'
      })
    }
  }
})
