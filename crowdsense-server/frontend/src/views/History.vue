<template>
  <div class="history">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">历史检测记录</span>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 160px">
            <el-option value="SUCCESS" label="成功" />
            <el-option value="FAILED" label="失败" />
            <el-option value="PENDING" label="处理中" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch" :icon="Search">查询</el-button>
          <el-button @click="handleReset" :icon="RefreshRight">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="list" style="width: 100%" v-loading="loading" border>
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column label="原图" width="100" align="center">
          <template #default="scope">
            <el-image v-if="scope.row.imagePath" :src="'/api/files/images/' + scope.row.imagePath" style="width:60px;height:60px;border-radius:4px" fit="cover" :preview-src-list="['/api/files/images/' + scope.row.imagePath]" />
          </template>
        </el-table-column>
        <el-table-column label="密度图" width="100" align="center">
          <template #default="scope">
            <el-image v-if="scope.row.densityPath" :src="'/api/files/density/' + scope.row.densityPath" style="width:60px;height:60px;border-radius:4px" fit="cover" :preview-src-list="['/api/files/density/' + scope.row.densityPath]" />
          </template>
        </el-table-column>
        <el-table-column label="密度等级" width="150" align="center">
          <template #default="scope">
            <el-tag v-if="scope.row.densityLevel" :type="levelTagType(scope.row.densityLevel)" effect="dark" size="small">{{ scope.row.densityLevel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="inferenceTime" label="耗时(ms)" width="100" align="center" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="statusType(scope.row.status)">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="scope">
            <el-button size="small" @click="handleView(scope.row)" :icon="View">查看</el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)" :icon="Delete">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        class="pagination"
      />
    </el-card>

    <!-- 查看详情 -->
    <el-dialog v-model="viewDialogVisible" title="查看详情" width="600px" destroy-on-close>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="ID">{{ formData.id }}</el-descriptions-item>
        <el-descriptions-item label="原图">
          <el-image v-if="formData.imagePath" :src="'/api/files/images/' + formData.imagePath" style="max-width:200px" fit="contain" />
        </el-descriptions-item>
        <el-descriptions-item label="密度图">
          <el-image v-if="formData.densityPath" :src="'/api/files/density/' + formData.densityPath" style="max-width:200px" fit="contain" />
        </el-descriptions-item>
        <el-descriptions-item label="密度等级">
          <el-tag v-if="formData.densityLevel" :type="levelTagType(formData.densityLevel)" effect="dark" size="small">{{ formData.densityLevel }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="推理耗时(ms)">{{ formData.inferenceTime }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ formData.status }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formData.createTime }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="viewDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, RefreshRight, View, Delete } from '@element-plus/icons-vue'
import { getInferenceTaskList, getInferenceTaskById, deleteInferenceTask } from '../api/inferenceTask'

const loading = ref(false)
const list = ref([])
const viewDialogVisible = ref(false)
const formData = ref({})

const pagination = reactive({ current: 1, size: 10, total: 0 })
const searchForm = reactive({ status: '' })

const levelTagType = (level) => {
  if (!level) return 'info'
  if (level.includes('Low') || level.includes('低')) return 'success'
  if (level.includes('Normal') || level.includes('正常')) return 'warning'
  if (level.includes('Dense') || level.includes('密集')) return 'danger'
  if (level.includes('Crowded') || level.includes('拥挤') || level.includes('极度')) return 'danger'
  return 'info'
}
const statusType = (status) => {
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'danger'
  return 'warning'
}

const loadData = async () => {
  loading.value = true
  try {
    const params = { current: pagination.current, size: pagination.size, ...searchForm }
    Object.keys(params).forEach(k => { if (params[k] === '' || params[k] === null) delete params[k] })
    const res = await getInferenceTaskList(params)
    list.value = res.records || res.data?.records || []
    pagination.total = res.total || res.data?.total || 0
  } catch {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { pagination.current = 1; loadData() }
const handleReset = () => { searchForm.status = ''; pagination.current = 1; loadData() }
const handleSizeChange = (size) => { pagination.size = size; loadData() }
const handleCurrentChange = (current) => { pagination.current = current; loadData() }

const handleView = async (row) => {
  try {
    const res = await getInferenceTaskById(row.id)
    formData.value = res
    viewDialogVisible.value = true
  } catch {
    ElMessage.error('获取详情失败')
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该记录吗？', '确认删除', {
      type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消'
    })
    await deleteInferenceTask(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.history { padding: 20px; }
.card-title { font-weight: 600; font-size: 15px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.search-form { margin-bottom: 20px; padding: 20px; background-color: #f5f7fa; border-radius: 4px; }
.pagination { margin-top: 20px; justify-content: flex-end; }
</style>
