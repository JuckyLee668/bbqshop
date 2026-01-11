// 小程序配置文件
// 用于统一管理配置项

const config = {
  // API 基础地址
  // 开发环境
  baseUrl: 'http://localhost:3000/v1',
  // 生产环境（部署时修改）
  // baseUrl: 'https://rack.xi-han.top/v1',
  
  // 请求超时时间（毫秒）
  timeout: 10000,
  
  // 是否启用调试模式
  debug: false
};

// 根据编译模式自动切换（需要在微信开发者工具中配置）
// 可以通过 wx.getAccountInfoSync() 获取当前环境
try {
  const accountInfo = wx.getAccountInfoSync();
  const envVersion = accountInfo.miniProgram.envVersion;
  
  // 如果是正式版，使用生产环境地址
  if (envVersion === 'release') {
    config.baseUrl = 'https://rack.xi-han.top/v1';
    config.debug = false;
  } else if (envVersion === 'trial') {
    // 体验版也可以使用生产环境
    config.baseUrl = 'https://rack.xi-han.top/v1';
    config.debug = true;
  }
  // 开发版使用开发环境地址（默认值）
} catch (e) {
  // 如果获取失败，使用默认配置
  console.warn('无法获取小程序环境信息，使用默认配置');
}

module.exports = config;
