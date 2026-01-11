import request from './index'

// 商家登录
export const login = (data: { username: string; password: string }) => {
  return request({
    url: '/merchant/login',
    method: 'post',
    data
  })
}

// 获取统计数据
export const getStatistics = (date?: string) => {
  return request({
    url: '/merchant/statistics',
    method: 'get',
    params: { date }
  })
}

// 获取订单列表
export const getOrders = (params: any) => {
  return request({
    url: '/merchant/orders',
    method: 'get',
    params
  })
}

// 接单
export const acceptOrder = (id: string) => {
  return request({
    url: `/merchant/orders/${id}/accept`,
    method: 'put'
  })
}

// 完成订单
export const completeOrder = (id: string) => {
  return request({
    url: `/merchant/orders/${id}/complete`,
    method: 'put'
  })
}

// 获取商品列表
export const getProducts = (params: any) => {
  return request({
    url: '/merchant/products',
    method: 'get',
    params
  })
}

// 创建商品
export const createProduct = (data: any) => {
  return request({
    url: '/merchant/products',
    method: 'post',
    data
  })
}

// 更新商品
export const updateProduct = (id: string, data: any) => {
  return request({
    url: `/merchant/products/${id}`,
    method: 'put',
    data
  })
}

// 删除商品
export const deleteProduct = (id: string) => {
  return request({
    url: `/merchant/products/${id}`,
    method: 'delete'
  })
}

// 上下架商品
export const updateProductStatus = (id: string, status: string) => {
  return request({
    url: `/merchant/products/${id}/status`,
    method: 'put',
    data: { status }
  })
}

// 获取分类列表
export const getCategories = () => {
  return request({
    url: '/merchant/categories',
    method: 'get'
  })
}

// 创建分类
export const createCategory = (data: any) => {
  return request({
    url: '/merchant/categories',
    method: 'post',
    data
  })
}

// 更新分类
export const updateCategory = (id: string, data: any) => {
  return request({
    url: `/merchant/categories/${id}`,
    method: 'put',
    data
  })
}

// 删除分类
export const deleteCategory = (id: string) => {
  return request({
    url: `/merchant/categories/${id}`,
    method: 'delete'
  })
}

// 获取门店信息
export const getStore = () => {
  return request({
    url: '/merchant/store',
    method: 'get'
  })
}

// 更新门店信息
export const updateStore = (data: any) => {
  return request({
    url: '/merchant/store',
    method: 'put',
    data
  })
}

// 设置/取消推荐商品
export const setProductRecommend = (id: string, isRecommend: boolean) => {
  return request({
    url: `/merchant/products/${id}/recommend`,
    method: 'put',
    data: { isRecommend }
  })
}

// 设置/取消特价套餐
export const setProductSpecial = (id: string, isSpecial: boolean) => {
  return request({
    url: `/merchant/products/${id}/special`,
    method: 'put',
    data: { isSpecial }
  })
}

// 获取特价套餐列表
export const getSpecialPackages = (params?: any) => {
  return request({
    url: '/merchant/special-packages',
    method: 'get',
    params
  })
}

// 获取特价套餐详情
export const getSpecialPackage = (id: string) => {
  return request({
    url: `/merchant/special-packages/${id}`,
    method: 'get'
  })
}

// 创建特价套餐
export const createSpecialPackage = (data: any) => {
  return request({
    url: '/merchant/special-packages',
    method: 'post',
    data
  })
}

// 更新特价套餐
export const updateSpecialPackage = (id: string, data: any) => {
  return request({
    url: `/merchant/special-packages/${id}`,
    method: 'put',
    data
  })
}

// 删除特价套餐
export const deleteSpecialPackage = (id: string) => {
  return request({
    url: `/merchant/special-packages/${id}`,
    method: 'delete'
  })
}

// 获取用户列表
export const getUsers = (params?: any) => {
  return request({
    url: '/merchant/users',
    method: 'get',
    params
  })
}

// 获取评论列表
export const getReviews = (params?: any) => {
  return request({
    url: '/merchant/reviews',
    method: 'get',
    params
  })
}

// 回复评论
export const replyReview = (id: string, reply: string) => {
  return request({
    url: `/merchant/reviews/${id}/reply`,
    method: 'put',
    data: { reply }
  })
}

// 删除评论
export const deleteReview = (id: string) => {
  return request({
    url: `/merchant/reviews/${id}`,
    method: 'delete'
  })
}

// ========== 优惠券管理 ==========

// 获取优惠券列表
export const getCoupons = (params?: any) => {
  return request({
    url: '/merchant/coupons',
    method: 'get',
    params
  })
}

// 获取优惠券详情
export const getCoupon = (id: string) => {
  return request({
    url: `/merchant/coupons/${id}`,
    method: 'get'
  })
}

// 创建优惠券
export const createCoupon = (data: any) => {
  return request({
    url: '/merchant/coupons',
    method: 'post',
    data
  })
}

// 更新优惠券
export const updateCoupon = (id: string, data: any) => {
  return request({
    url: `/merchant/coupons/${id}`,
    method: 'put',
    data
  })
}

// 删除优惠券
export const deleteCoupon = (id: string) => {
  return request({
    url: `/merchant/coupons/${id}`,
    method: 'delete'
  })
}