const apiService = require('../../utils/api-service.js');
const { BASE_URL } = require('../../utils/api.js');
const { ensureLogin, checkLogin } = require('../../utils/auth.js');

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    stats: {
      orderCount: 0,
      totalConsumption: 0,
      points: 0
    },
    orderStats: {
      pending: 0, // 待制作
      making: 0, // 制作中
      completed: 0, // 已完成
      cancelled: 0 // 已取消
    },
    showEditModal: false,
    editForm: {
      nickName: '',
      avatarUrl: '',
      phone: '',
      openid: ''
    },
    loginLoading: false
  },

  onLoad() {
    this.loadUserInfo()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadUserInfo()
  },

  // 加载用户信息
  async loadUserInfo() {
    // 先检查登录状态
    const isLoggedIn = checkLogin()
    this.setData({ isLoggedIn })
    
    if (!isLoggedIn) {
      // 未登录，清空数据
      this.setData({
        userInfo: null,
        stats: { orderCount: 0, totalConsumption: 0, points: 0 },
        orderStats: { pending: 0, making: 0, completed: 0, cancelled: 0 }
      })
      return
    }
    
    try {
      const userInfo = await apiService.user.getInfo()
      this.setData({
        isLoggedIn: true,
        userInfo: {
          nickName: userInfo.nickName || '微信用户',
          avatarUrl: userInfo.avatarUrl,
          phone: userInfo.phone || '未绑定',
          openid: userInfo.openid || ''
        },
        stats: {
          orderCount: userInfo.orderCount || 0,
          totalConsumption: userInfo.totalConsumption || 0,
          points: userInfo.points || 0
        },
        orderStats: {
          pending: userInfo.orderStats?.pending || 0,
          making: userInfo.orderStats?.making || 0,
          completed: userInfo.orderStats?.completed || 0,
          cancelled: userInfo.orderStats?.cancelled || 0
        }
      })
    } catch (err) {
      console.error('加载用户信息失败:', err)
      // 如果获取用户信息失败，可能是 token 过期，清除登录状态
      if (err.message && err.message.includes('401')) {
        this.setData({ isLoggedIn: false })
        wx.removeStorageSync('token')
        wx.removeStorageSync('userInfo')
      }
    }
  },

  // 一键登录（登录后引导完善头像和昵称）
  async handleOneClickLogin() {
    if (this.data.loginLoading) return
    
    try {
      this.setData({ loginLoading: true })
      
      // 1. 先完成登录（获取 code 和 openid）
      const app = getApp()
      await app.wxLogin()
      
      // 2. 登录成功后重新加载用户信息
      await this.loadUserInfo()
      
      // 3. 检查是否缺少头像或昵称，如果缺少则提示用户完善
      const userInfo = this.data.userInfo
      if (!userInfo || !userInfo.avatarUrl || !userInfo.nickName || userInfo.nickName === '微信用户') {
        wx.showModal({
          title: '完善个人信息',
          content: '为了更好的使用体验，请完善您的头像和昵称',
          confirmText: '立即完善',
          cancelText: '稍后',
          success: (res) => {
            if (res.confirm) {
              // 打开编辑弹窗
              this.editUserInfo()
            }
          }
        })
      }
      
    } catch (err) {
      console.error('一键登录失败:', err)
      // 错误已在 app.wxLogin 中处理
    } finally {
      this.setData({ loginLoading: false })
    }
  },

  // 编辑用户信息
  async editUserInfo() {
    // 先检查登录状态
    const isLoggedIn = await ensureLogin();
    if (!isLoggedIn) {
      return;
    }

    // 确保有用户信息
    if (!this.data.userInfo) {
      await this.loadUserInfo();
    }

    this.setData({
      showEditModal: true,
      editForm: {
        nickName: this.data.userInfo?.nickName || '',
        avatarUrl: this.data.userInfo?.avatarUrl || '',
        phone: this.data.userInfo?.phone || '',
        openid: this.data.userInfo?.openid || ''
      }
    })
  },

  // 关闭编辑弹窗
  closeEditModal() {
    this.setData({ showEditModal: false })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止点击弹窗内容时关闭弹窗
  },

  // 选择头像
  async onChooseAvatar(e) {
    // 检查登录状态
    if (!checkLogin()) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    const { avatarUrl } = e.detail
    // 需要将临时文件路径上传到服务器
    try {
      wx.showLoading({ title: '上传中...' })
      
      // 上传头像到服务器
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: BASE_URL.replace('/v1', '') + '/upload/avatar',
          filePath: avatarUrl,
          name: 'file',
          header: {
            'Authorization': 'Bearer ' + wx.getStorageSync('token')
          },
          success: resolve,
          fail: reject
        })
      })

      const result = JSON.parse(uploadRes.data)
      if (result.code === 200) {
        const imageUrl = BASE_URL.replace('/v1', '') + result.data.url
        this.setData({
          'editForm.avatarUrl': imageUrl
        })
        wx.hideLoading()
        wx.showToast({ title: '头像上传成功', icon: 'success' })
      } else {
        throw new Error(result.message || '上传失败')
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '上传失败', icon: 'none' })
    }
  },

  // 昵称输入
  onNicknameBlur(e) {
    this.setData({
      'editForm.nickName': e.detail.value
    })
  },

  // 获取手机号
  async onGetPhoneNumber(e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      try {
        wx.showLoading({ title: '绑定中...' })
        
        // 获取code用于获取session_key
        const loginRes = await new Promise((resolve, reject) => {
          wx.login({
            success: resolve,
            fail: reject
          })
        })

        // 调用后端接口绑定手机号
        await apiService.auth.bindPhone({
          encryptedData: e.detail.encryptedData,
          iv: e.detail.iv,
          code: loginRes.code
        })

        // 重新加载用户信息
        await this.loadUserInfo()
        
        this.setData({
          'editForm.phone': this.data.userInfo?.phone || ''
        })

        wx.hideLoading()
        wx.showToast({ title: '绑定成功', icon: 'success' })
      } catch (err) {
        wx.hideLoading()
        wx.showToast({ title: err.message || '绑定失败', icon: 'none' })
      }
    } else {
      wx.showToast({ title: '用户取消授权', icon: 'none' })
    }
  },

  // 保存用户信息
  async saveUserInfo() {
    // 检查登录状态
    if (!checkLogin()) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })
      
      await apiService.user.updateInfo({
        nickName: this.data.editForm.nickName,
        avatarUrl: this.data.editForm.avatarUrl
      })

      // 重新加载用户信息
      await this.loadUserInfo()
      
      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })
      this.closeEditModal()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    }
  },

  viewAllOrders() {
    wx.switchTab({
      url: '/pages/order/order'
    })
  },

  viewOrders(e) {
    const status = e.currentTarget.dataset.status
    wx.switchTab({
      url: '/pages/order/order'
    })
    // 可以传递状态参数来筛选订单
  },

  goToAddress() {
    wx.navigateTo({
      url: '/pages/address/address'
    })
  },

  goToCoupons() {
    wx.showToast({
      title: '优惠券',
      icon: 'none'
    })
  },

  goToPoints() {
    wx.showToast({
      title: '积分商城',
      icon: 'none'
    })
  },

  contactService() {
    wx.showToast({
      title: '联系客服',
      icon: 'none'
    })
  },

  goToFeedback() {
    wx.showToast({
      title: '意见反馈',
      icon: 'none'
    })
  }
})
