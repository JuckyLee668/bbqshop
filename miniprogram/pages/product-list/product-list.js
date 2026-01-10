const apiService = require('../../utils/api-service.js');
const { BASE_URL } = require('../../utils/api.js');

Page({
  data: {
    currentCategory: 0,
    categories: [],
    productList: [],
    loading: false
  },

  onLoad() {
    this.loadCategories()
    this.loadProducts()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadProducts()
  },

  // 加载分类
  async loadCategories() {
    try {
      const categories = await apiService.category.getList()
      console.log('分类数据加载成功:', categories)
      // 后端返回的格式已经是数组，包含 { id: 0, name: '全部' } 和分类列表
      this.setData({ categories: categories || [] })
    } catch (err) {
      console.error('加载分类失败:', err)
      // 如果API失败，使用默认分类
      this.setData({ 
        categories: [
          { id: 0, name: '全部' }
        ]
      })
      wx.showToast({
        title: err.message || '加载分类失败',
        icon: 'none'
      })
    }
  },

  // 加载商品列表
  async loadProducts() {
    try {
      this.setData({ loading: true })
      const params = {}
      if (this.data.currentCategory !== 0) {
        params.categoryId = this.data.currentCategory
      }
      
      const data = await apiService.product.getList(params)
      console.log('商品列表数据加载成功:', data)
      
      // 处理图片URL
      const baseUrl = BASE_URL.replace('/v1', '')
      const processImage = (img) => {
        if (!img) return ''
        if (img.startsWith('http')) return img
        if (img.startsWith('/')) return baseUrl + img
        return baseUrl + '/' + img
      }
      
      this.setData({
        productList: (data.list || []).map(item => ({
          ...item,
          image: processImage(item.image),
          gradient: this.getGradientByIndex(item.id)
        }))
      })
    } catch (err) {
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 根据ID生成渐变色
  getGradientByIndex(id) {
    const gradients = [
      'linear-gradient(135deg, #FED7AA 0%, #FB923C 100%)',
      'linear-gradient(135deg, #FCA5A5 0%, #EF4444 100%)',
      'linear-gradient(135deg, #FDE047 0%, #EAB308 100%)',
      'linear-gradient(135deg, #D8B4FE 0%, #A855F7 100%)',
      'linear-gradient(135deg, #93C5FD 0%, #3B82F6 100%)',
      'linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%)'
    ]
    return gradients[parseInt(id) % gradients.length]
  },

  switchCategory(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ currentCategory: id })
    this.loadProducts()
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${id}`
    })
  },

  async addToCart(e) {
    try {
      const id = e.currentTarget.dataset.id
      const product = this.data.productList.find((p) => p.id === id)
      if (!product || product.stock === 0) return

      await apiService.cart.add({
        productId: id,
        quantity: 1
      })

      wx.showToast({
        title: '已加入购物车',
        icon: 'success'
      })
    } catch (err) {
      wx.showToast({
        title: err.message || '添加失败',
        icon: 'none'
      })
    }
  }
})
