import { createRouter, createWebHistory } from 'vue-router';
import { createAuthGuard, UsersPage, ChangePasswordPage } from '@yper/auth';

import Login from './pages/Login.vue';
import Dashboard from './pages/Dashboard.vue';
import Products from './pages/Products.vue';
import Movements from './pages/Movements.vue';
import Invoices from './pages/Invoices.vue';
import Suppliers from './pages/Suppliers.vue';
import { session } from './api.js';

export const routes = [
  { path: '/', name: 'Login', component: Login, meta: { public: true } },
  { path: '/home', name: 'Dashboard', component: Dashboard },
  { path: '/products', name: 'Products', component: Products },
  { path: '/movements', name: 'Movements', component: Movements },
  { path: '/invoices', name: 'Invoices', component: Invoices },
  { path: '/suppliers', name: 'Suppliers', component: Suppliers },
  { path: '/users', name: 'Users', component: UsersPage, meta: { admin: true } },
  { path: '/account/password', name: 'ChangePassword', component: ChangePasswordPage },
  { path: '/:pathMatch(.*)*', redirect: '/home' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(
  createAuthGuard({ isAuthenticated: session.isAuthenticated, isAdmin: session.isAdmin, homeRoute: 'Dashboard' }),
);

export default router;
