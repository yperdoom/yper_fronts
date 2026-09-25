import { createRouter, createWebHistory } from 'vue-router';
import { createAuthGuard } from '@yper/auth';

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
  { path: '/produtos', name: 'Products', component: Products },
  { path: '/movimentacoes', name: 'Movements', component: Movements },
  { path: '/notas', name: 'Invoices', component: Invoices },
  { path: '/fornecedores', name: 'Suppliers', component: Suppliers },
  { path: '/:pathMatch(.*)*', redirect: '/home' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(createAuthGuard({ isAuthenticated: session.isAuthenticated, homeRoute: 'Dashboard' }));

export default router;
