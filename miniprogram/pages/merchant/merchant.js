Page({
  data: {},

  onLoad() {
    // 加载商家数据
  },

  addProduct() {
    wx.showToast({
      title: '新增商品',
      icon: 'none'
    })
  },

  manageCategory() {
    wx.showToast({
      title: '分类管理',
      icon: 'none'
    })
  },

  manageOrders() {
    wx.showToast({
      title: '订单管理',
      icon: 'none'
    })
  },

  viewStats() {
    wx.showToast({
      title: '数据统计',
      icon: 'none'
    })
  },

  viewNewOrders() {
    wx.showToast({
      title: '查看新订单',
      icon: 'none'
    })
  },

  viewAllOrders() {
    wx.showToast({
      title: '查看全部订单',
      icon: 'none'
    })
  },

  acceptOrder() {
    wx.showToast({
      title: '订单已接单',
      icon: 'success'
    })
  },

  completeOrder() {
    wx.showToast({
      title: '订单已完成',
      icon: 'success'
    })
  },

  editProduct() {
    wx.showToast({
      title: '编辑商品',
      icon: 'none'
    })
  },

  offlineProduct() {
    wx.showModal({
      title: '提示',
      content: '确定要下架这个商品吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '商品已下架',
            icon: 'success'
          })
        }
      }
    })
  },

  editStore() {
    wx.showToast({
      title: '编辑门店信息',
      icon: 'none'
    })
  }
})
