import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: () => import('@/layout/index.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '数据统计', icon: 'DataAnalysis' }
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/views/Products/index.vue'),
        meta: { title: '商品管理', icon: 'Goods' }
      },
      {
        path: 'products/add',
        name: 'ProductAdd',
        component: () => import('@/views/Products/Add.vue'),
        meta: { title: '新增商品' }
      },
      {
        path: 'products/edit/:id',
        name: 'ProductEdit',
        component: () => import('@/views/Products/Edit.vue'),
        meta: { title: '编辑商品' }
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/views/Categories/index.vue'),
        meta: { title: '分类管理', icon: 'Menu' }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/Orders/index.vue'),
        meta: { title: '订单管理', icon: 'Document' }
      },
      {
        path: 'store',
        name: 'Store',
        component: () => import('@/views/Store/index.vue'),
        meta: { title: '门店管理', icon: 'Shop' }
      },
      {
        path: 'special-packages',
        name: 'SpecialPackages',
        component: () => import('@/views/SpecialPackages/index.vue'),
        meta: { title: '特价套餐', icon: 'Promotion' }
      },
      {
        path: 'coupons',
        name: 'Coupons',
        component: () => import('@/views/Coupons/index.vue'),
        meta: { title: '优惠券管理', icon: 'Promotion' }
      },
      {
        path: 'points-mall',
        name: 'PointsMall',
        component: () => import('@/views/PointsMall/index.vue'),
        meta: { title: '积分商城', icon: 'Promotion' }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/Users/index.vue'),
        meta: { title: '用户管理', icon: 'User' }
      },
      {
        path: 'reviews',
        name: 'Reviews',
        component: () => import('@/views/Reviews/index.vue'),
        meta: { title: '评论管理', icon: 'ChatLineRound' }
      },
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('merchant_token')
  if (to.path === '/login') {
    next()
  } else if (!token) {
    next('/login')
  } else {
    next()
  }
})

export default router
