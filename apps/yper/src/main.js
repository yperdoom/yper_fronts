import '@yper/ui/base.css';
import './theme.css';
import { createApp } from 'vue';
import { createShell } from '@yper/ui';

import App from './App.vue';
import router from './router';
import client from './api.js';
import { i18n } from './i18n.js';
import { APP_NAME, NAV } from './nav.js';
import { deviceFor, refreshPush, pushAvailability } from './push.js';

// Refresh only devices explicitly opted in by this user; never prompt on page load.
let refreshedUser;
router.afterEach(() => {
  const userId = client.session.getUser()?.id;
  if (!client.session.isAuthenticated()) { refreshedUser = null; return; }
  if (userId && refreshedUser !== userId && deviceFor(userId) && pushAvailability() === 'ready') {
    refreshedUser = userId;
    refreshPush(client.api, userId).catch(() => {});
  }
});

createApp(App)
  .use(i18n)
  .use(createShell({ appName: APP_NAME, nav: NAV, api: client }))
  .use(router)
  .mount('#app');
