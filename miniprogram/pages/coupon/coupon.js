const apiService = require('../../utils/api-service.js');
const { ensureLogin } = require('../../utils/auth.js');

Page({
  data: {
    activeTab: 0, // 0: 可用, 1: 已使用, 2: 已过期
    availableCoupons: [],
    usedCoupons: [],
    expiredCoupons: [],
    receiveCoupons: [], // 可领取的优惠券
    loading: false
  },

  async onLoad() {
    await ensureLogin();
    this.loadCoupons();
    this.loadReceiveCoupons();
  },

  async onShow() {
    // 每次显示时重新加载，确保数据最新
    this.loadCoupons();
  },

  // 切换标签页
  onTabChange(e) {
    this.setData({
      activeTab: e.detail.value
    });
  },

  // 加载优惠券列表
  async loadCoupons() {
    try {
      this.setData({ loading: true });

      // 获取所有状态的优惠券
      const [available, used, expired] = await Promise.all([
        apiService.coupon.getList('available').catch(() => []),
        apiService.coupon.getList('used').catch(() => []),
        apiService.coupon.getList('expired').catch(() => [])
      ]);

      // 过滤过期优惠券（双重检查）
      const now = new Date();
      const filteredAvailable = available.filter(coupon => {
        if (!coupon.expireTime) return true;
        return new Date(coupon.expireTime) >= now;
      });

      const filteredExpired = [
        ...expired,
        ...available.filter(coupon => {
          if (!coupon.expireTime) return false;
          return new Date(coupon.expireTime) < now;
        })
      ];

      this.setData({
        availableCoupons: filteredAvailable,
        usedCoupons: used || [],
        expiredCoupons: filteredExpired,
        loading: false
      });
    } catch (err) {
      console.error('加载优惠券失败:', err);
      this.setData({ loading: false });
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      });
    }
  },

  // 格式化优惠券类型
  getCouponTypeText(type) {
    return type === 'discount' ? '折扣' : '满减';
  },

  // 格式化优惠券值
  getCouponValueText(coupon) {
    if (coupon.type === 'discount') {
      return `${coupon.value}折`;
    } else {
      return `¥${coupon.value}`;
    }
  },

  // 格式化过期时间
  formatExpireTime(time) {
    if (!time) return '永久有效';
    const date = new Date(time);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 检查是否可用
  isCouponUsable(coupon) {
    if (coupon.status !== 'available') return false;
    if (!coupon.expireTime) return true;
    return new Date(coupon.expireTime) >= new Date();
  }
});
