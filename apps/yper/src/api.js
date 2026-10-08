import { createApi } from '@yper/api-client';
import { i18n } from './i18n.js';
import { detachPushOnLogout } from './push.js';

const baseUrl = import.meta.env.VITE_API_URL;

if (!baseUrl) {
  console.warn('[api] VITE_API_URL nao definida. Configure o .env.local.');
}

const client = createApi({
  app: 'yper',
  baseUrl,
  getLocale: () => i18n.global.locale.value,
  onUnauthorized: () => { detachPushOnLogout(baseUrl, null); window.location.assign('/'); },
});

export const { api, auth, session } = client;
const originalLogout = auth.logout;
auth.logout = () => {
  detachPushOnLogout(baseUrl, session.getToken());
  originalLogout();
};
export default client;
