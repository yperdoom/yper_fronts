import { createRouter, createWebHistory } from 'vue-router';
import { createAuthGuard } from '@yper/auth';

import Login from './pages/Login.vue';
import Today from './pages/Today.vue';
import Workouts from './pages/Workouts.vue';
import Exercises from './pages/Exercises.vue';
import History from './pages/History.vue';
import Nutrition from './pages/Nutrition.vue';
import Foods from './pages/Foods.vue';
import Measurements from './pages/Measurements.vue';
import Profile from './pages/Profile.vue';
import { session } from './api.js';

export const routes = [
  { path: '/', name: 'Login', component: Login, meta: { public: true } },
  { path: '/home', name: 'Today', component: Today },
  { path: '/treinos', name: 'Workouts', component: Workouts },
  { path: '/exercicios', name: 'Exercises', component: Exercises },
  { path: '/historico', name: 'History', component: History },
  { path: '/nutricao', name: 'Nutrition', component: Nutrition },
  { path: '/alimentos', name: 'Foods', component: Foods },
  { path: '/evolucao', name: 'Measurements', component: Measurements },
  { path: '/perfil', name: 'Profile', component: Profile },
  { path: '/:pathMatch(.*)*', redirect: '/home' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(createAuthGuard({ isAuthenticated: session.isAuthenticated, homeRoute: 'Today' }));

export default router;
