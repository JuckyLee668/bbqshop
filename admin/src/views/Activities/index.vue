<template>
  <div class="activities-page">
    <div class="page-header">
      <h2>活动管理</h2>
      <el-button type="primary" @click="showAddDialog = true">
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
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="showAddDialog"
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
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="packageForm.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getSpecialPackages, createSpecialPackage, updateSpecialPackage, deleteSpecialPackage } from '@/api/merchant'
import { getProducts } from '@/api/merchant'
import request from '@/api/index'

const loading = ref(false)
const packageList = ref([])
const showAddDialog = ref(false)
const editingPackage = ref<any>(null)
const packageFormRef = ref()
const availableProducts = ref([])
// 批量选择的商品 ID 列表
const selectedProducts = ref<string[]>([])

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

const packageRules = {
  name: [{ required: true, message: '请输入套餐名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入套餐价格', trigger: 'blur' }],
  products: [{ required: true, message: '请至少添加一个商品', trigger: 'change' }]
}

const uploadUrl = `${import.meta.env.VITE_API_BASE_URL}/v1/upload/image`
const uploadHeaders = {
  Authorization: `Bearer ${localStorage.getItem('merchant_token')}`
}

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

const loadProducts = async () => {
  try {
    const data = await getProducts({ page: 1, pageSize: 1000 })
    availableProducts.value = data.list || []
  } catch (err: any) {
    console.error('加载商品失败:', err)
  }
}

const handleEdit = (row: any) => {
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
  showAddDialog.value = true
}

const handleDelete = async (row: any) => {
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

const addProduct = () => {
  packageForm.products.push({
    productId: '',
    quantity: 1
  })
}

const removeProduct = (index: number) => {
  packageForm.products.splice(index, 1)
}

// 批量添加所选商品
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
  // 清空选择
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

const handleSubmit = async () => {
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
        showAddDialog.value = false
        resetForm()
        loadPackages()
      } catch (err: any) {
        ElMessage.error(err.message || '操作失败')
      }
    }
  })
}

const resetForm = () => {
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

onMounted(() => {
  loadPackages()
  loadProducts()
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
</style>
