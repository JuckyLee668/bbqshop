// API 请求工具类
const BASE_URL = 'http://localhost:3000/v1'; // 开发环境，生产环境需要修改
//const BASE_URL = 'https://api.example.com/v1'; // 生产环境
// 请求封装
function request(url, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    
    wx.request({
      url: BASE_URL + url,
      method: method,
      data: data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.statusCode === 200) {
          if (res.data.code === 200) {
            resolve(res.data.data);
          } else {
            // token过期，清除并跳转登录
            if (res.data.code === 401) {
              wx.removeStorageSync('token');
              wx.removeStorageSync('userInfo');
            }
            reject(new Error(res.data.message || '请求失败'));
          }
        } else {
          reject(new Error(`请求失败: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

// GET 请求
function get(url, data = {}) {
  return request(url, 'GET', data);
}

// POST 请求
function post(url, data = {}) {
  return request(url, 'POST', data);
}

// PUT 请求
function put(url, data = {}) {
  return request(url, 'PUT', data);
}

// DELETE 请求
function del(url, data = {}) {
  return request(url, 'DELETE', data);
}

// 上传文件
function uploadFile(filePath, name = 'file') {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    
    wx.uploadFile({
      url: BASE_URL + '/upload/image',
      filePath: filePath,
      name: name,
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          if (data.code === 200) {
            resolve(data.data);
          } else {
            reject(new Error(data.message || '上传失败'));
          }
        } catch (err) {
          reject(new Error('上传失败'));
        }
      },
      fail: reject
    });
  });
}

module.exports = {
  get,
  post,
  put,
  delete: del,
  uploadFile,
  BASE_URL
};
