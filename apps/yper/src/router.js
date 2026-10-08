import { createRouter, createWebHistory } from 'vue-router';
import { createAuthGuard, UsersPage, ChangePasswordPage } from '@yper/auth';

import Login from './pages/Login.vue';
import Today from './pages/Today.vue';
import Workouts from './pages/Workouts.vue';
import Exercises from './pages/Exercises.vue';
import History from './pages/History.vue';
import Nutrition from './pages/Nutrition.vue';
import Foods from './pages/Foods.vue';
import Measurements from './pages/Measurements.vue';
import Profile from './pages/Profile.vue';
import Notifications from './pages/Notifications.vue';
import { session } from './api.js';

export const routes = [
  { path: '/', name: 'Login', component: Login, meta: { public: true } },
  { path: '/home', name: 'Today', component: Today },
  { path: '/workouts', name: 'Workouts', component: Workouts },
  { path: '/exercises', name: 'Exercises', component: Exercises },
  { path: '/history', name: 'History', component: History },
  { path: '/nutrition', name: 'Nutrition', component: Nutrition },
  { path: '/foods', name: 'Foods', component: Foods },
  { path: '/measurements', name: 'Measurements', component: Measurements },
  { path: '/profile', name: 'Profile', component: Profile },
  { path: '/notifications', name: 'Notifications', component: Notifications },
  { path: '/users', name: 'Users', component: UsersPage, meta: { admin: true } },
  { path: '/account/password', name: 'ChangePassword', component: ChangePasswordPage },
  { path: '/:pathMatch(.*)*', redirect: '/home' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(
  createAuthGuard({ isAuthenticated: session.isAuthenticated, isAdmin: session.isAdmin, homeRoute: 'Today' }),
);

export default router;
