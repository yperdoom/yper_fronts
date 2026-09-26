import { createApi } from '@yper/api-client';

const baseUrl = import.meta.env.VITE_API_URL;

if (!baseUrl) {
  console.warn('[api] VITE_API_URL nao definida. Configure o .env.local.');
}

const client = createApi({
  app: 'helake',
  baseUrl,
  onUnauthorized: () => window.location.assign('/'),
});

export const { api, auth, session } = client;
export default client;
