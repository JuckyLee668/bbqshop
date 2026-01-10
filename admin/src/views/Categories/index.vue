<template>
  <div class="categories-page">
    <div class="page-header">
      <h2>分类管理</h2>
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>
        新增分类
      </el-button>
    </div>

    <el-card>
      <el-table :data="categoryList" border>
        <el-table-column prop="name" label="分类名称" />
        <el-table-column prop="sort" label="排序" width="100" />
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
      :title="editingCategory ? '编辑分类' : '新增分类'"
      width="500px"
    >
      <el-form :model="categoryForm" :rules="categoryRules" ref="categoryFormRef" label-width="100px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="categoryForm.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="categoryForm.sort" :min="0" />
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
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/api/merchant'

const categoryList = ref([])
const showAddDialog = ref(false)
const editingCategory = ref<any>(null)
const categoryFormRef = ref()

const categoryForm = reactive({
  name: '',
  sort: 0
})

const categoryRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }]
}

const loadCategories = async () => {
  try {
    const data = await getCategories()
    categoryList.value = data || []
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
  }
}

const handleEdit = (row: any) => {
  editingCategory.value = row
  categoryForm.name = row.name
  categoryForm.sort = row.sort
  showAddDialog.value = true
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这个分类吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteCategory(row.id)
    ElMessage.success('删除成功')
    loadCategories()
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '删除失败')
    }
  }
}

const handleSubmit = async () => {
  if (!categoryFormRef.value) return
  
  await categoryFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      try {
        if (editingCategory.value) {
          await updateCategory(editingCategory.value.id, categoryForm)
          ElMessage.success('更新成功')
        } else {
          await createCategory(categoryForm)
          ElMessage.success('创建成功')
        }
        showAddDialog.value = false
        resetForm()
        loadCategories()
      } catch (err: any) {
        ElMessage.error(err.message || '操作失败')
      }
    }
  })
}

const resetForm = () => {
  editingCategory.value = null
  categoryForm.name = ''
  categoryForm.sort = 0
}

onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.categories-page {
  /* padding已在layout中统一设置 */
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
</style>
