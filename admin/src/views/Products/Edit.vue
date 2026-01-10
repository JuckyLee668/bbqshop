<template>
  <div class="product-form-page">
    <h2>编辑商品</h2>
    <el-card>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="商品描述" prop="desc">
          <el-input v-model="form.desc" type="textarea" :rows="3" placeholder="请输入商品描述" />
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number v-model="form.price" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="原价">
          <el-input-number v-model="form.oldPrice" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="库存" prop="stock">
          <el-input-number v-model="form.stock" :min="0" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类">
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="商品图片">
          <el-upload
            :action="uploadUrl"
            :headers="uploadHeaders"
            :on-success="handleImageSuccess"
            :on-remove="handleImageRemove"
            :on-error="handleImageError"
            :file-list="imageList"
            list-type="picture-card"
            :limit="5"
            accept="image/*"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div class="upload-tip">支持上传5张图片，建议尺寸750x750px</div>
        </el-form-item>
        <el-form-item label="启用加料选择">
          <el-switch v-model="form.enableAddons" />
          <div class="form-tip">开启后，用户可以在商品详情页选择加料</div>
        </el-form-item>
        <el-form-item label="加料选项" v-if="form.enableAddons">
          <div class="addons-container">
            <div v-for="(addon, index) in form.addons" :key="index" class="addon-item">
              <el-card shadow="hover">
                <div class="addon-content">
                  <div class="addon-form-row">
                    <el-form-item label="加料名称" :prop="`addons.${index}.name`" style="margin-bottom: 10px;">
                      <el-input v-model="addon.name" placeholder="请输入加料名称" style="width: 200px;" />
                    </el-form-item>
                    <el-form-item label="加料价格" :prop="`addons.${index}.price`" style="margin-bottom: 10px; margin-left: 20px;">
                      <el-input-number v-model="addon.price" :min="0" :precision="2" style="width: 150px;" />
                    </el-form-item>
                    <el-button type="danger" size="small" @click="removeAddon(index)" style="margin-left: 20px;">删除</el-button>
                  </div>
                  <div class="addon-form-row" style="margin-top: 10px;">
                    <el-form-item label="加料图片" style="margin-bottom: 0;">
                      <el-upload
                        :action="uploadUrl"
                        :headers="uploadHeaders"
                        :on-success="(res) => handleAddonImageSuccess(res, index)"
                        :on-remove="() => handleAddonImageRemove(index)"
                        :file-list="getAddonImageList(index)"
                        list-type="picture-card"
                        :limit="1"
                        accept="image/*"
                      >
                        <el-icon><Plus /></el-icon>
                      </el-upload>
                    </el-form-item>
                  </div>
                </div>
              </el-card>
            </div>
            <el-button type="primary" size="small" @click="addAddon">添加加料选项</el-button>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">保存</el-button>
          <el-button @click="goBack">取消</el-button>
          <el-button
            :type="form.status === 'on_sale' ? 'warning' : 'success'"
            @click="toggleStatus"
            :loading="statusLoading"
          >
            {{ form.status === 'on_sale' ? '下架' : '上架' }}
          </el-button>
          <el-button
            type="danger"
            @click="handleDelete"
            :loading="deleteLoading"
          >
            删除
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { updateProduct, getCategories, updateProductStatus, deleteProduct } from '@/api/merchant'
import request from '@/api/index'

const router = useRouter()
const route = useRoute()
const formRef = ref()
const loading = ref(false)
const statusLoading = ref(false)
const deleteLoading = ref(false)
const categories = ref([])
const imageList = ref([])
const uploadUrl = ref(import.meta.env.VITE_API_BASE_URL + '/upload/image')
const uploadHeaders = ref({
  Authorization: `Bearer ${localStorage.getItem('merchant_token')}`
})

const form = reactive({
  name: '',
  desc: '',
  price: 0,
  oldPrice: 0,
  stock: 0,
  categoryId: '',
  images: [],
  addons: [],
  enableAddons: true,
  status: 'on_sale'
})

const rules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存', trigger: 'blur' }]
}

const loadProduct = async () => {
  try {
    const data = await request({
      url: `/merchant/products/${route.params.id}`,
      method: 'get'
    })
    Object.assign(form, {
      name: data.name,
      desc: data.desc,
      price: data.price,
      oldPrice: data.oldPrice,
      stock: data.stock,
      categoryId: data.categoryId,
      images: data.images || [],
      addons: (data.addons || []).map((addon: any) => ({
        name: addon.name || '',
        price: addon.price || 0,
        image: addon.image || ''
      })),
      enableAddons: data.enableAddons !== false,
      status: data.status || 'on_sale'
    })
    // 设置图片列表用于显示
    imageList.value = (data.images || []).map((url: string) => ({
      url: url.startsWith('http') ? url : import.meta.env.VITE_API_BASE_URL.replace('/v1', '') + url,
      response: { data: { url } }
    }))
  } catch (err: any) {
    ElMessage.error(err.message || '加载失败')
  }
}

const handleImageSuccess = (response: any, file: any) => {
  if (response.code === 200 && response.data) {
    const imageUrl = response.data.url || response.data
    form.images.push(imageUrl)
    ElMessage.success('图片上传成功')
  } else {
    ElMessage.error(response.message || '图片上传失败')
  }
}

const handleImageRemove = (file: any) => {
  const url = file.response?.data?.url || file.url
  if (url) {
    const index = form.images.indexOf(url)
    if (index > -1) {
      form.images.splice(index, 1)
    }
  }
}

const handleImageError = (err: any) => {
  ElMessage.error('图片上传失败')
  console.error('Upload error:', err)
}

const addAddon = () => {
  form.addons.push({
    name: '',
    price: 0,
    image: ''
  })
}

const removeAddon = (index: number) => {
  form.addons.splice(index, 1)
}

const handleAddonImageSuccess = (response: any, index: number) => {
  if (response.code === 200 && response.data) {
    const imageUrl = response.data.url || response.data
    form.addons[index].image = imageUrl
    ElMessage.success('图片上传成功')
  } else {
    ElMessage.error(response.message || '图片上传失败')
  }
}

const handleAddonImageRemove = (index: number) => {
  form.addons[index].image = ''
}

const getAddonImageList = (index: number) => {
  const image = form.addons[index]?.image
  if (!image) return []
  return [{
    url: image.startsWith('http') ? image : import.meta.env.VITE_API_BASE_URL.replace('/v1', '') + image,
    response: { data: { url: image } }
  }]
}

const loadCategories = async () => {
  try {
    const data = await getCategories()
    categories.value = data || []
  } catch (err) {
    console.error('加载分类失败:', err)
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      try {
        loading.value = true
        await updateProduct(route.params.id as string, form)
        ElMessage.success('更新成功')
        router.push('/products')
      } catch (err: any) {
        ElMessage.error(err.message || '更新失败')
      } finally {
        loading.value = false
      }
    }
  })
}

const toggleStatus = async () => {
  try {
    statusLoading.value = true
    const newStatus = form.status === 'on_sale' ? 'off_sale' : 'on_sale'
    await updateProductStatus(route.params.id as string, newStatus)
    form.status = newStatus
    ElMessage.success(newStatus === 'on_sale' ? '已上架' : '已下架')
  } catch (err: any) {
    ElMessage.error(err.message || '操作失败')
  } finally {
    statusLoading.value = false
  }
}

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要删除这个商品吗？删除后无法恢复。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    deleteLoading.value = true
    await deleteProduct(route.params.id as string)
    ElMessage.success('删除成功')
    router.push('/products')
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '删除失败')
    }
  } finally {
    deleteLoading.value = false
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  loadProduct()
  loadCategories()
})
</script>

<style scoped>
.product-form-page {
  padding: 20px;
}

.upload-tip {
  color: #909399;
  font-size: 12px;
  margin-top: 8px;
}

.form-tip {
  color: #909399;
  font-size: 12px;
  margin-left: 10px;
}

.addons-container {
  width: 100%;
}

.addon-item {
  margin-bottom: 15px;
}

.addon-content {
  padding: 10px;
}

.addon-form-row {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
}
</style>
