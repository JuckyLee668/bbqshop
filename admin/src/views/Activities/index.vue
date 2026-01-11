<template>
  <div class="activities-page">
    <div class="page-header">
      <h2>活动管理</h2>
    </div>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- 特价套餐 -->
      <el-tab-pane label="特价套餐" name="packages">
        <div class="tab-header">
          <el-button type="primary" @click="showPackageDialog = true">
            <el-icon><Plus /></el-icon>
            新增特价套餐
          </el-button>
        </div>

        <el-card>
          <el-table :data="packageList" v-loading="loading" border>
            <el-table-column label="封面" width="100">
              <template #default="{ row }">
                <el-image
                  :src="row.coverImage"
                  style="width: 60px; height: 60px"
                  fit="cover"
                />
              </template>
            </el-table-column>
            <el-table-column prop="name" label="套餐名称" width="200" />
            <el-table-column prop="desc" label="描述" />
            <el-table-column label="价格" width="150">
              <template #default="{ row }">
                <span style="color: #FF6B35; font-weight: bold;">¥{{ row.price }}</span>
                <span v-if="row.oldPrice" style="color: #999; text-decoration: line-through; margin-left: 8px;">
                  ¥{{ row.oldPrice }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="包含商品" width="200">
              <template #default="{ row }">
                <div v-for="(p, index) in row.products" :key="index" style="font-size: 12px; margin-bottom: 4px;">
                  {{ p.productName }} × {{ p.quantity }}
                </div>
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
                <el-button type="primary" size="small" @click="handleEditPackage(row)">编辑</el-button>
                <el-button type="danger" size="small" @click="handleDeletePackage(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 优惠券管理 -->
      <el-tab-pane label="优惠券管理" name="coupons">
        <div class="tab-header">
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
      </el-tab-pane>

      <!-- 积分商城 -->
      <el-tab-pane label="积分商城" name="points">
        <div class="tab-header">
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
      </el-tab-pane>
    </el-tabs>

    <!-- 特价套餐对话框 -->
    <el-dialog
      v-model="showPackageDialog"
      :title="editingPackage ? '编辑特价套餐' : '新增特价套餐'"
      width="800px"
    >
      <el-form :model="packageForm" :rules="packageRules" ref="packageFormRef" label-width="120px">
        <el-form-item label="套餐名称" prop="name">
          <el-input v-model="packageForm.name" placeholder="请输入套餐名称" />
        </el-form-item>
        <el-form-item label="套餐描述" prop="desc">
          <el-input v-model="packageForm.desc" type="textarea" :rows="3" placeholder="请输入套餐描述" />
        </el-form-item>
        <el-form-item label="套餐价格" prop="price">
          <el-input-number v-model="packageForm.price" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="原价">
          <el-input-number v-model="packageForm.oldPrice" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="封面图片">
          <el-upload
            :action="uploadUrl"
            :headers="uploadHeaders"
            :on-success="handleCoverUploadSuccess"
            :before-upload="beforeUpload"
            :show-file-list="false"
          >
            <el-button type="primary">上传封面</el-button>
            <div v-if="packageForm.coverImage" style="margin-top: 10px;">
              <el-image
                :src="packageForm.coverImage"
                style="width: 200px; height: 200px"
                fit="cover"
              />
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="批量选择商品">
          <div style="width: 100%;">
            <el-select
              v-model="selectedProducts"
              multiple
              filterable
              placeholder="可一次选择多个商品"
              style="width: 100%;"
            >
              <el-option
                v-for="p in availableProducts"
                :key="p.id"
                :label="p.name"
                :value="p.id"
              />
            </el-select>
            <div style="margin-top: 10px;">
              <el-button type="primary" size="small" @click="addSelectedProducts">添加到列表</el-button>
              <span style="margin-left: 12px; color: #909399;">可一次性选多件商品并默认数量 1</span>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="包含商品" prop="products">
          <div style="width: 100%;">
            <div v-for="(product, index) in packageForm.products" :key="index" style="display: flex; align-items: center; margin-bottom: 10px; gap: 10px;">
              <el-select
                v-model="product.productId"
                placeholder="选择商品"
                style="flex: 1;"
                filterable
                @change="handleProductChange(index)"
              >
                <el-option
                  v-for="p in availableProducts"
                  :key="p.id"
                  :label="p.name"
                  :value="p.id"
                />
              </el-select>
              <el-input-number
                v-model="product.quantity"
                :min="1"
                style="width: 120px;"
              />
              <el-button type="danger" size="small" @click="removeProduct(index)">删除</el-button>
            </div>
            <el-button type="primary" size="small" @click="addProduct">添加商品</el-button>
          </div>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="packageForm.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="packageForm.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPackageDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitPackage">确定</el-button>
      </template>
    </el-dialog>

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
        <el-form-item label="库存">
          <el-input-number
            v-model="pointsForm.stock"
            :min="-1"
            :precision="0"
            placeholder="-1表示无限制"
          />
          <span style="margin-left: 10px; color: #999">件（-1表示无限制{{ editingPoints ? '，当前已兑换：' + pointsUsedCount : '' }}）</span>
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
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { 
  getSpecialPackages, 
  createSpecialPackage, 
  updateSpecialPackage, 
  deleteSpecialPackage,
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getProducts
} from '@/api/merchant'
import request from '@/api/index'
import type { FormInstance, FormRules } from 'element-plus'

const activeTab = ref('packages')
const loading = ref(false)
const couponLoading = ref(false)
const pointsLoading = ref(false)

// 特价套餐相关
const packageList = ref([])
const showPackageDialog = ref(false)
const editingPackage = ref<any>(null)
const packageFormRef = ref<FormInstance>()
const availableProducts = ref([])
const selectedProducts = ref<string[]>([])

// 优惠券相关
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

// 积分商品相关
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

const packageForm = reactive({
  name: '',
  desc: '',
  price: 0,
  oldPrice: 0,
  coverImage: '',
  products: [] as any[],
  status: 'active',
  sort: 0
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

const pointsForm = reactive({
  name: '',
  desc: '',
  image: '',
  points: 0,
  stock: -1,
  status: 'active',
  sort: 0
})

const packageRules: FormRules = {
  name: [{ required: true, message: '请输入套餐名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入套餐价格', trigger: 'blur' }],
  products: [{ required: true, message: '请至少添加一个商品', trigger: 'change' }]
}

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

// ========== 特价套餐相关 ==========
const loadPackages = async () => {
  try {
    loading.value = true
    const data = await getSpecialPackages()
    packageList.value = data.list || []
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const handleEditPackage = (row: any) => {
  editingPackage.value = row
  packageForm.name = row.name
  packageForm.desc = row.desc || ''
  packageForm.price = row.price
  packageForm.oldPrice = row.oldPrice || 0
  packageForm.coverImage = row.coverImage || ''
  packageForm.products = row.products.map((p: any) => ({
    productId: p.productId,
    quantity: p.quantity
  }))
  packageForm.status = row.status
  packageForm.sort = row.sort || 0
  showPackageDialog.value = true
}

const handleDeletePackage = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这个特价套餐吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteSpecialPackage(row.id)
    ElMessage.success('删除成功')
    loadPackages()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '删除失败')
    }
  }
}

const handleSubmitPackage = async () => {
  if (!packageFormRef.value) return

  await packageFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      try {
        if (editingPackage.value) {
          await updateSpecialPackage(editingPackage.value.id, packageForm)
          ElMessage.success('更新成功')
        } else {
          await createSpecialPackage(packageForm)
          ElMessage.success('创建成功')
        }
        showPackageDialog.value = false
        resetPackageForm()
        loadPackages()
      } catch (err: any) {
        ElMessage.error(err.message || '操作失败')
      }
    }
  })
}

const resetPackageForm = () => {
  editingPackage.value = null
  packageForm.name = ''
  packageForm.desc = ''
  packageForm.price = 0
  packageForm.oldPrice = 0
  packageForm.coverImage = ''
  packageForm.products = []
  packageForm.status = 'active'
  packageForm.sort = 0
  selectedProducts.value = []
}

// ========== 优惠券相关 ==========
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

// ========== 积分商品相关 ==========
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
    pointsForm.stock = data.stock || -1
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
          stock: pointsForm.stock || -1,
          status: pointsForm.status,
          sort: pointsForm.sort || 0
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

// ========== 通用方法 ==========
const loadProducts = async () => {
  try {
    const data = await getProducts({ page: 1, pageSize: 1000 })
    availableProducts.value = data.list || []
  } catch (err: any) {
    console.error('加载商品失败:', err)
  }
}

const addProduct = () => {
  packageForm.products.push({
    productId: '',
    quantity: 1
  })
}

const removeProduct = (index: number) => {
  packageForm.products.splice(index, 1)
}

const addSelectedProducts = () => {
  if (!selectedProducts.value.length) return
  const exists = new Set(packageForm.products.map((p: any) => String(p.productId)))
  selectedProducts.value.forEach(id => {
    if (!exists.has(String(id))) {
      packageForm.products.push({
        productId: id,
        quantity: 1
      })
    }
  })
  selectedProducts.value = []
}

const handleProductChange = (index: number) => {
  // 可以在这里添加逻辑
}

const handleCoverUploadSuccess = (response: any) => {
  if (response.code === 200) {
    packageForm.coverImage = response.data.url
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

const route = useRoute()
const router = useRouter()

const handleTabChange = (tabName: string) => {
  // 更新URL查询参数
  router.replace({
    path: route.path,
    query: { ...route.query, tab: tabName }
  })
  
  // 加载对应数据
  if (tabName === 'coupons') {
    loadCoupons()
  } else if (tabName === 'points') {
    loadPointsProducts()
  } else if (tabName === 'packages') {
    loadPackages()
  }
}

// 初始化tab
const initTab = () => {
  if (route.query.tab) {
    activeTab.value = route.query.tab as string
  }
  
  // 根据当前tab加载对应数据
  if (activeTab.value === 'coupons') {
    loadCoupons()
  } else if (activeTab.value === 'points') {
    loadPointsProducts()
  } else {
    loadPackages()
  }
  
  loadProducts()
}

// 监听路由变化
watch(() => route.query.tab, (newTab) => {
  if (newTab && typeof newTab === 'string') {
    activeTab.value = newTab
    // 切换tab时重新加载数据
    if (newTab === 'coupons') {
      loadCoupons()
    } else if (newTab === 'points') {
      loadPointsProducts()
    } else if (newTab === 'packages') {
      loadPackages()
    }
  }
}, { immediate: false })

onMounted(() => {
  initTab()
})
</script>

<style scoped>
.activities-page {
  /* padding已在layout中统一设置 */
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tab-header {
  margin-bottom: 20px;
}

.filter-card {
  margin-bottom: 20px;
}
</style>
