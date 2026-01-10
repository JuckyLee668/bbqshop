const apiService = require('../../utils/api-service.js');

Page({
  data: {
    orderId: '',
    orderNo: '',
    totalPrice: '0.00',
    productTotal: '0.00',
    deliveryFee: '0.00',
    deliveryType: 'pickup',
    payParams: null,
    addressList: [],
    selectedAddress: null
  },

  onLoad(options) {
    if (options.orderId) {
      this.setData({
        orderId: options.orderId,
        orderNo: options.orderNo || '',
        totalPrice: options.totalPrice || '0.00'
      });
    }

    // 通过事件通道获取完整的支付参数
    const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel();
    if (eventChannel) {
      eventChannel.on('payData', (data) => {
        this.setData({
          orderId: data.orderId || '',
          orderNo: data.orderNo || '',
          payParams: data.payParams || null,
          totalPrice: (data.totalPrice || 0).toFixed
            ? data.totalPrice.toFixed(2)
            : String(data.totalPrice || '0.00'),
          productTotal: (data.productTotal || 0).toFixed
            ? data.productTotal.toFixed(2)
            : String(data.productTotal || '0.00'),
          deliveryFee: (data.deliveryFee || 0).toFixed
            ? data.deliveryFee.toFixed(2)
            : String(data.deliveryFee || '0.00'),
          deliveryType: data.deliveryType || 'pickup'
        }, () => {
          // 如果选择的是外卖配送，加载地址列表
          if (this.data.deliveryType === 'delivery') {
            this.loadAddresses();
          }
        });
      });
    }
  },

  onShow() {
    // 如果选择的是外卖配送，重新加载地址列表（可能从地址页面返回）
    if (this.data.deliveryType === 'delivery') {
      this.loadAddresses();
    }
  },

  // 加载地址列表
  async loadAddresses() {
    try {
      const list = await apiService.address.getList();
      // 自动选择默认地址，如果没有默认地址则选择第一个
      const defaultAddress = list.find(addr => addr.isDefault) || list[0] || null;
      this.setData({
        addressList: list || [],
        selectedAddress: defaultAddress
      });
    } catch (err) {
      console.error('加载地址失败:', err);
      this.setData({
        addressList: [],
        selectedAddress: null
      });
    }
  },

  // 选择地址
  selectAddress() {
    wx.navigateTo({
      url: '/pages/address/address'
    });
  },

  // 从地址页面返回时调用
  async onAddressSelected(address) {
    this.setData({
      selectedAddress: address
    });
    
    // 如果订单已创建，更新订单地址
    if (this.data.orderId && address && address.id) {
      try {
        await apiService.order.updateAddress(this.data.orderId, address.id);
      } catch (err) {
        console.error('更新订单地址失败:', err);
        // 不阻止用户继续操作
      }
    }
  },

  // 模拟支付
  async onMockPay() {
    try {
      // 如果选择的是外卖配送，验证是否已选择地址
      if (this.data.deliveryType === 'delivery') {
        if (!this.data.selectedAddress) {
          wx.showModal({
            title: '提示',
            content: '请选择配送地址',
            showCancel: false,
            success: (res) => {
              if (res.confirm) {
                this.selectAddress();
              }
            }
          });
          return;
        }
        
        // 确保订单地址已更新
        if (this.data.orderId && this.data.selectedAddress && this.data.selectedAddress.id) {
          try {
            await apiService.order.updateAddress(this.data.orderId, this.data.selectedAddress.id);
          } catch (err) {
            console.error('更新订单地址失败:', err);
            // 如果更新失败，仍然允许支付（地址可能已在创建订单时设置）
          }
        }
      }

      wx.showLoading({ title: '支付中...' });
      
      // 这里预留微信支付接口
      // wx.requestPayment({
      //   ...this.data.payParams,
      //   success: () => {},
      //   fail: () => {}
      // })

      // 模拟支付成功，调用支付完成接口
      if (this.data.orderId) {
        try {
          await apiService.order.pay(this.data.orderId);
        } catch (payErr) {
          console.error('支付完成接口调用失败:', payErr);
          // 即使接口调用失败，也继续流程（因为可能是模拟支付）
        }
      }

      wx.hideLoading();
      wx.showToast({
        title: '支付成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/order/order'
        });
      }, 1200);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({
        title: err.message || '支付失败',
        icon: 'none'
      });
    }
  }
});

