const apiService = require('../../utils/api-service.js');

Page({
  data: {
    list: [],
    loading: false,
    editing: false,
    form: {
      id: '',
      name: '',
      phone: '',
      address: '',
      detail: '',
      isDefault: false
    }
  },

  onShow() {
    this.loadAddresses();
  },

  async loadAddresses() {
    try {
      this.setData({ loading: true });
      const list = await apiService.address.getList();
      // 保持原有顺序，不按默认地址排序
      this.setData({ list: list || [] });
    } catch (err) {
      wx.showToast({
        title: err.message || '加载地址失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 打开新增地址表单
  onAdd() {
    this.setData({
      editing: true,
      form: {
        id: '',
        name: '',
        phone: '',
        address: '',
        detail: '',
        isDefault: this.data.list.length === 0 // 第一个地址默认设为默认
      }
    });
  },

  // 编辑现有地址
  onEdit(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      editing: true,
      form: {
        id: item.id,
        name: item.name,
        phone: item.phone,
        address: item.address,
        detail: item.detail,
        isDefault: !!item.isDefault
      }
    });
  },

  // 删除地址（在编辑模式下）
  async onDeleteInEdit() {
    const id = this.data.form.id;
    if (!id) return;

    const res = await new Promise(resolve => {
      wx.showModal({
        title: '提示',
        content: '确定要删除这个地址吗？',
        success: resolve
      });
    });
    if (!res.confirm) return;

    try {
      await apiService.address.delete(id);
      wx.showToast({ title: '已删除', icon: 'success' });
      this.setData({ editing: false });
      this.loadAddresses();
    } catch (err) {
      wx.showToast({
        title: err.message || '删除失败',
        icon: 'none'
      });
    }
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      form: {
        ...this.data.form,
        [field]: e.detail.value
      }
    });
  },

  onDefaultChange(e) {
    this.setData({
      form: {
        ...this.data.form,
        isDefault: e.detail.value
      }
    });
  },

  // 保存地址（新增或编辑）
  async onSave() {
    const { id, name, phone, address, detail, isDefault } = this.data.form;
    if (!name || !phone || !address) {
      wx.showToast({
        title: '请填写姓名、电话和地址',
        icon: 'none'
      });
      return;
    }

    try {
      if (id) {
        await apiService.address.update(id, {
          name,
          phone,
          address,
          detail,
          isDefault: isDefault || false // 确保传递布尔值
        });
      } else {
        await apiService.address.add({
          name,
          phone,
          address,
          detail,
          isDefault: isDefault || false
        });
      }

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

      this.setData({ editing: false });
      // 延迟一下再加载，确保后端数据已更新
      setTimeout(() => {
        this.loadAddresses();
      }, 300);
    } catch (err) {
      wx.showToast({
        title: err.message || '保存失败',
        icon: 'none'
      });
    }
  },

  onCancelEdit() {
    this.setData({ editing: false });
  },

  // 从地址列表中选择一个作为当前下单地址
  onSelect(e) {
    const item = e.currentTarget.dataset.item;
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2]; // 获取上一个页面
    
    // 如果是从其他页面跳转过来的（比如支付页面），则选择地址并返回
    if (prevPage && typeof prevPage.onAddressSelected === 'function') {
      prevPage.onAddressSelected(item);
      wx.navigateBack();
    }
    // 否则不做任何操作（在地址管理页面，点击地址不执行选择操作）
  }
});

