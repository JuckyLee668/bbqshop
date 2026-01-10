<template>
  <div class="product-form-page">
    <h2>新增商品</h2>
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
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { createProduct, getCategories } from '@/api/merchant'
import request from '@/api/index'

const router = useRouter()
const formRef = ref()
const loading = ref(false)
const categories = ref([])

// 根据 form.images 计算 imageList，确保 UI 显示同步
const imageList = computed(() => {
  return form.images.map((url: string) => ({
    url: url.startsWith('http') ? url : (import.meta.env.VITE_API_BASE_URL?.replace('/v1', '') || '') + url,
    response: { code: 200, data: { url } }
  }))
})

// 确保上传 URL 包含正确的路径前缀
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/v1'
const uploadUrl = ref(apiBaseUrl.endsWith('/v1') 
  ? `${apiBaseUrl}/upload/image` 
  : `${apiBaseUrl}/v1/upload/image`)
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
  flavors: ['original', 'spicy', 'cumin'],
  spicyLevels: ['none', 'mild', 'medium', 'hot'],
  addons: [],
  enableAddons: true
})

const rules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存', trigger: 'blur' }]
}

const loadCategories = async () => {
  try {
    const data = await getCategories()
    categories.value = data || []
  } catch (err) {
    console.error('加载分类失败:', err)
  }
}

const handleImageSuccess = (response: any, file: any) => {
  console.log('Upload success response:', response)
  if (response && response.code === 200 && response.data) {
    const imageUrl = response.data.url || response.data
    if (imageUrl && !form.images.includes(imageUrl)) {
      form.images.push(imageUrl)
      ElMessage.success('图片上传成功')
    } else {
      ElMessage.warning('图片已存在')
    }
  } else {
    ElMessage.error(response?.message || '图片上传失败')
    console.error('Upload failed:', response)
  }
}

const handleImageRemove = (file: any) => {
  // 从 file.response 或 file.url 中提取原始路径
  let url = file.response?.data?.url || file.url
  
  // 如果 url 包含完整的 API 路径，提取相对路径
  if (url && url.includes('/uploads/')) {
    url = url.substring(url.indexOf('/uploads/'))
  }
  
  if (url) {
    const index = form.images.findIndex((img: string) => 
      img === url || img.endsWith(url) || url.endsWith(img)
    )
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

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      try {
        loading.value = true
        await createProduct(form)
        ElMessage.success('创建成功')
        router.push('/products')
      } catch (err: any) {
        ElMessage.error(err.message || '创建失败')
      } finally {
        loading.value = false
      }
    }
  })
}

const goBack = () => {
  router.back()
}

onMounted(() => {
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
