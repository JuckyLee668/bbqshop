// 登录检查工具

/**
 * 检查用户是否已登录且已获取openid
 * @returns {boolean} 是否已登录
 */
function checkLogin() {
  const token = wx.getStorageSync('token');
  const userInfo = wx.getStorageSync('userInfo');
  return !!(token && userInfo && userInfo.openid);
}

/**
 * 确保用户已登录，如果未登录则引导登录
 * @returns {Promise<boolean>} 是否已登录（登录成功或已登录返回true）
 */
async function ensureLogin() {
  // 检查是否已登录
  if (checkLogin()) {
    return true;
  }

  // 未登录，引导用户登录
  return new Promise((resolve) => {
    wx.showModal({
      title: '提示',
      content: '请先登录后再使用此功能',
      confirmText: '去登录',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 调用登录
            const app = getApp();
            await app.wxLogin();
            // 登录后检查是否获取到openid
            const userInfo = wx.getStorageSync('userInfo');
            if (userInfo && userInfo.openid) {
              wx.showToast({
                title: '登录成功',
                icon: 'success'
              });
              resolve(true);
            } else {
              // 登录成功但没有openid，提示用户去个人中心完善信息
              wx.showModal({
                title: '提示',
                content: '登录成功！请在个人中心完善您的微信昵称和头像信息',
                showCancel: false,
                confirmText: '知道了',
                success: () => {
                  resolve(true); // 即使没有openid，也允许继续使用
                }
              });
            }
          } catch (err) {
            wx.showToast({
              title: err.message || '登录失败',
              icon: 'none'
            });
            resolve(false);
          }
        } else {
          resolve(false);
        }
      }
    });
  });
}

module.exports = {
  checkLogin,
  ensureLogin
};
