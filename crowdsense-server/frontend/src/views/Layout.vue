<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="aside">
      <div class="logo">
        <svg class="logo-icon" viewBox="0 0 32 32" width="28" height="28">
          <circle cx="10" cy="10" r="4" fill="#409EFF" opacity="0.9"/>
          <circle cx="22" cy="10" r="4" fill="#67c23a" opacity="0.9"/>
          <circle cx="10" cy="22" r="4" fill="#e6a23c" opacity="0.9"/>
          <circle cx="22" cy="22" r="4" fill="#f56c6c" opacity="0.9"/>
          <circle cx="16" cy="16" r="4" fill="#9b59b6" opacity="0.85"/>
        </svg>
        <span class="logo-text">CrowdSense</span>
      </div>
      <el-menu :default-active="$route.path" router class="el-menu-vertical"
        background-color="transparent" text-color="#bfcbd9" active-text-color="#fff">
        <!-- 管理员菜单 -->
        <template v-if="isAdmin">
          <el-menu-item index="/inference_tasks">
            <el-icon><Document /></el-icon><span>人群密度预测</span>
          </el-menu-item>
          <el-menu-item index="/history">
            <el-icon><Clock /></el-icon><span>历史记录</span>
          </el-menu-item>
          <el-menu-item index="/users">
            <el-icon><User /></el-icon><span>用户管理</span>
          </el-menu-item>
          <el-menu-item index="/roles">
            <el-icon><Avatar /></el-icon><span>角色管理</span>
          </el-menu-item>
        </template>
        <!-- 普通用户菜单 -->
        <template v-else>
          <el-menu-item index="/profile">
            <el-icon><User /></el-icon><span>个人信息</span>
          </el-menu-item>
          <el-menu-item index="/inference_tasks">
            <el-icon><Document /></el-icon><span>人群密度预测</span>
          </el-menu-item>
          <el-menu-item index="/history">
            <el-icon><Clock /></el-icon><span>历史记录</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <el-container class="right-container">
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/inference_tasks' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentTitle">{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <span class="header-time">{{ currentTime }}</span>
          <el-dropdown>
            <span class="user-info">
              <el-avatar :size="28" class="user-avatar">{{ (userInfo.username || 'U')[0].toUpperCase() }}</el-avatar>
              <span class="user-name">{{ userInfo.username || '用户' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-item v-if="!isAdmin" @click="$router.push('/profile')">
                <el-icon><User /></el-icon>个人信息
              </el-dropdown-item>
              <el-dropdown-item @click="handleLogout">
                <el-icon><SwitchButton /></el-icon>退出登录
              </el-dropdown-item>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main"><router-view /></el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userInfo = ref({})
const currentTime = ref('')
let timer = null

const currentTitle = computed(() => route.meta?.title || '')

const isAdmin = computed(() => userInfo.value.role === 'admin')

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

onMounted(() => {
  const user = localStorage.getItem('user')
  if (user) userInfo.value = JSON.parse(user)
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => { if (timer) clearInterval(timer) })

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  ElMessage.success('退出成功')
  router.push('/login')
}
</script>

<style scoped>
.layout-container { height: 100vh; }

.aside {
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #304156 100%);
  overflow: hidden;
}

.logo {
  height: 64px; display: flex; align-items: center; justify-content: center; gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.logo-icon { flex-shrink: 0; }
.logo-text { color: #fff; font-size: 18px; font-weight: 700; letter-spacing: 1px; }

.el-menu-vertical {
  border-right: none;
}
.el-menu-vertical .el-menu-item {
  margin: 4px 8px;
  border-radius: 8px;
  transition: all 0.25s ease;
}
.el-menu-vertical .el-menu-item:hover {
  background-color: rgba(255,255,255,0.08) !important;
}
.el-menu-vertical .el-menu-item.is-active {
  background: linear-gradient(90deg, #409EFF, #66b1ff) !important;
  box-shadow: 0 2px 12px rgba(64,158,255,0.35);
}

.right-container { background: #f0f2f5; }

.header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,21,41,0.06);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px;
  z-index: 10;
}

.header-left { display: flex; align-items: center; }

.header-right { display: flex; align-items: center; gap: 18px; }

.header-time { color: #909399; font-size: 13px; font-family: 'Courier New', monospace; }

.user-info {
  display: flex; align-items: center; gap: 6px;
  cursor: pointer; color: #606266; font-size: 14px;
  padding: 4px 8px; border-radius: 6px;
  transition: background 0.2s;
}
.user-info:hover { background: #f5f7fa; }
.user-avatar { background: linear-gradient(135deg, #409EFF, #66b1ff); color: #fff; font-weight: 600; }
.user-name { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.main {
  background-color: #f0f2f5;
  background-image: radial-gradient(circle, #dcdfe6 1px, transparent 1px);
  background-size: 20px 20px;
  padding: 20px;
  min-height: calc(100vh - 60px);
}
</style>
