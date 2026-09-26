import { createRouter, createWebHistory } from 'vue-router';
import { createAuthGuard } from '@yper/auth';

import Login from './pages/Login.vue';
import Dashboard from './pages/Dashboard.vue';
import Orders from './pages/Orders.vue';
import Recipes from './pages/Recipes.vue';
import Customers from './pages/Customers.vue';
import Ingredients from './pages/Ingredients.vue';
import Settings from './pages/Settings.vue';
import { session } from './api.js';

export const routes = [
  { path: '/', name: 'Login', component: Login, meta: { public: true } },
  { path: '/home', name: 'Dashboard', component: Dashboard },
  { path: '/orders', name: 'Orders', component: Orders },
  { path: '/recipes', name: 'Recipes', component: Recipes },
  { path: '/customers', name: 'Customers', component: Customers },
  { path: '/ingredients', name: 'Ingredients', component: Ingredients },
  { path: '/settings', name: 'Settings', component: Settings },
  { path: '/:pathMatch(.*)*', redirect: '/home' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(createAuthGuard({ isAuthenticated: session.isAuthenticated, homeRoute: 'Dashboard' }));

export default router;
