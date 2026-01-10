<template>
  <div class="dashboard">
    <h2>数据统计</h2>
    
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="12">
        <el-card class="stat-card orange">
          <div class="stat-content">
            <div class="stat-label">今日订单</div>
            <div class="stat-value">{{ statistics.todayOrders || 0 }}</div>
            <div class="stat-trend" :class="statistics.orderGrowth >= 0 ? 'positive' : 'negative'">
              {{ statistics.orderGrowth >= 0 ? '+' : '' }}{{ statistics.orderGrowth || 0 }}%
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="stat-card blue">
          <div class="stat-content">
            <div class="stat-label">今日营业额</div>
            <div class="stat-value">¥{{ statistics.todayRevenue || 0 }}</div>
            <div class="stat-trend" :class="statistics.revenueGrowth >= 0 ? 'positive' : 'negative'">
              {{ statistics.revenueGrowth >= 0 ? '+' : '' }}{{ statistics.revenueGrowth || 0 }}%
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 新订单提醒 -->
    <el-alert
      v-if="statistics.newOrders > 0"
      :title="`您有${statistics.newOrders}个新订单待处理`"
      type="warning"
      :closable="false"
      show-icon
      style="margin-top: 20px"
    >
      <template #default>
        <el-button type="primary" size="small" @click="goToOrders">立即查看</el-button>
      </template>
    </el-alert>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getStatistics } from '@/api/merchant'

const router = useRouter()
const statistics = ref({
  todayOrders: 0,
  todayRevenue: 0,
  yesterdayOrders: 0,
  yesterdayRevenue: 0,
  orderGrowth: 0,
  revenueGrowth: 0,
  newOrders: 0
})

const loadStatistics = async () => {
  try {
    const data = await getStatistics()
    statistics.value = data
  } catch (err) {
    console.error('加载统计数据失败:', err)
  }
}

const goToOrders = () => {
  router.push('/orders')
}

onMounted(() => {
  loadStatistics()
})
</script>

<style scoped>
.dashboard {
  /* padding已在layout中统一设置 */
}

.stats-row {
  margin-top: 20px;
}

.stat-card {
  height: 150px;
}

.stat-card.orange {
  background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
  border: none;
}

.stat-card.blue {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  border: none;
}

.stat-content {
  color: white;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 10px;
}

.stat-trend {
  font-size: 12px;
  opacity: 0.8;
}

.stat-trend.positive::before {
  content: '↑ ';
}

.stat-trend.negative::before {
  content: '↓ ';
}
</style>
