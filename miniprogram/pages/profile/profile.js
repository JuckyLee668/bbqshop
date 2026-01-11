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
    availableCouponCount: 0, // 可用优惠券数量
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
      
      // 获取可用优惠券数量
      let availableCouponCount = 0;
      try {
        const coupons = await apiService.coupon.getList('available');
        const now = new Date();
        availableCouponCount = coupons.filter(coupon => {
          if (!coupon.expireTime) return true;
          return new Date(coupon.expireTime) >= now;
        }).length;
      } catch (err) {
        console.error('获取优惠券数量失败:', err);
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
        },
        availableCouponCount
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

  // 一键登录（参照示例：先获取 code，再获取用户信息）
  handleOneClickLogin() {
    if (this.data.loginLoading) return
    this.setData({ loginLoading: true })
    this.doWechatLogin()
  },

  // 执行微信登录流程（参照示例代码结构）
  doWechatLogin() {
    wx.showLoading({ title: '登录中...' })
    
    // 1. 先获取微信登录 code
    wx.login({
      success: (res) => {
        const code = res.code
        
        if (!code) {
          wx.hideLoading()
          this.setData({ loginLoading: false })
          wx.showToast({
            title: '获取登录凭证失败',
            icon: 'none'
          })
          return
        }

        // 2. 必须显式调用 getUserProfile 才能拿到真实昵称和头像
        wx.getUserProfile({
          desc: '用于展示您的个人资料', // 必填！描述用途
          success: async (profileRes) => {
            const userInfo = profileRes.userInfo // 包含 nickName, avatarUrl
            
            console.log('用户信息获取成功:', userInfo)
            
            try {
              // 3. 将 code + userInfo 一起发给后端
              const app = getApp()
              await app.wxLogin(code, {
                nickName: userInfo.nickName,
                avatarUrl: userInfo.avatarUrl
              })
              
              // 4. 登录成功后重新加载用户信息
              await this.loadUserInfo()
              
              wx.hideLoading()
              this.setData({ loginLoading: false })
              
              wx.showToast({
                title: '登录成功',
                icon: 'success',
                duration: 1500
              })
            } catch (err) {
              wx.hideLoading()
              this.setData({ loginLoading: false })
              console.error('登录请求失败:', err)
              wx.showToast({
                title: err.message || '登录失败',
                icon: 'none',
                duration: 2000
              })
            }
          },
          fail: async (err) => {
            // 用户拒绝授权
            console.log('用户拒绝提供昵称和头像', err)
            
            try {
              // 只用 code 登录（显示默认头像）
              const app = getApp()
              await app.wxLogin(code, null)
              
              // 登录成功后重新加载用户信息
              await this.loadUserInfo()
              
              wx.hideLoading()
              this.setData({ loginLoading: false })
              
              // 提示用户完善信息
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
            } catch (loginErr) {
              wx.hideLoading()
              this.setData({ loginLoading: false })
              console.error('登录请求失败:', loginErr)
              wx.showToast({
                title: loginErr.message || '登录失败',
                icon: 'none',
                duration: 2000
              })
            }
          }
        })
      },
      fail: (err) => {
        wx.hideLoading()
        this.setData({ loginLoading: false })
        console.error('wx.login失败:', err)
        wx.showToast({
          title: '获取登录凭证失败，请重试',
          icon: 'none',
          duration: 2000
        })
      }
    })
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
      
      // 确保有默认值，避免显示错误信息
      const defaultNickName = this.data.userInfo?.nickName || '微信用户'
      
      this.setData({
        showEditModal: true,
        editForm: {
          nickName: defaultNickName,
          avatarUrl: avatarUrl,
          phone: this.data.userInfo?.phone || '',
          openid: this.data.userInfo?.openid || ''
        }
      })
      
      // 如果获取失败，提示用户（但不阻止编辑）
      if (err.message && err.message.includes('404') || err.message.includes('接口不存在')) {
        wx.showToast({
          title: '获取用户信息失败，请重试',
          icon: 'none',
          duration: 2000
        })
      }
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
          url: BASE_URL + '/upload/avatar',
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
        const baseUrl = BASE_URL.replace('/v1', '')
        const fullImageUrl = relativeUrl.startsWith('http') ? relativeUrl : (relativeUrl.startsWith('/') ? baseUrl + relativeUrl : baseUrl + '/' + relativeUrl)
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

  // 昵称输入（实时更新）
  onNicknameInput(e) {
    this.setData({
      'editForm.nickName': e.detail.value
    })
  },

  // 昵称失焦（确保值已更新）
  onNicknameBlur(e) {
    const value = e.detail.value || ''
    this.setData({
      'editForm.nickName': value.trim() || '微信用户'
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
      
      // 获取昵称，确保不为空
      const nickName = (this.data.editForm.nickName || '').trim()
      
      // 如果昵称为空或者是默认值，提示用户
      if (!nickName || nickName === '微信用户') {
        wx.hideLoading()
        wx.showModal({
          title: '提示',
          content: '请输入有效的昵称',
          showCancel: false
        })
        return
      }
      
      await apiService.user.updateInfo({
        nickName: nickName,
        avatarUrl: avatarUrl || undefined
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
    wx.navigateTo({
      url: '/pages/coupon/coupon'
    })
  },

  goToPoints() {
    wx.navigateTo({
      url: '/pages/points/points'
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
