import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },
  {
    path: '/',
    name: 'Layout',
    component: () => import('../views/Layout.vue'),
    redirect: '/inference_tasks',
    children: [
      { path: 'users', name: 'UserManagement', component: () => import('../views/UserManagement.vue'), meta: { title: '用户管理' } },
      { path: 'roles', name: 'RoleManagement', component: () => import('../views/RoleManagement.vue'), meta: { title: '角色管理' } },
      { path: 'inference_tasks', name: 'InferenceTaskManagement', component: () => import('../views/InferenceTaskManagement.vue'), meta: { title: '人群密度预测' } },
      { path: 'history', name: 'History', component: () => import('../views/History.vue'), meta: { title: '历史记录' } },
      { path: 'profile', name: 'Profile', component: () => import('../views/Profile.vue'), meta: { title: '个人信息' } }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.path !== '/login' && !token) {
    next('/login')
    return
  }
  const adminOnly = ['/users', '/roles']
  if (adminOnly.includes(to.path)) {
    const user = getUser()
    if (user && user.role !== 'admin') {
      next('/inference_tasks')
      return
    }
  }
  next()
})

function getUser() {
  try {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  } catch { return null }
}

export default router
