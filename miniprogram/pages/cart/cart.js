const apiService = require('../../utils/api-service.js');
const { BASE_URL } = require('../../utils/api.js');
const { ensureLogin } = require('../../utils/auth.js');
const app = getApp();

Page({
  data: {
    cartList: [],
    selectAll: false,
    totalPrice: '0.00',
    selectedCount: 0,
    loading: false,
    deliveryType: 'pickup', // 配送方式：pickup-到店自取, delivery-外卖配送
    storeInfo: null, // 门店信息
    deliveryFee: 0, // 配送费
    showDeliveryFee: true, // 是否显示配送费信息
    finalTotalPrice: '0.00', // 最终总价（商品总价 + 配送费）
    deliveryFeeText: '0.00', // 配送费文本
    isFreeDelivery: false, // 是否免配送费
    freeDeliveryText: '', // 免配送费提示文本
    deliveryFeeDisplayText: '' // 配送费显示文本
  },

  async onLoad() {
    // 确保用户已登录
    const isLoggedIn = await ensureLogin();
    if (isLoggedIn) {
      await this.loadStoreInfo();
      this.loadCart();
    }
  },

  async onShow() {
    // 确保用户已登录
    const isLoggedIn = await ensureLogin();
    if (isLoggedIn) {
      await this.loadStoreInfo();
      this.loadCart();
    }
  },

  // 加载门店信息
  async loadStoreInfo() {
    try {
      const storeInfo = await apiService.home.getStoreInfo();
      if (storeInfo) {
        this.setData({
          storeInfo,
          showDeliveryFee: storeInfo.showDeliveryFee !== false
        });
        this.calculateDeliveryFee();
      }
    } catch (err) {
      console.error('加载门店信息失败:', err);
    }
  },

  // 加载购物车
  async loadCart() {
    try {
      this.setData({ loading: true })
      const data = await apiService.cart.getList()
      
      // 处理图片URL
      const baseUrl = BASE_URL.replace('/v1', '')
      const processImage = (img) => {
        if (!img) return ''
        if (img.startsWith('http')) return img
        if (img.startsWith('/')) return baseUrl + img
        return baseUrl + '/' + img
      }
      
      const cartList = (data.list || []).map((item) => ({
        ...item,
        name: item.productName || item.name,
        image: processImage(item.image || ''),
        gradient: this.getGradientByIndex(item.productId),
        checked: item.checked === true || item.checked === 'true' // 确保 checked 是明确的 true
      }))
      
      this.setData({
        cartList
      })
      
      // 更新底部状态（全选、总价等）
      this.updateFooter()
    } catch (err) {
      // 如果API失败，尝试从本地存储加载
      const cart = wx.getStorageSync('cart') || []
      if (cart.length > 0) {
        const cartList = cart.map((item) => ({
          ...item,
          checked: item.checked !== false,
          gradient: item.gradient || 'linear-gradient(135deg, #FED7AA 0%, #FB923C 100%)',
          spec: item.spec || ''
        }))
        this.setData({ cartList })
        this.updateSelectAll()
        this.updateTotal()
      } else {
        wx.showToast({
          title: err.message || '加载失败',
          icon: 'none'
        })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  getGradientByIndex(id) {
    const gradients = [
      'linear-gradient(135deg, #FED7AA 0%, #FB923C 100%)',
      'linear-gradient(135deg, #FCA5A5 0%, #EF4444 100%)',
      'linear-gradient(135deg, #D8B4FE 0%, #A855F7 100%)'
    ]
    return gradients[parseInt(id) % gradients.length]
  },

  // 单个商品勾选/取消勾选
  async toggleItem(e) {
    try {
      const index = e.currentTarget.dataset.index
      const cartList = this.data.cartList.map(item => ({ ...item })) // 深拷贝
      const item = cartList[index]
      
      // 直接切换选中状态（参考 HTML 逻辑）
      const checked = !item.checked
      item.checked = checked
      
      // 更新后端
      await apiService.cart.update(item.id, { checked })
      
      // 更新本地状态
      this.setData({ cartList })
      
      // 更新底部状态（全选、总价等）
      this.updateFooter()
    } catch (err) {
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      })
    }
  },

  // 全选/取消全选（参考 HTML 逻辑）
  async toggleSelectAll(e) {
    try {
      const cartList = this.data.cartList.map(item => ({ ...item })) // 深拷贝
      
      // 检查是否所有商品都被选中
      const allChecked = cartList.length > 0 && cartList.every(item => item.checked === true)
      
      // 切换全选状态
      const newChecked = !allChecked
      
      // 更新所有商品的选中状态
      cartList.forEach(item => {
        item.checked = newChecked
      })
      
      // 批量更新后端
      const promises = cartList.map(item => 
        apiService.cart.update(item.id, { checked: newChecked })
      )
      await Promise.all(promises)
      
      // 更新本地状态
      this.setData({ cartList })
      
      // 更新底部状态（全选、总价等）
      this.updateFooter()
    } catch (err) {
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      })
    }
  },

  // 更新底部状态：全选状态、总价、配送费等（参考 HTML 逻辑）
  updateFooter() {
    const cartList = this.data.cartList || [];
    
    // 计算选中商品
    const checkedItems = cartList.filter(item => item.checked);
    const allChecked = cartList.length > 0 && checkedItems.length === cartList.length;
    
    // 商品总价 & 数量
    const total = checkedItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0);
    }, 0);
    
    const selectedCount = checkedItems.reduce((sum, item) => {
      return sum + (parseInt(item.quantity) || 0);
    }, 0);
  
    // 先更新基础数据
    this.setData({
      selectAll: allChecked,
      totalPrice: total.toFixed(2),
      selectedCount
    });
  
    // 再触发配送费计算（它会 setData 最终价格）
    this.calculateDeliveryFee();
  },

  async changeQuantity(e) {
    try {
      const index = e.currentTarget.dataset.index
      const quantity = parseInt(e.detail.value) || 1;
      if (quantity < 1) return; // 防止非法值
      const cartList = this.data.cartList.map(item => ({ ...item })); // 深拷贝
      const item = cartList[index]
      
      await apiService.cart.update(item.id, { quantity })
      
      cartList[index].quantity = quantity
      this.setData({ cartList })
      this.updateFooter()
    } catch (err) {
      wx.showToast({
        title: err.message || '更新失败',
        icon: 'none'
      })
    }
  },

  async deleteItem(e) {
    try {
      const index = e.currentTarget.dataset.index
      const item = this.data.cartList[index]
      
      const res = await new Promise((resolve) => {
        wx.showModal({
          title: '提示',
          content: '确定要删除这个商品吗？',
          success: resolve
        })
      })
      
      if (res.confirm) {
        await apiService.cart.delete(item.id)
        
        const cartList = [...this.data.cartList]
        cartList.splice(index, 1)
        this.setData({ cartList })
        this.updateFooter()
      }
    } catch (err) {
      wx.showToast({
        title: err.message || '删除失败',
        icon: 'none'
      })
    }
  },

  async clearCart() {
    try {
      const res = await new Promise((resolve) => {
        wx.showModal({
          title: '提示',
          content: '确定要清空购物车吗？',
          success: resolve
        })
      })
      
      if (res.confirm) {
        await apiService.cart.clear()
        this.setData({ 
          cartList: [], 
          totalPrice: '0.00', 
          selectedCount: 0,
          selectAll: false,
          deliveryFee: 0,
          finalTotalPrice: '0.00'
        })
        wx.showToast({
          title: '清空成功',
          icon: 'success'
        })
      }
    } catch (err) {
      wx.showToast({
        title: err.message || '清空失败',
        icon: 'none'
      })
    }
  },

  // 兼容旧方法名，重定向到 updateFooter
  updateTotal() {
    this.updateFooter()
  },

  // 更新最终总价（商品总价 + 配送费）
  updateFinalPrice() {
    const productTotal = parseFloat(this.data.totalPrice) || 0;
    const deliveryFee = this.data.deliveryFee || 0;
    const finalTotal = productTotal + deliveryFee;
    
    this.setData({
      finalTotalPrice: finalTotal.toFixed(2),
      deliveryFeeText: deliveryFee.toFixed(2)
    });
  },

  // 计算配送费
  calculateDeliveryFee() {
    const { deliveryType, storeInfo, totalPrice } = this.data;
    
    // 如果没有门店信息，重置所有配送费相关数据
    if (!storeInfo) {
      this.setData({ 
        deliveryFee: 0,
        isFreeDelivery: false,
        freeDeliveryText: '',
        deliveryFeeDisplayText: ''
      });
      this.updateFinalPrice();
      return;
    }

    const productTotal = parseFloat(totalPrice) || 0;
    const freeThreshold = storeInfo.freeDeliveryThreshold || 50;
    const fee = storeInfo.deliveryFee || 5;

    // 如果选择的是到店自取，配送费为0，但仍生成提示文本用于显示
    if (deliveryType === 'pickup') {
      this.setData({ 
        deliveryFee: 0,
        isFreeDelivery: false,
        freeDeliveryText: `满${freeThreshold}元免配送费`, // 始终显示免配送费提示
        deliveryFeeDisplayText: ''
      });
      this.updateFinalPrice();
      return;
    }

    // 如果商品总价大于等于免费配送界限，则免配送费
    const isFree = productTotal >= freeThreshold;
    const deliveryFee = isFree ? 0 : fee;
    
    // 始终显示免配送费提示文本
    const freeDeliveryText = `满${freeThreshold}元免配送费`;
    let deliveryFeeDisplayText = '';
    
    if (!isFree) {
      deliveryFeeDisplayText = `配送费¥${fee}`;
    }
    
    this.setData({ 
      deliveryFee,
      isFreeDelivery: isFree,
      freeDeliveryText, // 始终设置，不管是否达到免费配送界限
      deliveryFeeDisplayText
    });
    this.updateFinalPrice();
  },

  // 切换配送方式
  onDeliveryTypeChange(e) {
    const deliveryType = e.currentTarget.dataset.type;
    this.setData({ deliveryType });
    this.calculateDeliveryFee();
  },

  async checkout() {
    try {
      const selectedItems = this.data.cartList.filter((item) => item.checked)
      if (selectedItems.length === 0) {
        wx.showToast({
          title: '请选择商品',
          icon: 'none'
        })
        return
      }

      // 如果选择外卖配送，需要选择地址
      if (this.data.deliveryType === 'delivery') {
        // 这里可以添加地址选择逻辑，暂时先允许创建订单
        // 后续可以在订单创建时验证地址
      }
      
      const cartItemIds = selectedItems.map(item => item.id)
      const orderData = await apiService.order.create({
        cartItemIds,
        deliveryType: this.data.deliveryType,
        deliveryFee: this.data.deliveryFee
      })

      // 跳转到模拟支付页面，并通过事件通道传递支付参数
      wx.navigateTo({
        url: `/pages/pay/pay?orderId=${orderData.orderId}&orderNo=${orderData.orderNo || orderData.orderId}&totalPrice=${orderData.totalPrice}`,
        success: (res) => {
          if (res.eventChannel) {
            res.eventChannel.emit('payData', {
              orderId: orderData.orderId,
              orderNo: orderData.orderNo || orderData.orderId,
              totalPrice: orderData.totalPrice,
              productTotal: orderData.productTotal || orderData.totalPrice,
              deliveryFee: orderData.deliveryFee || 0,
              deliveryType: this.data.deliveryType,
              payParams: orderData.payParams
            })
          }
        }
      })
    } catch (err) {
      wx.showToast({
        title: err.message || '结算失败',
        icon: 'none'
      })
    }
  }
})
