import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },
  {
    path: '/',
    name: 'Layout',
    component: () => import('../views/Layout.vue'),
    redirect: '/users',
    children: [
      { path: 'users', name: 'UserManagement', component: () => import('../views/UserManagement.vue'), meta: { title: '用户管理' } },
      { path: 'roles', name: 'RoleManagement', component: () => import('../views/RoleManagement.vue'), meta: { title: '角色管理' } },
      { path: 'permissions', name: 'PermissionManagement', component: () => import('../views/PermissionManagement.vue'), meta: { title: '权限管理' } },
      { path: 'inference_tasks', name: 'InferenceTaskManagement', component: () => import('../views/InferenceTaskManagement.vue'), meta: { title: '图片文件管理' } }
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
  } else {
    next()
  }
})

export default router
