const apiService = require('../../utils/api-service.js');
const { BASE_URL } = require('../../utils/api.js');
const { ensureLogin } = require('../../utils/auth.js');
const app = getApp();

Page({
  data: {
    productId: '',
    // 当前商品详情
    product: null,
    productInfo: null,
    swiperCurrent: 0,
    productImages: [],
    selectedFlavor: 'original',
    flavors: [],
    selectedSpicy: 'medium',
    spicyLevels: [],
    addons: [],
    quantity: 1,
    // 总价，字符串方便直接展示
    totalPrice: '0.00',
    enableAddons: true,
    loading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ productId: options.id })
      this.loadProductDetail()
    }
  },

  // 加载商品详情
  async loadProductDetail() {
    try {
      this.setData({ loading: true })
      const product = await apiService.product.getDetail(this.data.productId)
      
      // 处理图片URL，确保是完整路径
      const baseUrl = BASE_URL.replace('/v1', '') // 去掉 /v1 后缀
      let images = []
      
      if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        images = product.images.map(img => {
          if (!img || typeof img !== 'string' || img.trim() === '') return null
          if (img.startsWith('http://') || img.startsWith('https://')) return img
          if (img.startsWith('linear-gradient')) return null
          // 处理相对路径
          if (img.startsWith('/')) {
            return baseUrl + img
          }
          return baseUrl + '/' + img
        }).filter(img => img !== null && img !== '' && typeof img === 'string')
      }
      
      // 如果没有图片，至少保留一个空字符串用于显示占位图
      if (images.length === 0) {
        images = ['']
      }
      
      console.log('=== 商品详情调试信息 ===')
      console.log('商品ID:', this.data.productId)
      console.log('原始图片数据:', product.images)
      console.log('处理后的图片数据:', images)
      console.log('BASE_URL:', BASE_URL)
      console.log('baseUrl:', baseUrl)
      console.log('商品名称:', product.name)
      console.log('====================')
      
      // 处理加料图片URL
      const processedAddons = (product.addons || []).map((item, index) => {
        let addonImage = ''
        if (item.image && typeof item.image === 'string' && item.image.trim() !== '') {
          if (item.image.startsWith('http://') || item.image.startsWith('https://')) {
            addonImage = item.image
          } else if (item.image.startsWith('/')) {
            addonImage = baseUrl + item.image
          } else {
            addonImage = baseUrl + '/' + item.image
          }
        }
        
        return {
          ...item,
          id: item._id || item.id || index,
          selected: false,
          gradient: this.getAddonGradient(index),
          image: addonImage
        }
      })
      
      console.log('加料数据:', processedAddons)
      
      this.setData({
        product: product,
        productInfo: product,
        productImages: images,
        flavors: product.flavors || [],
        spicyLevels: product.spicyLevels || [],
        addons: processedAddons,
        selectedFlavor: product.flavors?.[0]?.value || 'original',
        selectedSpicy: product.spicyLevels?.[0]?.value || 'medium',
        enableAddons: product.enableAddons !== false
      })
      // 加载完成后计算一次总价
      this.calculateTotalPrice()
    } catch (err) {
      console.error('加载商品详情失败:', err)
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } finally {
      this.setData({ loading: false })
    }
  },

  getFlavorLabel(value) {
    const map = { original: '原味', spicy: '香辣', cumin: '孜然' }
    return map[value] || '原味'
  },

  getSpicyLabel(value) {
    const map = { none: '不辣', mild: '微辣', medium: '中辣', hot: '重辣' }
    return map[value] || '中辣'
  },

  getAddonGradient(index) {
    const gradients = [
      'linear-gradient(135deg, #FDE047 0%, #EAB308 100%)',
      'linear-gradient(135deg, #86EFAC 0%, #22C55E 100%)',
      'linear-gradient(135deg, #FCA5A5 0%, #EF4444 100%)'
    ]
    return gradients[index % gradients.length]
  },

  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current })
  },

  // 图片加载失败处理
  onImageError(e) {
    const index = e.currentTarget.dataset.index
    const productImages = this.data.productImages
    // 将加载失败的图片替换为空字符串，显示占位图
    productImages[index] = ''
    this.setData({ productImages })
  },

  // 加料图片加载失败处理
  onAddonImageError(e) {
    const id = e.currentTarget.dataset.id
    const addons = this.data.addons.map((item) => {
      if (item.id === id) {
        return { ...item, image: '' }
      }
      return item
    })
    this.setData({ addons })
  },

  onFlavorChange(e) {
    this.setData({ selectedFlavor: e.detail.value })
  },

  onSpicyChange(e) {
    this.setData({ selectedSpicy: e.detail.value })
  },

  toggleAddon(e) {
    const id = e.currentTarget.dataset.id
    const addons = this.data.addons.map((item) => {
      if (item.id === id) {
        return { ...item, selected: !item.selected }
      }
      return item
    })
    this.setData({ addons })
    this.calculateTotalPrice()
  },

  onQuantityChange(e) {
    this.setData({ quantity: e.detail.value })
    this.calculateTotalPrice()
  },

  // 计算总价
  calculateTotalPrice() {
    const { product, quantity, addons } = this.data
    if (!product) {
      this.setData({ totalPrice: '0.00' })
      return 0
    }
    
    const basePrice = product.price || 0
    const selectedAddons = addons.filter(item => item.selected)
    const addonPrice = selectedAddons.reduce((sum, item) => sum + (item.price || 0), 0)
    const totalPrice = (basePrice + addonPrice) * quantity
    
    this.setData({ totalPrice: totalPrice.toFixed(2) })
    return totalPrice
  },

  async addToCart() {
    try {
      // 确保用户已登录
      const isLoggedIn = await ensureLogin();
      if (!isLoggedIn) {
        return;
      }

      const { selectedFlavor, selectedSpicy, addons, quantity, productInfo } = this.data
      const selectedAddons = addons.filter((item) => item.selected)
      
      // 构建规格字符串
      const flavorLabel = this.getFlavorLabel(selectedFlavor)
      const spicyLabel = this.getSpicyLabel(selectedSpicy)
      const addonLabels = selectedAddons.map(a => a.name).join(' / ')
      const spec = `${flavorLabel} / ${spicyLabel}${addonLabels ? ' / ' + addonLabels : ''}`
      
      await apiService.cart.add({
        productId: this.data.productId,
        quantity: quantity,
        flavor: selectedFlavor,
        spicy: selectedSpicy,
        addons: selectedAddons.map(a => ({ id: a.id, name: a.name, price: a.price })),
        spec: spec
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
  },

  async buyNow() {
    try {
      // 确保用户已登录
      const isLoggedIn = await ensureLogin();
      if (!isLoggedIn) {
        return;
      }

      const { selectedFlavor, selectedSpicy, addons, quantity, productInfo } = this.data
      const selectedAddons = addons.filter((item) => item.selected)
      
      // 构建规格字符串
      const flavorLabel = this.getFlavorLabel(selectedFlavor)
      const spicyLabel = this.getSpicyLabel(selectedSpicy)
      const addonLabels = selectedAddons.map(a => a.name).join(' / ')
      const spec = `${flavorLabel} / ${spicyLabel}${addonLabels ? ' / ' + addonLabels : ''}`
      
      // 将商品添加到购物车
      await apiService.cart.add({
        productId: this.data.productId,
        quantity: quantity,
        flavor: selectedFlavor,
        spicy: selectedSpicy,
        addons: selectedAddons.map(a => ({ id: a.id, name: a.name, price: a.price })),
        spec: spec
      })

      // 跳转到购物车页面（结算页）
      wx.switchTab({
        url: '/pages/cart/cart'
      })
    } catch (err) {
      wx.showToast({
        title: err.message || '添加失败',
        icon: 'none'
      })
    }
  }
})
