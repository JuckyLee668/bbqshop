<template>
  <div class="orders-page">
    <h2>订单管理</h2>

    <!-- 筛选栏 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="订单状态">
          <el-select v-model="filterForm.status" placeholder="全部" clearable>
            <el-option label="待制作" value="pending" />
            <el-option label="制作中" value="making" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadOrders">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 订单列表 -->
    <el-card>
      <el-table :data="orderList" v-loading="loading" border>
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="statusText" label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'pending' || row.status === 'paid' ? 'warning' : 
                     row.status === 'making' ? 'primary' : 
                     row.status === 'completed' ? 'success' : 'info'"
            >
              {{ row.statusText }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="商品" min-width="200">
          <template #default="{ row }">
            <div v-for="(item, index) in row.items" :key="index">
              {{ item.productName }} × {{ item.quantity }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="totalPrice" label="金额" width="100">
          <template #default="{ row }">¥{{ row.totalPrice }}</template>
        </el-table-column>
        <el-table-column prop="deliveryTypeText" label="配送方式" width="100" />
        <el-table-column label="配送地址" width="250">
          <template #default="{ row }">
            <div v-if="row.deliveryType === 'delivery' && row.deliveryAddress">
              <div class="address-info">
                <div class="address-name-phone">
                  <span class="address-name">{{ row.deliveryAddress.name }}</span>
                  <span class="address-phone">{{ row.deliveryAddress.phone }}</span>
                </div>
                <div class="address-text">{{ row.deliveryAddress.address }}{{ row.deliveryAddress.detail }}</div>
              </div>
            </div>
            <span v-else-if="row.deliveryType === 'delivery' && !row.deliveryAddress" class="no-address">未选择地址</span>
            <span v-else class="no-address">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="下单时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending' || row.status === 'paid'"
              type="primary"
              size="small"
              @click="handleAccept(row)"
            >
              接单
            </el-button>
            <el-button
              v-if="row.status === 'making'"
              type="success"
              size="small"
              @click="handleComplete(row)"
            >
              完成
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadOrders"
        @current-change="loadOrders"
        style="margin-top: 20px"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getOrders, acceptOrder, completeOrder } from '@/api/merchant'

const loading = ref(false)
const orderList = ref([])

const filterForm = reactive({
  status: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const loadOrders = async () => {
  try {
    loading.value = true
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filterForm.status) {
      params.status = filterForm.status
    }
    
    const data = await getOrders(params)
    orderList.value = data.list || []
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
  loadOrders()
}

const handleAccept = async (row: any) => {
  try {
    await acceptOrder(row.id)
    ElMessage.success('接单成功')
    loadOrders()
  } catch (err: any) {
    ElMessage.error(err.message || '操作失败')
  }
}

const handleComplete = async (row: any) => {
  try {
    await completeOrder(row.id)
    ElMessage.success('订单已完成')
    loadOrders()
  } catch (err: any) {
    ElMessage.error(err.message || '操作失败')
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped>
.orders-page {
  /* padding已在layout中统一设置 */
}

.filter-card {
  margin-bottom: 20px;
}

.address-info {
  font-size: 12px;
  line-height: 1.6;
}

.address-name-phone {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.address-name {
  font-weight: 600;
  color: #333;
}

.address-phone {
  color: #666;
}

.address-text {
  color: #666;
  word-break: break-all;
}

.no-address {
  color: #999;
  font-size: 12px;
}
</style>
