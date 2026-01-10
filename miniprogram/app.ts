// app.ts
const apiService = require('./utils/api-service.js');

interface GlobalData {
  userInfo?: any;
  token?: string;
}

interface AppOption extends IAppOption {
  globalData: GlobalData;
  wxLogin: () => Promise<any>;
  getUserInfo: () => Promise<void>;
}

App<AppOption>({
  globalData: {
    userInfo: undefined,
    token: undefined
  },
  
  onLaunch() {
    // 检查是否已登录
    const token = wx.getStorageSync('token')
    if (token) {
      this.globalData.token = token
      // 获取用户信息
      this.getUserInfo()
    }
  },

  // 微信登录
  async wxLogin() {
    try {
      wx.showLoading({ title: '登录中...' })
      
      // 获取微信登录code
      const res = await new Promise<any>((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: (err) => {
            console.error('wx.login失败:', err)
            reject(new Error('获取登录凭证失败，请重试'))
          }
        })
      })

      // 注意：wx.getUserProfile 只能在用户点击事件中调用
      // 在自动登录流程中不调用，openid是通过code在后端获取的
      // 用户信息可以在登录后通过编辑资料功能获取
      const userInfo = null

      // 调用后端登录接口（openid是通过code在后端获取的，不依赖userInfo）
      const loginData = await apiService.auth.wxLogin(res.code, userInfo)
      
      // 验证登录数据是否包含openid
      if (!loginData || !loginData.userInfo || !loginData.userInfo.openid) {
        // 如果登录后没有openid，尝试重新获取用户信息
        try {
          const fullUserInfo = await apiService.user.getInfo();
          if (fullUserInfo && fullUserInfo.openid) {
            loginData.userInfo.openid = fullUserInfo.openid;
          } else {
            throw new Error('登录失败：未获取到微信ID')
          }
        } catch (err) {
          console.error('获取用户openid失败:', err)
          throw new Error('登录失败：未获取到微信ID，请检查服务器配置')
        }
      }
      
      // 保存token和用户信息（确保包含openid）
      wx.setStorageSync('token', loginData.token)
      wx.setStorageSync('userInfo', loginData.userInfo)
      
      this.globalData.token = loginData.token
      this.globalData.userInfo = loginData.userInfo
      
      wx.hideLoading()
      return loginData
    } catch (err: any) {
      wx.hideLoading()
      console.error('登录失败:', err)
      const errorMessage = err.message || '登录失败，请重试'
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 2000
      })
      throw err
    }
  },

  // 获取用户信息
  async getUserInfo() {
    try {
      const userInfo = await apiService.user.getInfo()
      // 确保openid被保存
      if (userInfo && userInfo.openid) {
        this.globalData.userInfo = userInfo
        wx.setStorageSync('userInfo', userInfo)
      } else {
        // 如果没有openid，清除登录状态，需要重新登录
        console.warn('用户信息中缺少openid，需要重新登录')
        wx.removeStorageSync('token')
        wx.removeStorageSync('userInfo')
        this.globalData.token = undefined
        this.globalData.userInfo = undefined
      }
    } catch (err) {
      console.error('获取用户信息失败:', err)
      // 如果获取失败，可能是token过期，清除登录状态
      wx.removeStorageSync('token')
      wx.removeStorageSync('userInfo')
      this.globalData.token = undefined
      this.globalData.userInfo = undefined
    }
  }
})