import '@yper/ui/base.css';
import './theme.css';
import { createApp } from 'vue';
import { createAppI18n } from '@yper/i18n';
import { createShell } from '@yper/ui';

import App from './App.vue';
import router from './router';
import client from './api.js';
import { APP_NAME, NAV } from './nav.js';
import ptBR from './locales/pt-BR.json';
import enUS from './locales/en-US.json';

const i18n = createAppI18n({ messages: { 'pt-BR': ptBR, 'en-US': enUS } });

createApp(App)
  .use(i18n)
  .use(createShell({ appName: APP_NAME, nav: NAV, api: client }))
  .use(router)
  .mount('#app');
