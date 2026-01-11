<template>
  <div class="coupons-page">
    <div class="page-header">
      <h2>优惠券管理</h2>
      <el-button type="primary" @click="showCouponDialog = true">
        <el-icon><Plus /></el-icon>
        新增优惠券
      </el-button>
    </div>

    <!-- 筛选栏 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="couponFilterForm">
        <el-form-item label="类型">
          <el-select v-model="couponFilterForm.type" placeholder="全部" clearable>
            <el-option label="折扣券" value="discount" />
            <el-option label="满减券" value="reduce" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadCoupons">查询</el-button>
          <el-button @click="resetCouponFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <el-table :data="couponList" v-loading="couponLoading" border>
        <el-table-column prop="name" label="优惠券名称" width="200" />
        <el-table-column prop="desc" label="描述" width="200" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'discount' ? 'success' : 'warning'">
              {{ row.type === 'discount' ? '折扣券' : '满减券' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优惠值" width="120">
          <template #default="{ row }">
            <span v-if="row.type === 'discount'">{{ row.value }}折</span>
            <span v-else>¥{{ row.value }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="minAmount" label="最低消费" width="120">
          <template #default="{ row }">
            <span v-if="row.minAmount > 0">¥{{ row.minAmount }}</span>
            <span v-else style="color: #999">无门槛</span>
          </template>
        </el-table-column>
        <el-table-column label="库存" width="120">
          <template #default="{ row }">
            <span v-if="row.totalCount === -1">无限制</span>
            <span v-else>{{ row.totalCount - row.usedCount }} / {{ row.totalCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="expireTime" label="过期时间" width="180">
          <template #default="{ row }">
            <span v-if="row.expireTime">{{ formatDate(row.expireTime) }}</span>
            <span v-else style="color: #999">永久有效</span>
          </template>
        </el-table-column>
        <el-table-column label="是否发放" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isDistributed ? 'success' : 'info'">
              {{ row.isDistributed ? '已发放' : '未发放' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEditCoupon(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDeleteCoupon(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="couponPagination.page"
        v-model:page-size="couponPagination.pageSize"
        :total="couponPagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadCoupons"
        @current-change="loadCoupons"
        style="margin-top: 20px"
      />
    </el-card>

    <!-- 优惠券对话框 -->
    <el-dialog
      v-model="showCouponDialog"
      :title="editingCoupon ? '编辑优惠券' : '新增优惠券'"
      width="600px"
    >
      <el-form :model="couponForm" :rules="couponRules" ref="couponFormRef" label-width="120px">
        <el-form-item label="优惠券名称" prop="name">
          <el-input v-model="couponForm.name" placeholder="请输入优惠券名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="couponForm.desc" type="textarea" :rows="3" placeholder="请输入优惠券描述" />
        </el-form-item>
        <el-form-item label="优惠类型" prop="type">
          <el-radio-group v-model="couponForm.type">
            <el-radio value="discount">折扣券</el-radio>
            <el-radio value="reduce">满减券</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="优惠值" prop="value">
          <el-input-number
            v-if="couponForm.type === 'discount'"
            v-model="couponForm.value"
            :min="1"
            :max="100"
            :precision="0"
            placeholder="请输入折扣值(1-100)"
          />
          <el-input-number
            v-else
            v-model="couponForm.value"
            :min="0.01"
            :precision="2"
            placeholder="请输入满减金额"
          />
          <span style="margin-left: 10px; color: #999">
            {{ couponForm.type === 'discount' ? '折' : '元' }}
          </span>
        </el-form-item>
        <el-form-item label="最低消费">
          <el-input-number
            v-model="couponForm.minAmount"
            :min="0"
            :precision="2"
            placeholder="0表示无门槛"
          />
          <span style="margin-left: 10px; color: #999">元（0表示无门槛）</span>
        </el-form-item>
        <el-form-item label="过期时间">
          <el-date-picker
            v-model="couponForm.expireTime"
            type="datetime"
            placeholder="选择过期时间（留空表示永久有效）"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="发放数量">
          <el-input-number
            v-model="couponForm.totalCount"
            :min="-1"
            :precision="0"
            placeholder="-1表示无限制"
          />
          <span style="margin-left: 10px; color: #999">张（-1表示无限制{{ editingCoupon ? '，当前已使用：' + couponUsedCount : '' }}）</span>
        </el-form-item>
        <el-form-item label="是否发放">
          <el-switch
            v-model="couponForm.isDistributed"
            active-text="已发放"
            inactive-text="未发放"
          />
          <span style="margin-left: 10px; color: #999">开启后，用户可在通知中心领取此优惠券</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCouponDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitCoupon">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { 
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon
} from '@/api/merchant'
import type { FormInstance, FormRules } from 'element-plus'

const couponLoading = ref(false)
const couponList = ref([])
const showCouponDialog = ref(false)
const editingCoupon = ref<any>(null)
const couponFormRef = ref<FormInstance>()
const couponUsedCount = ref(0)
const couponFilterForm = reactive({
  type: ''
})
const couponPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const couponForm = reactive({
  name: '',
  desc: '',
  type: 'discount',
  value: undefined as number | undefined,
  minAmount: 0,
  expireTime: '',
  totalCount: -1,
  isDistributed: false
})

const couponRules: FormRules = {
  name: [
    { required: true, message: '请输入优惠券名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择优惠类型', trigger: 'change' }
  ],
  value: [
    { required: true, message: '请输入优惠值', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (couponForm.type === 'discount') {
          if (value < 1 || value > 100) {
            callback(new Error('折扣值必须在1-100之间'))
          } else {
            callback()
          }
        } else {
          if (value <= 0) {
            callback(new Error('满减金额必须大于0'))
          } else {
            callback()
          }
        }
      },
      trigger: 'blur'
    }
  ]
}

const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadCoupons = async () => {
  try {
    couponLoading.value = true
    const params: any = {
      page: couponPagination.page,
      pageSize: couponPagination.pageSize
    }
    if (couponFilterForm.type) {
      params.type = couponFilterForm.type
    }
    
    const data = await getCoupons(params)
    couponList.value = data.list || []
    couponPagination.total = data.total || 0
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    couponLoading.value = false
  }
}

const resetCouponFilter = () => {
  couponFilterForm.type = ''
  couponPagination.page = 1
  loadCoupons()
}

const handleEditCoupon = async (row: any) => {
  try {
    editingCoupon.value = row
    const data = await getCoupon(row.id)
    
    couponForm.name = data.name || ''
    couponForm.desc = data.desc || ''
    couponForm.type = data.type || 'discount'
    couponForm.value = data.value
    couponForm.minAmount = data.minAmount || 0
    couponForm.totalCount = data.totalCount || -1
    couponForm.isDistributed = data.isDistributed !== undefined ? data.isDistributed : false
    couponUsedCount.value = data.usedCount || 0
    
    if (data.expireTime) {
      const date = new Date(data.expireTime)
      couponForm.expireTime = date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/\//g, '-').replace(/, /g, ' ')
    } else {
      couponForm.expireTime = ''
    }
    
    showCouponDialog.value = true
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
  }
}

const handleDeleteCoupon = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除优惠券"${row.name}"吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteCoupon(row.id)
    ElMessage.success('删除成功')
    loadCoupons()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '删除失败')
    }
  }
}

const handleSubmitCoupon = async () => {
  if (!couponFormRef.value) return

  await couponFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const data: any = {
          name: couponForm.name,
          desc: couponForm.desc,
          type: couponForm.type,
          value: couponForm.value,
          minAmount: couponForm.minAmount || 0,
          totalCount: couponForm.totalCount || -1,
          isDistributed: couponForm.isDistributed !== undefined ? couponForm.isDistributed : false
        }

        if (couponForm.expireTime) {
          data.expireTime = couponForm.expireTime
        } else {
          data.expireTime = null
        }

        if (editingCoupon.value) {
          await updateCoupon(editingCoupon.value.id, data)
          ElMessage.success('更新成功')
        } else {
          await createCoupon(data)
          ElMessage.success('创建成功')
        }
        
        showCouponDialog.value = false
        resetCouponForm()
        loadCoupons()
      } catch (err: any) {
        ElMessage.error(err.message || '操作失败')
      }
    }
  })
}

const resetCouponForm = () => {
  editingCoupon.value = null
  couponForm.name = ''
  couponForm.desc = ''
  couponForm.type = 'discount'
  couponForm.value = undefined
  couponForm.minAmount = 0
  couponForm.expireTime = ''
  couponForm.totalCount = -1
  couponForm.isDistributed = false
  couponUsedCount.value = 0
}

onMounted(() => {
  loadCoupons()
})
</script>

<style scoped>
.coupons-page {
  /* padding已在layout中统一设置 */
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filter-card {
  margin-bottom: 20px;
}
</style>
