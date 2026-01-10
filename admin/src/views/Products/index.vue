<template>
  <div class="products-page">
    <div class="page-header">
      <h2>商品管理</h2>
      <el-button type="primary" @click="goToAdd">
        <el-icon><Plus /></el-icon>
        新增商品
      </el-button>
    </div>

    <!-- 筛选栏 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部" clearable>
            <el-option label="上架" value="on_sale" />
            <el-option label="下架" value="off_sale" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadProducts">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 商品列表 -->
    <el-card>
      <el-table :data="productList" v-loading="loading" border>
        <el-table-column prop="name" label="商品名称" width="200" />
        <el-table-column label="图片" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.image"
              style="width: 60px; height: 60px"
              fit="cover"
            />
          </template>
        </el-table-column>
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">¥{{ row.price }}</template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'on_sale' ? 'success' : 'info'">
              {{ row.status === 'on_sale' ? '上架' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="推荐" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isRecommend" type="warning" size="small">推荐</el-tag>
            <span v-else style="color: #ccc">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="goToEdit(row.id)">编辑</el-button>
            <el-button
              :type="row.isRecommend ? 'info' : 'warning'"
              size="small"
              @click="toggleRecommend(row)"
            >
              {{ row.isRecommend ? '取消推荐' : '设为推荐' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadProducts"
        @current-change="loadProducts"
        style="margin-top: 20px"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProducts, setProductRecommend } from '@/api/merchant'

const router = useRouter()
const loading = ref(false)
const productList = ref([])

const filterForm = reactive({
  status: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const loadProducts = async () => {
  try {
    loading.value = true
    const baseUrl = import.meta.env.VITE_API_BASE_URL.replace('/v1', '')
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filterForm.status) {
      params.status = filterForm.status
    }
    
    const data = await getProducts(params)
    productList.value = (data.list || []).map((item: any) => {
      const img = item.image
      const fullImage =
        !img
          ? ''
          : img.startsWith('http')
          ? img
          : img.startsWith('/')
          ? `${baseUrl}${img}`
          : `${baseUrl}/${img}`
      return { ...item, image: fullImage }
    })
    pagination.total = data.total || 0
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  filterForm.status = ''
  pagination.page = 1
  loadProducts()
}

const goToAdd = () => {
  router.push('/products/add')
}

const goToEdit = (id: string) => {
  router.push(`/products/edit/${id}`)
}

const toggleRecommend = async (row: any) => {
  try {
    const newRecommend = !row.isRecommend
    if (newRecommend) {
      await ElMessageBox.confirm(
        '设置为推荐商品后，之前的推荐商品将被取消推荐。是否继续？',
        '提示',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    }
    await setProductRecommend(row.id, newRecommend)
    ElMessage.success(newRecommend ? '已设为推荐商品' : '已取消推荐')
    loadProducts()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '操作失败')
    }
  }
}

onMounted(() => {
  loadProducts()
})
</script>

<style scoped>
.products-page {
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
