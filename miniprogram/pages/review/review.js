const apiService = require('../../utils/api-service.js');
const { BASE_URL } = require('../../utils/api.js');
const { ensureLogin } = require('../../utils/auth.js');

Page({
  data: {
    orderId: '',
    order: null,
    productId: '',
    rating: 5,
    content: '',
    images: [],
    loading: false,
    hasReviewed: false
  },

  onLoad(options) {
    if (options.orderId) {
      this.setData({ orderId: options.orderId })
      this.loadOrderInfo()
    }
  },

  // 加载订单信息
  async loadOrderInfo() {
    try {
      this.setData({ loading: true })
      
      // 确保用户已登录
      const isLoggedIn = await ensureLogin();
      if (!isLoggedIn) {
        return;
      }

      // 获取订单详情
      const order = await apiService.order.getDetail(this.data.orderId)
      
      // 获取第一个商品的ID（评价是针对订单中的商品）
      // 注意：订单详情返回的items可能不包含productId，需要从订单项中获取
      let productId = null
      if (order.items && order.items.length > 0) {
        // 尝试从订单项中获取productId
        const firstItem = order.items[0]
        productId = firstItem.productId || firstItem.id
      }
      
      // 如果还是没有，尝试从订单本身获取（某些情况下订单可能直接关联商品）
      if (!productId && order.productId) {
        productId = order.productId
      }
      
      if (!productId) {
        wx.showToast({
          title: '订单信息异常',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
        return
      }

      // 检查是否已评价
      try {
        const existingReview = await apiService.review.getByOrderId(this.data.orderId)
        if (existingReview) {
          this.setData({
            hasReviewed: true,
            rating: existingReview.rating,
            content: existingReview.content,
            images: existingReview.images || []
          })
        }
      } catch (err) {
        // 如果没有评价，继续
        console.log('未找到评价记录')
      }

      this.setData({
        order,
        productId
      })
    } catch (err) {
      console.error('加载订单信息失败:', err)
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 选择评分
  onRatingChange(e) {
    this.setData({ rating: e.detail.value })
  },

  // 输入评价内容
  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  // 选择图片
  async chooseImages() {
    try {
      const res = await wx.chooseImage({
        count: 3 - this.data.images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        wx.showLoading({ title: '上传中...' })
        
        // 上传图片
        const uploadPromises = res.tempFilePaths.map(filePath => {
          return new Promise((resolve, reject) => {
            wx.uploadFile({
              url: BASE_URL.replace('/v1', '') + '/upload',
              filePath: filePath,
              name: 'file',
              header: {
                'Authorization': 'Bearer ' + wx.getStorageSync('token')
              },
              success: (uploadRes) => {
                const result = JSON.parse(uploadRes.data)
                if (result.code === 200) {
                  const imageUrl = BASE_URL.replace('/v1', '') + result.data.url
                  resolve(imageUrl)
                } else {
                  reject(new Error(result.message || '上传失败'))
                }
              },
              fail: reject
            })
          })
        })

        const uploadedImages = await Promise.all(uploadPromises)
        this.setData({
          images: [...this.data.images, ...uploadedImages]
        })
        
        wx.hideLoading()
        wx.showToast({
          title: '上传成功',
          icon: 'success'
        })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '上传失败',
        icon: 'none'
      })
    }
  },

  // 删除图片
  removeImage(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.images
    images.splice(index, 1)
    this.setData({ images })
  },

  // 提交评价
  async submitReview() {
    try {
      if (!this.data.rating) {
        wx.showToast({
          title: '请选择评分',
          icon: 'none'
        })
        return
      }

      wx.showLoading({ title: '提交中...' })

      await apiService.review.create({
        orderId: this.data.orderId,
        productId: this.data.productId,
        rating: this.data.rating,
        content: this.data.content,
        images: this.data.images
      })

      wx.hideLoading()
      wx.showToast({
        title: '评价成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '提交失败',
        icon: 'none'
      })
    }
  }
})
