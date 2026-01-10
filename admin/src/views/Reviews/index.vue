<template>
  <div class="reviews-page">
    <div class="page-header">
      <h2>评论管理</h2>
    </div>

    <!-- 筛选栏 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="搜索">
          <el-input
            v-model="filterForm.keyword"
            placeholder="请输入评论内容"
            clearable
            style="width: 300px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadReviews">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 评论列表 -->
    <el-card>
      <el-table :data="reviewList" v-loading="loading" border>
        <el-table-column prop="orderNo" label="订单号" width="150" />
        <el-table-column prop="productName" label="商品名称" width="150" />
        <el-table-column label="用户信息" width="200">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar v-if="row.userInfo.avatarUrl" :src="row.userInfo.avatarUrl" :size="40" />
              <el-avatar v-else :size="40">{{ row.userInfo.nickName?.charAt(0) || 'U' }}</el-avatar>
              <div class="user-details">
                <div>{{ row.userInfo.nickName || '微信用户' }}</div>
                <div class="user-phone">{{ row.userInfo.phone || '未绑定' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="评分" width="100">
          <template #default="{ row }">
            <el-rate v-model="row.rating" disabled show-score text-color="#ff9900" />
          </template>
        </el-table-column>
        <el-table-column prop="content" label="评论内容" min-width="200" show-overflow-tooltip />
        <el-table-column label="图片" width="150">
          <template #default="{ row }">
            <div v-if="row.images && row.images.length > 0" class="review-images">
              <el-image
                v-for="(img, index) in row.images.slice(0, 3)"
                :key="index"
                :src="img"
                :preview-src-list="row.images"
                style="width: 60px; height: 60px; margin-right: 8px"
                fit="cover"
              />
            </div>
            <span v-else style="color: #ccc">-</span>
          </template>
        </el-table-column>
        <el-table-column label="商家回复" width="200">
          <template #default="{ row }">
            <div v-if="row.merchantReply">
              <div>{{ row.merchantReply }}</div>
              <div class="reply-time" v-if="row.merchantReplyTime">
                {{ formatDate(row.merchantReplyTime) }}
              </div>
            </div>
            <el-button
              v-else
              type="primary"
              size="small"
              @click="showReplyDialog(row)"
            >
              回复
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="评论时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              type="danger"
              size="small"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadReviews"
        @current-change="loadReviews"
        style="margin-top: 20px"
      />
    </el-card>

    <!-- 回复对话框 -->
    <el-dialog v-model="replyDialogVisible" title="回复评论" width="500px">
      <el-form :model="replyForm">
        <el-form-item label="回复内容">
          <el-input
            v-model="replyForm.reply"
            type="textarea"
            :rows="4"
            placeholder="请输入回复内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="replyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReply">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getReviews, replyReview, deleteReview } from '@/api/merchant'

const loading = ref(false)
const reviewList = ref([])

const filterForm = reactive({
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const replyDialogVisible = ref(false)
const replyForm = reactive({
  reviewId: '',
  reply: ''
})

const loadReviews = async () => {
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
    
    const data = await getReviews(params)
    reviewList.value = (data.list || []).map((item: any) => {
      const images = (item.images || []).map((img: string) => {
        if (!img) return ''
        if (img.startsWith('http')) return img
        if (img.startsWith('/')) return `${baseUrl}${img}`
        return `${baseUrl}/${img}`
      })
      return { ...item, images }
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
  loadReviews()
}

const showReplyDialog = (row: any) => {
  replyForm.reviewId = row.id
  replyForm.reply = ''
  replyDialogVisible.value = true
}

const submitReply = async () => {
  if (!replyForm.reply.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  
  try {
    await replyReview(replyForm.reviewId, replyForm.reply)
    ElMessage.success('回复成功')
    replyDialogVisible.value = false
    loadReviews()
  } catch (err: any) {
    ElMessage.error(err.message || '回复失败')
  }
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这条评论吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteReview(row.id)
    ElMessage.success('删除成功')
    loadReviews()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '删除失败')
    }
  }
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
  loadReviews()
})
</script>

<style scoped>
.reviews-page {
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

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-phone {
  font-size: 12px;
  color: #909399;
}

.review-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reply-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
