<template>
  <div class="points-mall-page">
    <div class="page-header">
      <h2>积分商城</h2>
      <el-button type="primary" @click="showPointsDialog = true">
        <el-icon><Plus /></el-icon>
        新增积分商品
      </el-button>
    </div>

    <el-card>
      <el-table :data="pointsList" v-loading="pointsLoading" border>
        <el-table-column label="图片" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.image"
              style="width: 60px; height: 60px"
              fit="cover"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名称" width="200" />
        <el-table-column prop="desc" label="描述" />
        <el-table-column prop="points" label="所需积分" width="120">
          <template #default="{ row }">
            <span style="color: #FF6B35; font-weight: bold;">{{ row.points }}积分</span>
          </template>
        </el-table-column>
        <el-table-column label="总兑换次数" width="150">
          <template #default="{ row }">
            <span v-if="row.stock === -1">已兑换{{ row.usedCount }}次（无限制）</span>
            <span v-else>已兑换{{ row.usedCount }} / {{ row.stock }}次</span>
          </template>
        </el-table-column>
        <el-table-column label="每人限兑" width="120">
          <template #default="{ row }">
            <span v-if="row.maxExchangePerUser === -1">无限制</span>
            <span v-else>{{ row.maxExchangePerUser }}次</span>
          </template>
        </el-table-column>
        <el-table-column label="库存" width="120">
          <template #default="{ row }">
            <span v-if="row.stock === -1">无限制</span>
            <span v-else>{{ row.stock - row.usedCount }} / {{ row.stock }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEditPoints(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDeletePoints(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pointsPagination.page"
        v-model:page-size="pointsPagination.pageSize"
        :total="pointsPagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadPointsProducts"
        @current-change="loadPointsProducts"
        style="margin-top: 20px"
      />
    </el-card>

    <!-- 积分商品对话框 -->
    <el-dialog
      v-model="showPointsDialog"
      :title="editingPoints ? '编辑积分商品' : '新增积分商品'"
      width="600px"
    >
      <el-form :model="pointsForm" :rules="pointsRules" ref="pointsFormRef" label-width="120px">
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="pointsForm.name" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="pointsForm.desc" type="textarea" :rows="3" placeholder="请输入商品描述" />
        </el-form-item>
        <el-form-item label="商品图片">
          <el-upload
            :action="uploadUrl"
            :headers="uploadHeaders"
            :on-success="handlePointsImageSuccess"
            :before-upload="beforeUpload"
            :show-file-list="false"
          >
            <el-button type="primary">上传图片</el-button>
            <div v-if="pointsForm.image" style="margin-top: 10px;">
              <el-image
                :src="pointsForm.image"
                style="width: 200px; height: 200px"
                fit="cover"
              />
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="所需积分" prop="points">
          <el-input-number
            v-model="pointsForm.points"
            :min="0"
            :precision="0"
            placeholder="请输入所需积分"
          />
        </el-form-item>
        <el-form-item label="总库存">
          <el-input-number
            v-model="pointsForm.stock"
            :min="-1"
            :precision="0"
            placeholder="-1表示无限制"
          />
          <span style="margin-left: 10px; color: #999">件（-1表示无限制{{ editingPoints ? '，当前已兑换：' + pointsUsedCount : '' }}）</span>
        </el-form-item>
        <el-form-item label="每人兑换次数">
          <el-input-number
            v-model="pointsForm.maxExchangePerUser"
            :min="-1"
            :precision="0"
            placeholder="-1表示无限制"
          />
          <span style="margin-left: 10px; color: #999">次（-1表示无限制，限制每个用户最多可兑换的次数）</span>
        </el-form-item>
        <el-form-item label="优惠券类型">
          <el-select v-model="pointsForm.couponType" placeholder="请选择优惠券类型">
            <el-option label="满减券" value="reduce" />
            <el-option label="折扣券" value="discount" />
            <el-option label="特定商品免单券" value="freeProduct" />
          </el-select>
        </el-form-item>
        <el-form-item label="优惠券值" v-if="pointsForm.couponType !== 'freeProduct'">
          <el-input-number
            v-model="pointsForm.couponValue"
            :min="0"
            :precision="2"
            placeholder="满减券填金额，折扣券填百分比（如90表示9折）"
          />
          <span style="margin-left: 10px; color: #999">
            {{ pointsForm.couponType === 'discount' ? '（如90表示9折）' : '（满减金额）' }}
          </span>
        </el-form-item>
        <el-form-item label="最低消费" v-if="pointsForm.couponType !== 'freeProduct'">
          <el-input-number
            v-model="pointsForm.couponMinAmount"
            :min="0"
            :precision="2"
            placeholder="使用该优惠券的最低消费金额"
          />
        </el-form-item>
        <el-form-item label="关联商品" v-if="pointsForm.couponType === 'freeProduct'">
          <el-select
            v-model="pointsForm.productId"
            placeholder="请选择商品"
            filterable
            clearable
          >
            <el-option
              v-for="product in productList"
              :key="product.id"
              :label="product.name"
              :value="product.id"
            />
          </el-select>
          <span style="margin-left: 10px; color: #999">（选择后，购物车中有该商品时将减免该商品的价格）</span>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="pointsForm.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="pointsForm.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPointsDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitPoints">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import request from '@/api/index'
import type { FormInstance, FormRules } from 'element-plus'

const pointsLoading = ref(false)
const pointsList = ref([])
const showPointsDialog = ref(false)
const editingPoints = ref<any>(null)
const pointsFormRef = ref<FormInstance>()
const pointsUsedCount = ref(0)
const pointsPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const pointsForm = reactive({
  name: '',
  desc: '',
  image: '',
  points: 0,
  stock: -1,
  maxExchangePerUser: -1,
  couponType: 'reduce',
  couponValue: 5,
  couponMinAmount: 0,
  productId: null,
  status: 'active',
  sort: 0
})

const productList = ref([])

const pointsRules: FormRules = {
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' }
  ],
  points: [
    { required: true, message: '请输入所需积分', trigger: 'blur' },
    { type: 'number', min: 0, message: '积分值必须大于等于0', trigger: 'blur' }
  ]
}

const uploadUrl = `${import.meta.env.VITE_API_BASE_URL}/v1/upload/image`
const uploadHeaders = {
  Authorization: `Bearer ${localStorage.getItem('merchant_token')}`
}

const loadPointsProducts = async () => {
  try {
    pointsLoading.value = true
    const params: any = {
      page: pointsPagination.page,
      pageSize: pointsPagination.pageSize
    }
    
    const data = await request({
      url: '/merchant/points-products',
      method: 'get',
      params
    })
    
    pointsList.value = data.list || []
    pointsPagination.total = data.total || 0
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    pointsLoading.value = false
  }
}

const loadProducts = async () => {
  try {
    const data = await request({
      url: '/merchant/products',
      method: 'get',
      params: { page: 1, pageSize: 1000, status: 'on_sale' }
    })
    productList.value = data.list || []
  } catch (err: any) {
    console.error('加载商品列表失败:', err)
    ElMessage.error('加载商品列表失败: ' + (err.message || '未知错误'))
  }
}

const handleEditPoints = async (row: any) => {
  try {
    editingPoints.value = row
    const data = await request({
      url: `/merchant/points-products/${row.id}`,
      method: 'get'
    })
    
    pointsForm.name = data.name || ''
    pointsForm.desc = data.desc || ''
    pointsForm.image = data.image || ''
    pointsForm.points = data.points || 0
    pointsForm.stock = data.stock !== undefined ? data.stock : -1
    pointsForm.maxExchangePerUser = data.maxExchangePerUser !== undefined ? data.maxExchangePerUser : -1
    pointsForm.couponType = data.couponType || 'reduce'
    pointsForm.couponValue = data.couponValue !== undefined ? data.couponValue : 5
    pointsForm.couponMinAmount = data.couponMinAmount !== undefined ? data.couponMinAmount : 0
    pointsForm.productId = data.productId || null
    pointsForm.status = data.status || 'active'
    pointsForm.sort = data.sort || 0
    pointsUsedCount.value = data.usedCount || 0
    
    showPointsDialog.value = true
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
  }
}

const handleDeletePoints = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除积分商品"${row.name}"吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await request({
      url: `/merchant/points-products/${row.id}`,
      method: 'delete'
    })
    
    ElMessage.success('删除成功')
    loadPointsProducts()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '删除失败')
    }
  }
}

const handleSubmitPoints = async () => {
  if (!pointsFormRef.value) return

  await pointsFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const data: any = {
          name: pointsForm.name,
          desc: pointsForm.desc,
          image: pointsForm.image,
          points: pointsForm.points,
          stock: pointsForm.stock !== undefined ? pointsForm.stock : -1,
          maxExchangePerUser: pointsForm.maxExchangePerUser !== undefined ? pointsForm.maxExchangePerUser : -1,
          couponType: pointsForm.couponType || 'reduce',
          couponValue: pointsForm.couponValue !== undefined ? pointsForm.couponValue : (pointsForm.couponType === 'freeProduct' ? 0 : 5),
          couponMinAmount: pointsForm.couponMinAmount !== undefined ? pointsForm.couponMinAmount : 0,
          productId: pointsForm.productId || null,
          status: pointsForm.status,
          sort: pointsForm.sort || 0
        }
        
        // 确保所有字段都发送，即使是null
        if (data.productId === null && pointsForm.couponType === 'freeProduct') {
          // 如果是特定商品免单券但没有选择商品，保持null
        } else if (data.productId === null) {
          // 如果不是特定商品免单券，不发送productId
          delete data.productId
        }

        if (editingPoints.value) {
          await request({
            url: `/merchant/points-products/${editingPoints.value.id}`,
            method: 'put',
            data
          })
          ElMessage.success('更新成功')
        } else {
          await request({
            url: '/merchant/points-products',
            method: 'post',
            data
          })
          ElMessage.success('创建成功')
        }
        
        showPointsDialog.value = false
        resetPointsForm()
        loadPointsProducts()
      } catch (err: any) {
        ElMessage.error(err.message || '操作失败')
      }
    }
  })
}

const resetPointsForm = () => {
  editingPoints.value = null
  pointsForm.name = ''
  pointsForm.desc = ''
  pointsForm.image = ''
  pointsForm.points = 0
  pointsForm.stock = -1
  pointsForm.maxExchangePerUser = -1
  pointsForm.couponType = 'reduce'
  pointsForm.couponValue = 5
  pointsForm.couponMinAmount = 0
  pointsForm.productId = null
  pointsForm.status = 'active'
  pointsForm.sort = 0
  pointsUsedCount.value = 0
}

const handlePointsImageSuccess = (response: any) => {
  if (response.code === 200) {
    pointsForm.image = response.data.url
    ElMessage.success('上传成功')
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

onMounted(() => {
  loadPointsProducts()
  loadProducts()
})
</script>

<style scoped>
.points-mall-page {
  /* padding已在layout中统一设置 */
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
</style>
