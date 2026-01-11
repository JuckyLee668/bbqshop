<template>
  <div class="store-page">
    <h2>门店管理</h2>
    <el-card>
      <el-form :model="storeForm" :rules="rules" ref="storeFormRef" label-width="120px">
        <el-form-item label="门店名称" prop="name">
          <el-input v-model="storeForm.name" placeholder="请输入门店名称" />
        </el-form-item>
        <el-form-item label="门店地址" prop="address">
          <el-input v-model="storeForm.address" placeholder="请输入门店地址" />
        </el-form-item>
        <el-form-item label="营业时间" prop="businessHours">
          <el-input v-model="storeForm.businessHours" placeholder="例如：09:00-23:00" />
        </el-form-item>
        <el-form-item label="配送范围(km)" prop="deliveryRange">
          <el-input-number v-model="storeForm.deliveryRange" :min="0" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="storeForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="营业状态" prop="status">
          <el-radio-group v-model="storeForm.status">
            <el-radio label="open">营业中</el-radio>
            <el-radio label="closed">已打烊</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-divider />
        <el-form-item label="免费配送界限(元)" prop="freeDeliveryThreshold">
          <el-input-number v-model="storeForm.freeDeliveryThreshold" :min="0" :precision="2" />
          <div class="form-tip">订单金额达到此金额时免配送费</div>
        </el-form-item>
        <el-form-item label="配送费用(元)" prop="deliveryFee">
          <el-input-number v-model="storeForm.deliveryFee" :min="0" :precision="2" />
          <div class="form-tip">订单金额未达到免费配送界限时收取的配送费</div>
        </el-form-item>
        <el-form-item label="对外展示配送费">
          <el-switch v-model="storeForm.showDeliveryFee" />
          <div class="form-tip">是否在小程序中显示配送费信息</div>
        </el-form-item>
        <el-divider />
        <h3 style="margin: 20px 0 10px 0; font-size: 16px; font-weight: 600;">新用户专享优惠券</h3>
        <el-form-item label="启用新用户专享">
          <el-switch v-model="storeForm.newUserCoupon.enabled" />
          <div class="form-tip">是否在首页显示新用户专享优惠券</div>
        </el-form-item>
        <el-form-item label="选择优惠券" v-if="storeForm.newUserCoupon.enabled">
          <el-select
            v-model="storeForm.newUserCoupon.couponId"
            placeholder="请选择优惠券"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="coupon in availableCoupons"
              :key="coupon.id"
              :label="`${coupon.name} (${coupon.type === 'discount' ? coupon.value + '折' : '¥' + coupon.value})`"
              :value="coupon.id"
            />
          </el-select>
          <div class="form-tip">选择要在首页展示的新用户专享优惠券</div>
        </el-form-item>
        <el-form-item label="显示标题" v-if="storeForm.newUserCoupon.enabled">
          <el-input v-model="storeForm.newUserCoupon.title" placeholder="例如：新用户专享" />
          <div class="form-tip">在首页显示的标题文字</div>
        </el-form-item>
        <el-form-item label="显示描述" v-if="storeForm.newUserCoupon.enabled">
          <el-input v-model="storeForm.newUserCoupon.desc" type="textarea" :rows="2" placeholder="例如：首单立减5元，满30减10" />
          <div class="form-tip">在首页显示的描述文字</div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getStore, updateStore, getCoupons } from '@/api/merchant'

const storeFormRef = ref()
const loading = ref(false)
const availableCoupons = ref<any[]>([])

const storeForm = reactive({
  name: '',
  address: '',
  businessHours: '',
  deliveryRange: 0,
  phone: '',
  status: 'open',
  latitude: 0,
  longitude: 0,
  freeDeliveryThreshold: 50,
  deliveryFee: 5,
  showDeliveryFee: true,
  newUserCoupon: {
    enabled: false,
    couponId: null as string | null,
    title: '新用户专享',
    desc: '首单立减5元，满30减10'
  }
})

const rules = {
  name: [{ required: true, message: '请输入门店名称', trigger: 'blur' }],
  address: [{ required: true, message: '请输入门店地址', trigger: 'blur' }],
  businessHours: [{ required: true, message: '请输入营业时间', trigger: 'blur' }]
}

const loadStore = async () => {
  try {
    const data = await getStore()
    Object.assign(storeForm, {
      ...data,
      newUserCoupon: data.newUserCoupon || {
        enabled: false,
        couponId: null,
        title: '新用户专享',
        desc: '首单立减5元，满30减10'
      }
    })
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
  }
}

const loadCoupons = async () => {
  try {
    const data = await getCoupons({ page: 1, pageSize: 1000 })
    availableCoupons.value = data.list || []
  } catch (err: any) {
    console.error('加载优惠券失败:', err)
  }
}

const handleSubmit = async () => {
  if (!storeFormRef.value) return
  
  await storeFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      try {
        loading.value = true
        await updateStore(storeForm)
        ElMessage.success('保存成功')
      } catch (err: any) {
        ElMessage.error(err.message || '保存失败')
      } finally {
        loading.value = false
      }
    }
  })
}

onMounted(() => {
  loadStore()
  loadCoupons()
})
</script>

<style scoped>
.store-page {
  /* padding已在layout中统一设置 */
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
