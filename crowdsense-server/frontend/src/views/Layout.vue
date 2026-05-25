<template>
  <el-container class="layout-container">
    <el-aside width="200px" class="aside">
      <div class="logo">管理系统</div>
      <el-menu :default-active="$route.path" router class="el-menu-vertical"
        background-color="#304156" text-color="#bfcbd9" active-text-color="#409EFF">
        <el-menu-item index="/users"><el-icon><User /></el-icon><span>用户管理</span></el-menu-item>
        <el-menu-item index="/roles"><el-icon><Avatar /></el-icon><span>角色管理</span></el-menu-item>
        <el-menu-item index="/permissions"><el-icon><Key /></el-icon><span>权限管理</span></el-menu-item>
        <el-menu-item index="/inference_tasks"><el-icon><Document /></el-icon><span>图片文件管理</span></el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-right">
          <el-dropdown>
            <span class="user-info">{{ userInfo.username || '管理员' }}<el-icon><ArrowDown /></el-icon></span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main"><router-view /></el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userInfo = ref({})

onMounted(() => {
  const user = localStorage.getItem('user')
  if (user) userInfo.value = JSON.parse(user)
})

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  ElMessage.success('退出成功')
  router.push('/login')
}
</script>

<style scoped>
.layout-container { height: 100vh; }
.aside { background-color: #304156; }
.logo { height: 60px; line-height: 60px; text-align: center; color: #fff; font-size: 18px; font-weight: bold; border-bottom: 1px solid #1f2d3d; }
.el-menu-vertical { border-right: none; }
.header { background-color: #fff; box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08); display: flex; align-items: center; justify-content: flex-end; }
.header-right { cursor: pointer; }
.user-info { color: #606266; font-size: 14px; }
.main { background-color: #f0f2f5; padding: 20px; }
</style>
