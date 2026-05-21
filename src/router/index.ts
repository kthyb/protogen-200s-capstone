import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'
import Analytics from '../views/Analytics.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: Home },
  { path: '/analytics', name: 'analytics', component: Analytics },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
