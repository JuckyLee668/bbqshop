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
    deliveryFeeDisplayText: '', // 配送费显示文本
    // 优惠券相关
    selectedCoupon: null, // 选中的优惠券
    usableCoupons: [], // 可用优惠券列表
    couponDiscount: 0, // 优惠券折扣金额
    couponDiscountText: '0.00', // 优惠券折扣金额文本
    showCouponPicker: false // 是否显示优惠券选择器
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
    
    // 加载可用优惠券
    this.loadUsableCoupons();
    
    // 加载可用商品券
    this.loadAvailableProductVouchers();
  },

  // 加载可用商品券
  async loadAvailableProductVouchers() {
    try {
      const vouchers = await apiService.points.getProductVouchers('available');
      const selectedIds = (this.data.selectedProductVouchers || []).map(v => v.id);
      // 为每个商品券添加 isSelected 属性
      const vouchersWithSelected = (vouchers || []).map(voucher => ({
        ...voucher,
        isSelected: selectedIds.includes(voucher.id)
      }));
      this.setData({ availableProductVouchers: vouchersWithSelected });
    } catch (err) {
      console.error('加载商品券失败:', err);
      this.setData({ availableProductVouchers: [] });
    }
  },

  // 选择商品券
  selectProductVoucher(e) {
    const voucher = e.currentTarget.dataset.voucher;
    if (voucher) {
      const selected = this.data.selectedProductVouchers || [];
      const index = selected.findIndex(v => v.id === voucher.id);
      
      if (index >= 0) {
        // 取消选择
        selected.splice(index, 1);
      } else {
        // 选择
        selected.push(voucher);
      }
      
      // 更新商品券列表的 isSelected 状态
      const availableVouchers = this.data.availableProductVouchers.map(v => ({
        ...v,
        isSelected: selected.some(s => s.id === v.id)
      }));
      
      this.setData({ 
        selectedProductVouchers: selected,
        availableProductVouchers: availableVouchers,
        showProductVoucherPicker: false
      });
    }
  },

  // 移除商品券
  removeProductVoucher(e) {
    const voucherId = e.currentTarget.dataset.voucherId;
    const selected = this.data.selectedProductVouchers.filter(v => v.id !== voucherId);
    this.setData({ selectedProductVouchers: selected });
  },

  // 切换商品券选择器
  toggleProductVoucherPicker() {
    this.setData({ showProductVoucherPicker: !this.data.showProductVoucherPicker });
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

  // 更新最终总价（商品总价 - 优惠券折扣 + 配送费）
  updateFinalPrice() {
    const productTotal = parseFloat(this.data.totalPrice) || 0;
    const deliveryFee = parseFloat(this.data.deliveryFee) || 0;
    const couponDiscount = parseFloat(this.data.couponDiscount) || 0;
    const finalProductTotal = Math.max(0, productTotal - couponDiscount);
    const finalTotal = finalProductTotal + deliveryFee;
    
    this.setData({
      finalTotalPrice: finalTotal.toFixed(2),
      deliveryFeeText: deliveryFee.toFixed(2),
      couponDiscount: couponDiscount, // 确保是数字类型
      couponDiscountText: couponDiscount.toFixed(2) // 格式化文本
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

  // 加载可用优惠券
  async loadUsableCoupons() {
    try {
      const productTotal = parseFloat(this.data.totalPrice) || 0;
      if (productTotal <= 0) {
        this.setData({ 
          usableCoupons: [], 
          selectedCoupon: null, 
          couponDiscount: 0,
          couponDiscountText: '0.00'
        });
        this.updateFinalPrice();
        return;
      }
      
      // 传递购物车商品列表，用于计算特定商品免单券的优惠金额
      const cartItems = this.data.cartList || [];
      const coupons = await apiService.coupon.getUsable(productTotal, cartItems);
      
      // 为每个优惠券添加格式化后的折扣金额文本
      const formattedCoupons = (coupons || []).map(coupon => ({
        ...coupon,
        discountAmountText: (parseFloat(coupon.discountAmount) || 0).toFixed(2)
      }));
      
      // 如果之前选中的优惠券不在可用列表中，清除选择
      if (this.data.selectedCoupon) {
        const updatedSelectedCoupon = formattedCoupons.find(c => c.id === this.data.selectedCoupon.id);
        if (!updatedSelectedCoupon) {
          // 之前选中的优惠券不可用了，清除选择
          this.setData({ 
            usableCoupons: formattedCoupons,
            selectedCoupon: null, 
            couponDiscount: 0,
            couponDiscountText: '0.00'
          });
          this.updateFinalPrice();
        } else {
          // 更新优惠券列表和选中的优惠券（使用最新的 discountAmount）
          this.setData({ 
            usableCoupons: formattedCoupons,
            selectedCoupon: updatedSelectedCoupon
          });
          this.calculateCouponDiscount();
        }
      } else {
        this.setData({ usableCoupons: formattedCoupons });
      }
    } catch (err) {
      console.error('加载优惠券失败:', err);
      this.setData({ usableCoupons: [] });
    }
  },

  // 计算优惠券折扣
  calculateCouponDiscount() {
    const { selectedCoupon, totalPrice } = this.data;
    if (!selectedCoupon) {
      this.setData({ 
        couponDiscount: 0,
        couponDiscountText: '0.00'
      });
      this.updateFinalPrice();
      return;
    }

    const productTotal = parseFloat(totalPrice) || 0;
    let discount = 0;

    if (selectedCoupon.type === 'discount') {
      // 折扣券：计算折扣金额
      discount = Math.round(productTotal * (selectedCoupon.value / 100) * 100) / 100;
    } else if (selectedCoupon.type === 'reduce') {
      // 满减券：直接减金额
      discount = parseFloat(selectedCoupon.value) || 0;
    } else if (selectedCoupon.type === 'freeProduct' && selectedCoupon.productId) {
      // 特定商品免单券：只减免一个商品的价格（一张券只能免一次）
      const { cartList } = this.data;
      for (const item of cartList) {
        if (item.checked && item.productId) {
          // 比较商品ID（可能是字符串或对象）
          const itemProductId = typeof item.productId === 'object' ? item.productId.toString() : String(item.productId);
          const couponProductId = String(selectedCoupon.productId);
          
          if (itemProductId === couponProductId) {
            // 只减免一个商品的价格，不是所有数量
            const itemPrice = parseFloat(item.price) || 0;
            discount = itemPrice; // 只减免一个商品的价格
            break; // 找到第一个匹配的商品后立即退出
          }
        }
      }
    }

    // 确保折扣不超过商品总价
    discount = Math.min(discount, productTotal);
    // 确保是数字类型
    discount = parseFloat(discount) || 0;
    
    this.setData({ couponDiscount: discount });
    this.updateFinalPrice();
  },

  // 选择优惠券
  selectCoupon(e) {
    const coupon = e.currentTarget.dataset.coupon;
    if (coupon) {
      this.setData({ 
        selectedCoupon: coupon,
        showCouponPicker: false
      });
      this.calculateCouponDiscount();
    }
  },

  // 取消选择优惠券
  removeCoupon() {
    this.setData({ 
      selectedCoupon: null, 
      couponDiscount: 0,
      couponDiscountText: '0.00',
      showCouponPicker: false
    });
    this.updateFinalPrice();
  },

  // 显示/隐藏优惠券选择器
  toggleCouponPicker() {
    this.setData({ showCouponPicker: !this.data.showCouponPicker });
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

      wx.showLoading({
        title: '创建订单中...',
        mask: true
      })
      
      const cartItemIds = selectedItems.map(item => item.id)
      const productVoucherIds = this.data.selectedProductVouchers.map(v => v.id)
      
      const orderData = await apiService.order.create({
        cartItemIds,
        deliveryType: this.data.deliveryType,
        deliveryFee: this.data.deliveryFee,
        couponId: this.data.selectedCoupon ? this.data.selectedCoupon.id : null,
        productVoucherIds: productVoucherIds.length > 0 ? productVoucherIds : null
      })

      wx.hideLoading()

      // 如果使用了优惠券但订单中没有应用，尝试更新订单优惠券
      if (this.data.selectedCoupon && !orderData.couponId) {
        try {
          await apiService.order.updateCoupon(orderData.orderId, this.data.selectedCoupon.id)
          // 重新获取订单信息
          const updatedOrder = await apiService.order.getDetail(orderData.orderId)
          orderData.totalPrice = updatedOrder.totalPrice
        } catch (err) {
          console.error('更新订单优惠券失败:', err)
        }
      }

      // 直接调用支付接口
      await this.createPayment(orderData.orderId)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '结算失败',
        icon: 'none'
      })
    }
  },

  // 创建支付订单并调用微信支付
  async createPayment(orderId) {
    try {
      wx.showLoading({
        title: '调起支付...',
        mask: true
      })

      // 调用支付接口获取支付参数
      const paymentData = await apiService.payment.createPayment(orderId)
      
      wx.hideLoading()

      // 调用微信支付
      wx.requestPayment({
        timeStamp: paymentData.timeStamp,
        nonceStr: paymentData.nonceStr,
        package: paymentData.package,
        signType: paymentData.signType,
        paySign: paymentData.paySign,
        success: async (res) => {
          console.log('支付成功:', res)
          
          // 支付成功，查询订单状态确认
          setTimeout(async () => {
            try {
              const orderStatus = await apiService.payment.queryStatus(orderId)
              if (orderStatus.status === 'paid') {
                wx.showToast({
                  title: '支付成功',
                  icon: 'success'
                })
                
                // 跳转到订单详情或订单列表
                setTimeout(() => {
                  wx.redirectTo({
                    url: `/pages/order/order?status=all`
                  })
                }, 1500)
              }
            } catch (err) {
              console.error('查询订单状态失败:', err)
            }
          }, 1000)
        },
        fail: (err) => {
          console.error('支付失败:', err)
          if (err.errMsg !== 'requestPayment:fail cancel') {
            wx.showToast({
              title: err.errMsg || '支付失败',
              icon: 'none'
            })
          }
        }
      })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '支付失败',
        icon: 'none'
      })
    }
  }
})
