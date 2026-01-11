// app.ts
const apiService = require('./utils/api-service.js');

interface GlobalData {
  userInfo?: any;
  token?: string;
}

interface AppOption extends IAppOption {
  globalData: GlobalData;
  wxLogin: (code: string, userInfo?: { nickName?: string; avatarUrl?: string }) => Promise<any>;
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
      // 静默获取用户信息（失败不影响启动）
      this.getUserInfo().catch(() => {
        // 静默处理错误，不显示提示
        console.log('启动时获取用户信息失败，可能token已过期')
      })
    }
  },

  // 微信一键登录（参照示例：接收 code 和 userInfo）
  async wxLogin(code: string, userInfo?: { nickName?: string; avatarUrl?: string }) {
    try {
      // 1. 准备用户信息（如果已通过 getUserProfile 获取）
      const wxUserInfo = userInfo || null
      if (wxUserInfo) {
        console.log('使用授权获取的用户信息 - 昵称:', wxUserInfo.nickName, '头像:', wxUserInfo.avatarUrl ? '已设置' : '未设置')
      } else {
        console.log('未传入用户信息，将使用默认值')
      }

      // 2. 调用后端登录接口
      // openid 和 session_key 在后端通过 code 获取，前端不需要处理
      const loginData = await apiService.auth.wxLogin(code, wxUserInfo)
      
      // 3. 验证登录结果
      if (!loginData || !loginData.token) {
        throw new Error('登录失败：未获取到登录凭证')
      }
      
      // 4. 保存登录信息
      wx.setStorageSync('token', loginData.token)
      if (loginData.userInfo) {
      wx.setStorageSync('userInfo', loginData.userInfo)
        this.globalData.userInfo = loginData.userInfo
      }
      this.globalData.token = loginData.token
      
      wx.hideLoading()
      wx.showToast({
        title: '登录成功',
        icon: 'success',
        duration: 1500
      })
      
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
        return userInfo
      } else {
        // 如果没有openid，清除登录状态，需要重新登录
        console.warn('用户信息中缺少openid，需要重新登录')
        wx.removeStorageSync('token')
        wx.removeStorageSync('userInfo')
        this.globalData.token = undefined
        this.globalData.userInfo = undefined
        return null
      }
    } catch (err: any) {
      // 如果获取失败，可能是token过期，清除登录状态
      const errorMsg = err.message || ''
      if (errorMsg.includes('401') || errorMsg.includes('请求失败: 401')) {
        console.log('Token已过期，清除登录状态')
      wx.removeStorageSync('token')
      wx.removeStorageSync('userInfo')
      this.globalData.token = undefined
      this.globalData.userInfo = undefined
      } else {
        console.error('获取用户信息失败:', err)
      }
      throw err // 重新抛出错误，让调用者决定如何处理
    }
  }
})