<template>
  <div class="management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>角色管理</span>
          <el-button type="primary" @click="handleAdd" :icon="Plus">新增</el-button>
        </div>
      </template>

      <!-- 条件查询区域 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="角色编码">
          <el-input v-model="searchForm.roleCode" placeholder="请输入角色编码" clearable />
        </el-form-item>
        <el-form-item label="角色名称">
          <el-input v-model="searchForm.roleName" placeholder="请输入角色名称" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 120px">
            <el-option :value="1" label="启用" />
            <el-option :value="0" label="禁用" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch" :icon="Search">查询</el-button>
          <el-button @click="handleReset" :icon="RefreshRight">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 数据表格 -->
      <el-table :data="list" style="width: 100%" v-loading="loading" border>
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="roleCode" label="角色编码" show-overflow-tooltip />
        <el-table-column prop="roleName" label="角色名称" show-overflow-tooltip />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="scope">
            <el-button size="small" @click="handleView(scope.row)" :icon="View">查看</el-button>
            <el-button size="small" type="primary" @click="handleEdit(scope.row)" :icon="Edit">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)" :icon="Delete">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
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

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" destroy-on-close>
      <el-form :model="formData" ref="formRef" label-width="100px" :rules="formRules">
        <el-form-item label="角色编码" prop="roleCode">
          <el-input v-model="formData.roleCode" placeholder="请输入角色编码" />
        </el-form-item>
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="formData.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="formData.description" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%">
            <el-option :value="1" label="启用" />
            <el-option :value="0" label="禁用" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="viewDialogVisible" title="查看详情" width="600px" destroy-on-close>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="ID">{{ formData.id }}</el-descriptions-item>
        <el-descriptions-item label="角色编码">{{ formData.roleCode }}</el-descriptions-item>
        <el-descriptions-item label="角色名称">{{ formData.roleName }}</el-descriptions-item>
        <el-descriptions-item label="描述">{{ formData.description }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ formData.status === 1 ? '启用' : '禁用' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formData.createTime }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formData.updateTime }}</el-descriptions-item>
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
import { Plus, Search, RefreshRight, View, Edit, Delete } from '@element-plus/icons-vue'
import {
  getRoleList,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
} from '../api/role'

const loading = ref(false)
const list = ref([])
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const dialogTitle = ref('新增')
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref()

const pagination = reactive({
  current: 1,
  size: 10,
  total: 0
})

const searchForm = reactive({
  roleCode: '',
  roleName: '',
  description: '',
  status: ''
})

const formData = ref({
  roleCode: '',
  roleName: '',
  description: '',
  status: 1
})

const formRules = {
  roleCode: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }],
  status: [{ required: true, message: '请输入状态', trigger: 'blur' }]
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      current: pagination.current,
      size: pagination.size,
      ...searchForm
    }
    const res = await getRoleList(params)
    list.value = res.records || res.data?.records || []
    pagination.total = res.total || res.data?.total || 0
  } catch (error) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.current = 1
  loadData()
}

const handleReset = () => {
  searchForm.roleCode = ''
  searchForm.roleName = ''
  searchForm.description = ''
  searchForm.status = 1
  pagination.current = 1
  loadData()
}

const handleSizeChange = (size) => {
  pagination.size = size
  loadData()
}

const handleCurrentChange = (current) => {
  pagination.current = current
  loadData()
}

const handleAdd = () => {
  isEdit.value = false
  dialogTitle.value = '新增'
  formData.value = {
  roleCode: '',
  roleName: '',
  description: '',
  status: 1
  }
  dialogVisible.value = true
}

const handleView = async (row) => {
  try {
    const res = await getRoleById(row.id)
    formData.value = res
    viewDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取详情失败')
  }
}

const handleEdit = (row) => {
  isEdit.value = true
  dialogTitle.value = '编辑'
  formData.value = { ...row }
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该角色吗？删除后不可恢复！', '确认删除', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    await deleteRole(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitLoading.value = true
  try {
    if (isEdit.value) {
      await updateRole(formData.value.id, formData.value)
      ElMessage.success('更新成功')
    } else {
      await createRole(formData.value)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (error) {
    ElMessage.error(isEdit.value ? '更新失败' : '创建失败')
  } finally {
    submitLoading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.management {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-form {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.pagination {
  margin-top: 20px;
  justify-content: flex-end;
}
</style>
