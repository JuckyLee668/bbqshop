// 登录检查工具

/**
 * 检查用户是否已登录
 * @returns {boolean} 是否已登录
 */
function checkLogin() {
  const token = wx.getStorageSync('token');
  // 只要有 token 就认为已登录（openid 在后端通过 code 获取，前端不需要立即有）
  return !!token;
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

  // 未登录，引导用户登录（使用微信一键登录）
  return new Promise((resolve) => {
    wx.showModal({
      title: '提示',
      content: '请先登录后再使用此功能',
      confirmText: '一键登录',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          // 跳转到个人中心页面进行登录
          wx.switchTab({
            url: '/pages/profile/profile',
            success: () => {
              // 跳转成功后，提示用户点击登录按钮
              setTimeout(() => {
                wx.showToast({
                  title: '请在个人中心点击登录',
                  icon: 'none',
                  duration: 2000
                })
              }, 500)
            }
          })
          resolve(false) // 跳转后返回 false，等待用户登录
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
