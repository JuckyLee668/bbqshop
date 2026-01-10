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
import { getStore, updateStore } from '@/api/merchant'

const storeFormRef = ref()
const loading = ref(false)

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
  showDeliveryFee: true
})

const rules = {
  name: [{ required: true, message: '请输入门店名称', trigger: 'blur' }],
  address: [{ required: true, message: '请输入门店地址', trigger: 'blur' }],
  businessHours: [{ required: true, message: '请输入营业时间', trigger: 'blur' }]
}

const loadStore = async () => {
  try {
    const data = await getStore()
    Object.assign(storeForm, data)
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
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
