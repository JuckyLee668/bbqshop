import axios from 'axios'

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('merchant_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code === 200) {
      return res.data
    } else if (res.code === 401) {
      localStorage.removeItem('merchant_token')
      window.location.href = '/login'
      return Promise.reject(new Error(res.message || '未授权'))
    } else {
      return Promise.reject(new Error(res.message || '请求失败'))
    }
  },
  (error) => {
    // 处理 HTTP 错误状态码（400, 500等）
    if (error.response) {
      const res = error.response.data
      // 如果后端返回了错误信息，使用后端的错误信息
      if (res && res.message) {
        return Promise.reject(new Error(res.message))
      }
      // 否则使用默认错误信息
      return Promise.reject(new Error(error.response.statusText || '请求失败'))
    }
    return Promise.reject(error)
  }
)

export default service
