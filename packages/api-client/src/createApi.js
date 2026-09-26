/**
 * Cliente HTTP da yper-api, parametrizado por app.
 *
 * Os caminhos passados para api.get/post/put/del sao relativos ao dominio do
 * app: api.get('/products') bate em <baseUrl>/<app>/products. As rotas de
 * autenticacao ficam fora desse prefixo e tem metodos proprios em `auth`.
 */

export class ApiError extends Error {
  constructor(message, status, body, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

export function createApi({
  app,
  baseUrl,
  storage = globalThis.localStorage,
  fetchFn = globalThis.fetch,
  onUnauthorized,
}) {
  const base = (baseUrl || '').replace(/\/$/, '');
  const TOKEN_KEY = `${app}_token`;
  const USER_KEY = `${app}_user`;

  // ---------- sessao ----------

  function getToken() {
    return storage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(storage.getItem(USER_KEY)) || null;
    } catch {
      return null;
    }
  }

  function isAuthenticated() {
    return Boolean(getToken());
  }

  function isAdmin() {
    return getUser()?.role === 'admin';
  }

  function startSession({ token, user }) {
    storage.setItem(TOKEN_KEY, token);
    if (user) storage.setItem(USER_KEY, JSON.stringify(user));
  }

  function logout() {
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(USER_KEY);
  }

  // ---------- requisicoes ----------

  async function request(method, path, body) {
    const token = getToken();

    let response;
    try {
      response = await fetchFn(`${base}${path}`, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      // O plano free do Render hiberna: a primeira chamada pode demorar ou falhar.
      throw new ApiError('Nao foi possivel falar com o servidor. Tente de novo.', 0, null, 'NETWORK');
    }

    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (response.status === 401) {
      logout();
      onUnauthorized?.();
      throw new ApiError('Sessao expirada. Faca login novamente.', 401, payload, 'UNAUTHORIZED');
    }

    if (!response.ok) {
      throw new ApiError(payload?.error || `Erro ${response.status}`, response.status, payload, 'HTTP');
    }

    return payload;
  }

  const scoped = (path) => `/${app}${path}`;

  const api = {
    get: (path) => request('GET', scoped(path)),
    post: (path, body) => request('POST', scoped(path), body),
    put: (path, body) => request('PUT', scoped(path), body),
    del: (path) => request('DELETE', scoped(path)),
  };

  const auth = {
    /** Diz se a base ja tem algum usuario, para decidir entre login e setup. */
    status: () => request('GET', '/auth/status'),

    async login(email, password) {
      const data = await request('POST', '/auth/login', { email, password, app });
      startSession(data);
      return data.user;
    },

    async setup(name, email, password) {
      const data = await request('POST', '/auth/setup', { name, email, password });
      startSession(data);
      return data.user;
    },

    me: () => request('GET', '/auth/me'),

    changePassword: (currentPassword, newPassword) =>
      request('PUT', '/auth/me/password', { currentPassword, newPassword }),

    /** Gestao de usuarios; a api so aceita admin. */
    users: {
      list: () => request('GET', '/auth/users'),
      create: (user) => request('POST', '/auth/users', user),
      update: (id, user) => request('PUT', `/auth/users/${id}`, user),
      setPassword: (id, password) => request('PUT', `/auth/users/${id}/password`, { password }),
      remove: (id) => request('DELETE', `/auth/users/${id}`),
    },

    logout,
  };

  const session = { getToken, getUser, isAuthenticated, isAdmin };

  return { api, auth, session };
}
