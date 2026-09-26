import '@yper/ui/base.css';
import './theme.css';
import { createApp } from 'vue';
import { createShell } from '@yper/ui';

import App from './App.vue';
import router from './router';
import client from './api.js';
import { i18n } from './i18n.js';
import { APP_NAME, NAV } from './nav.js';

createApp(App)
  .use(i18n)
  .use(createShell({ appName: APP_NAME, nav: NAV, api: client }))
  .use(router)
  .mount('#app');
