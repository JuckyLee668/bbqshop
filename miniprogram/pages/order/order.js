const apiService = require('../../utils/api-service.js');
const { BASE_URL } = require('../../utils/api.js');

Page({
  data: {
    currentTab: 'all',
    orderList: [],
    loading: false
  },

  onLoad() {
    this.loadOrders()
  },

  onShow() {
    this.loadOrders()
  },

  // 加载订单列表
  async loadOrders() {
    try {
      this.setData({ loading: true })
      const params = {}
      if (this.data.currentTab !== 'all') {
        params.status = this.data.currentTab
      }
      
      const data = await apiService.order.getList(params)
      
      // 处理图片URL
      const baseUrl = BASE_URL.replace('/v1', '')
      const processImage = (img) => {
        if (!img) return ''
        if (img.startsWith('http')) return img
        if (img.startsWith('/')) return baseUrl + img
        return baseUrl + '/' + img
      }
      
      const orderList = (data.list || []).map(order => ({
        ...order,
        items: (order.items || []).map(item => ({
          ...item,
          image: processImage(item.image || '')
        }))
      }))
      
      this.setData({ orderList })
    } catch (err) {
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  onTabChange(e) {
    this.setData({ currentTab: e.detail.value })
    this.loadOrders()
  },

  async cancelOrder(e) {
    try {
      const orderId = e.currentTarget.dataset.id
      
      const res = await new Promise((resolve) => {
        wx.showModal({
          title: '提示',
          content: '确定要取消订单吗？',
          success: resolve
        })
      })
      
      if (res.confirm) {
        await apiService.order.cancel(orderId, '用户主动取消')
        wx.showToast({
          title: '订单已取消',
          icon: 'success'
        })
        this.loadOrders()
      }
    } catch (err) {
      wx.showToast({
        title: err.message || '取消失败',
        icon: 'none'
      })
    }
  },

  contactMerchant() {
    wx.showToast({
      title: '联系商家',
      icon: 'none'
    })
  },

  viewDetail() {
    wx.showToast({
      title: '查看详情',
      icon: 'none'
    })
  },

  reorder() {
    wx.showToast({
      title: '已加入购物车',
      icon: 'success'
    })
  },

  rateOrder(e) {
    const orderId = e.currentTarget.dataset.id
    if (!orderId) {
      wx.showToast({
        title: '订单ID不存在',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: `/pages/review/review?orderId=${orderId}`
    })
  },

  deleteOrder() {
    wx.showModal({
      title: '提示',
      content: '确定要删除订单吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '订单已删除',
            icon: 'success'
          })
        }
      }
    })
  }
})
