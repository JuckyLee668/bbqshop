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
      
      // 处理头像URL，确保是完整URL用于显示
      let avatarUrl = userInfo.avatarUrl || ''
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        const baseUrl = BASE_URL.replace('/v1', '')
        avatarUrl = avatarUrl.startsWith('/') ? baseUrl + avatarUrl : baseUrl + '/' + avatarUrl
      }
      
      this.setData({
        isLoggedIn: true,
        userInfo: {
          nickName: userInfo.nickName || '微信用户',
          avatarUrl: avatarUrl,
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

  // 一键登录（参照示例，使用 getUserProfile 获取用户信息）
  async handleOneClickLogin() {
    if (this.data.loginLoading) return
    
    try {
      this.setData({ loginLoading: true })
      
      // 尝试使用 getUserProfile 获取用户信息（需要用户主动触发）
      // 注意：getUserProfile 在某些基础库版本中可能已废弃，但可以尝试
      const userInfo = await new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于完善会员资料', // 声明用途，必填
          success: (res) => {
            console.log('用户信息获取成功:', res.userInfo)
            resolve({
              nickName: res.userInfo.nickName,
              avatarUrl: res.userInfo.avatarUrl
            })
          },
          fail: (err) => {
            console.log('用户拒绝授权或API不可用:', err)
            // 如果 getUserProfile 失败，继续登录流程（不强制要求用户信息）
            resolve(null)
          }
        })
      })
      
      // 调用登录接口（传入用户信息）
      const app = getApp()
      await app.wxLogin(userInfo)
      
      // 登录成功后重新加载用户信息
      await this.loadUserInfo()
      
      // 如果用户授权了信息，显示成功提示
      if (userInfo) {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
      } else {
        // 如果用户未授权，提示完善信息
        wx.showModal({
          title: '完善个人信息',
          content: '为了更好的使用体验，建议设置您的头像和昵称',
          confirmText: '立即设置',
          cancelText: '稍后',
          showCancel: true,
          success: (res) => {
            if (res.confirm) {
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

    // 确保有最新的用户信息
    if (!this.data.userInfo) {
      await this.loadUserInfo();
    }

    // 从服务器获取最新的用户信息作为默认值
    try {
      const latestUserInfo = await apiService.user.getInfo()
      
      // 处理头像URL，确保是完整URL
      let avatarUrl = latestUserInfo.avatarUrl || ''
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        const baseUrl = BASE_URL.replace('/v1', '')
        avatarUrl = avatarUrl.startsWith('/') ? baseUrl + avatarUrl : baseUrl + '/' + avatarUrl
      }
      
      this.setData({
        showEditModal: true,
        editForm: {
          nickName: latestUserInfo.nickName || '微信用户',
          avatarUrl: avatarUrl,
          phone: latestUserInfo.phone || '',
          openid: latestUserInfo.openid || ''
        }
      })
      console.log('编辑表单已填充，昵称:', latestUserInfo.nickName, '头像:', avatarUrl ? '已设置' : '未设置')
    } catch (err) {
      // 如果获取失败，使用本地缓存的数据
      console.error('获取用户信息失败，使用本地数据:', err)
      
      // 处理本地头像URL
      let avatarUrl = this.data.userInfo?.avatarUrl || ''
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        const baseUrl = BASE_URL.replace('/v1', '')
        avatarUrl = avatarUrl.startsWith('/') ? baseUrl + avatarUrl : baseUrl + '/' + avatarUrl
      }
      
      this.setData({
        showEditModal: true,
        editForm: {
          nickName: this.data.userInfo?.nickName || '微信用户',
          avatarUrl: avatarUrl,
          phone: this.data.userInfo?.phone || '',
          openid: this.data.userInfo?.openid || ''
        }
      })
    }
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
        // 保存相对路径到表单（用于提交到服务器）
        const relativeUrl = result.data.url
        // 显示完整URL（用于预览）
        const fullImageUrl = BASE_URL.replace('/v1', '') + relativeUrl
        this.setData({
          'editForm.avatarUrl': fullImageUrl // 先保存完整URL用于显示，保存时会转换回相对路径
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
      
      // 确保头像URL是相对路径（如果存储的是完整URL，需要转换）
      let avatarUrl = this.data.editForm.avatarUrl || ''
      if (avatarUrl && avatarUrl.startsWith('http')) {
        // 如果是完整URL，提取相对路径
        const baseUrl = BASE_URL.replace('/v1', '')
        if (avatarUrl.startsWith(baseUrl)) {
          avatarUrl = avatarUrl.replace(baseUrl, '')
        } else {
          // 如果是微信头像URL或其他外部URL，保持原样
          // 但通常应该上传到自己的服务器
        }
      }
      
      await apiService.user.updateInfo({
        nickName: this.data.editForm.nickName || '微信用户',
        avatarUrl: avatarUrl
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
