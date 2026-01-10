<template>
  <div class="users-page">
    <div class="page-header">
      <h2>用户管理</h2>
    </div>

    <!-- 筛选栏 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="搜索">
          <el-input
            v-model="filterForm.keyword"
            placeholder="请输入手机号或微信名"
            clearable
            style="width: 300px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadUsers">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表 -->
    <el-card>
      <el-table :data="userList" v-loading="loading" border>
        <el-table-column prop="nickName" label="微信名" width="150" />
        <el-table-column prop="phone" label="手机号" width="150">
          <template #default="{ row }">
            <span>{{ row.phone || '未绑定' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="openid" label="微信ID" width="200" show-overflow-tooltip />
        <el-table-column label="头像" width="100">
          <template #default="{ row }">
            <el-image
              v-if="row.avatarUrl"
              :src="row.avatarUrl"
              style="width: 60px; height: 60px"
              fit="cover"
            />
            <span v-else style="color: #ccc">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="orderCount" label="订单数" width="100" />
        <el-table-column prop="totalConsumption" label="累计消费" width="120">
          <template #default="{ row }">¥{{ row.totalConsumption || 0 }}</template>
        </el-table-column>
        <el-table-column prop="points" label="积分" width="100" />
        <el-table-column label="地址" width="200">
          <template #default="{ row }">
            <div v-if="row.addresses && row.addresses.length > 0">
              <div v-for="(addr, index) in row.addresses.slice(0, 2)" :key="index" class="address-item">
                {{ addr.name }} {{ addr.phone }}<br />
                {{ addr.address }}{{ addr.detail ? addr.detail : '' }}
              </div>
              <span v-if="row.addresses.length > 2" class="more-address">
                还有 {{ row.addresses.length - 2 }} 个地址
              </span>
            </div>
            <span v-else style="color: #ccc">暂无地址</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadUsers"
        @current-change="loadUsers"
        style="margin-top: 20px"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getUsers } from '@/api/merchant'

const loading = ref(false)
const userList = ref([])

const filterForm = reactive({
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const loadUsers = async () => {
  try {
    loading.value = true
    const baseUrl = import.meta.env.VITE_API_BASE_URL.replace('/v1', '')
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filterForm.keyword) {
      params.keyword = filterForm.keyword
    }
    
    const data = await getUsers(params)
    userList.value = (data.list || []).map((item: any) => {
      // 处理头像URL
      const img = item.avatarUrl
      let fullImage = ''
      if (img) {
        if (img.startsWith('http')) {
          fullImage = img
        } else if (img.startsWith('/')) {
          fullImage = `${baseUrl}${img}`
        } else {
          fullImage = `${baseUrl}/${img}`
        }
      }
      return { 
        ...item, 
        avatarUrl: fullImage,
        nickName: item.nickName || '微信用户' // 确保昵称有默认值
      }
    })
    pagination.total = data.total || 0
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  filterForm.keyword = ''
  pagination.page = 1
  loadUsers()
}

const formatDate = (date: string | Date) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-page {
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

.address-item {
  font-size: 12px;
  color: #606266;
  margin-bottom: 4px;
  line-height: 1.5;
}

.more-address {
  font-size: 12px;
  color: #909399;
  font-style: italic;
}
</style>
