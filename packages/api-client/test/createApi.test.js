import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApi, ApiError } from '../src/index.js';

function makeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
}

function jsonResponse(body, { status = 200, ok = status >= 200 && status < 300 } = {}) {
  return {
    status,
    ok,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  };
}

describe('createApi', () => {
  let storage;
  let fetchFn;

  beforeEach(() => {
    storage = makeStorage();
    fetchFn = vi.fn();
  });

  it('api.get chama a base com prefixo do app e metodo GET', async () => {
    fetchFn.mockResolvedValue(jsonResponse({ ok: true }));
    const { api } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn });

    await api.get('/products');

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.test/movix/products',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('envia Authorization com token e nao envia sem token', async () => {
    fetchFn.mockResolvedValue(jsonResponse({ ok: true }));
    const { api } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn });

    await api.get('/products');
    let headers = fetchFn.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();

    storage.setItem('movix_token', 'abc123');
    await api.get('/products');
    headers = fetchFn.mock.calls[1][1].headers;
    expect(headers.Authorization).toBe('Bearer abc123');
  });

  it('post serializa o body e seta Content-Type: application/json', async () => {
    fetchFn.mockResolvedValue(jsonResponse({ ok: true }));
    const { api } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn });

    await api.post('/products', { name: 'Item' });

    const [, options] = fetchFn.mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.body).toBe(JSON.stringify({ name: 'Item' }));
  });

  it('auth.login manda email/password/app para /auth/login sem prefixo e grava sessao', async () => {
    fetchFn.mockResolvedValue(jsonResponse({ token: 'tok', user: { email: 'a@a.com' } }));
    const { auth } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn });

    const user = await auth.login('a@a.com', 'secret');

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.test/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'a@a.com', password: 'secret', app: 'movix' }),
      }),
    );
    expect(storage.getItem('movix_token')).toBe('tok');
    expect(storage.getItem('movix_user')).toBe(JSON.stringify({ email: 'a@a.com' }));
    expect(user).toEqual({ email: 'a@a.com' });
  });

  it('auth.setup grava sessao; auth.status chama /auth/status', async () => {
    fetchFn.mockResolvedValue(jsonResponse({ token: 'tok', user: { email: 'b@b.com' } }));
    const { auth } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn });

    await auth.setup('B', 'b@b.com', 'secret');
    expect(storage.getItem('movix_token')).toBe('tok');

    fetchFn.mockResolvedValue(jsonResponse({ initialized: true }));
    await auth.status();
    expect(fetchFn).toHaveBeenLastCalledWith(
      'https://api.test/auth/status',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('401 limpa a sessao, chama onUnauthorized e lanca ApiError code UNAUTHORIZED', async () => {
    storage.setItem('movix_token', 'tok');
    storage.setItem('movix_user', JSON.stringify({ email: 'a@a.com' }));
    fetchFn.mockResolvedValue(jsonResponse({ error: 'expired' }, { status: 401 }));
    const onUnauthorized = vi.fn();
    const { api } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn, onUnauthorized });

    await expect(api.get('/products')).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    expect(storage.getItem('movix_token')).toBeNull();
    expect(storage.getItem('movix_user')).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('falha de rede lanca ApiError status 0 code NETWORK', async () => {
    fetchFn.mockRejectedValue(new Error('network down'));
    const { api } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn });

    await expect(api.get('/products')).rejects.toBeInstanceOf(ApiError);
    await expect(api.get('/products')).rejects.toMatchObject({ status: 0, code: 'NETWORK' });
  });

  it('resposta nao-ok lanca ApiError com payload.error como message e code HTTP', async () => {
    fetchFn.mockResolvedValue(jsonResponse({ error: 'Nome invalido' }, { status: 422 }));
    const { api } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn });

    await expect(api.post('/products', {})).rejects.toMatchObject({
      message: 'Nome invalido',
      status: 422,
      code: 'HTTP',
    });
  });

  it('resposta vazia ou texto nao-JSON nao quebra', async () => {
    fetchFn.mockResolvedValue({ status: 204, ok: true, text: async () => '' });
    const { api } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn });
    await expect(api.del('/products/1')).resolves.toBeNull();

    fetchFn.mockResolvedValue({ status: 200, ok: true, text: async () => 'plain text' });
    await expect(api.get('/products')).resolves.toBe('plain text');
  });

  it('getUser com JSON invalido no storage retorna null', () => {
    storage.setItem('movix_user', '{invalid-json');
    const { session } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn });

    expect(session.getUser()).toBeNull();
  });

  it('auth.users chama as rotas de gestao de usuarios sem prefixo do app', async () => {
    fetchFn.mockResolvedValue(jsonResponse({ users: [] }));
    const { auth } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn });
    const input = { name: 'Ana', email: 'ana@yper.dev', role: 'employee', apps: ['movix'] };

    await expect(auth.users.list()).resolves.toEqual({ users: [] });
    await auth.users.create({ ...input, password: 'secret' });
    await auth.users.update('u1', { ...input, active: false });
    await auth.users.setPassword('u1', 'newsecret');
    await auth.users.remove('u1');

    const calls = fetchFn.mock.calls.map(([url, options]) => [url, options.method, options.body]);
    expect(calls).toEqual([
      ['https://api.test/auth/users', 'GET', undefined],
      ['https://api.test/auth/users', 'POST', JSON.stringify({ ...input, password: 'secret' })],
      ['https://api.test/auth/users/u1', 'PUT', JSON.stringify({ ...input, active: false })],
      ['https://api.test/auth/users/u1/password', 'PUT', JSON.stringify({ password: 'newsecret' })],
      ['https://api.test/auth/users/u1', 'DELETE', undefined],
    ]);
  });

  it('auth.changePassword faz PUT em /auth/me/password e nao mexe na sessao', async () => {
    storage.setItem('movix_token', 'tok');
    storage.setItem('movix_user', JSON.stringify({ email: 'a@a.com' }));
    fetchFn.mockResolvedValue(jsonResponse({ user: { email: 'a@a.com' } }));
    const { auth } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn });

    await auth.changePassword('old123', 'new123');

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.test/auth/me/password',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ currentPassword: 'old123', newPassword: 'new123' }),
      }),
    );
    expect(storage.getItem('movix_token')).toBe('tok');
    expect(storage.getItem('movix_user')).toBe(JSON.stringify({ email: 'a@a.com' }));
  });

  it('auth.me atualiza o usuario salvo na sessao mantendo o token', async () => {
    storage.setItem('movix_token', 'tok');
    storage.setItem('movix_user', JSON.stringify({ email: 'a@a.com', role: 'employee' }));
    fetchFn.mockResolvedValue(jsonResponse({ user: { email: 'a@a.com', role: 'admin' } }));
    const { auth, session } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn });

    await auth.me();

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.test/auth/me',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(storage.getItem('movix_token')).toBe('tok');
    expect(session.getUser()).toEqual({ email: 'a@a.com', role: 'admin' });
  });

  it.each([
    [{ role: 'admin' }, true],
    [{ role: 'employee' }, false],
    [null, false],
  ])('session.isAdmin com usuario %j retorna %s', (user, expected) => {
    if (user) storage.setItem('movix_user', JSON.stringify(user));
    const { session } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn });

    expect(session.isAdmin()).toBe(expected);
  });

  it('envia Accept-Language com o locale quando getLocale e fornecido', async () => {
    fetchFn.mockResolvedValue(jsonResponse({ ok: true }));
    const { api } = createApi({
      app: 'movix',
      baseUrl: 'https://api.test',
      storage,
      fetchFn,
      getLocale: () => 'pt-BR',
    });

    await api.get('/products');

    const headers = fetchFn.mock.calls[0][1].headers;
    expect(headers['Accept-Language']).toBe('pt-BR');
  });

  it('nao envia Accept-Language quando getLocale nao e fornecido', async () => {
    fetchFn.mockResolvedValue(jsonResponse({ ok: true }));
    const { api } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn });

    await api.get('/products');

    const headers = fetchFn.mock.calls[0][1].headers;
    expect(headers['Accept-Language']).toBeUndefined();
  });

  it('ApiError expoe apiCode e params vindos do payload de erro', async () => {
    fetchFn.mockResolvedValue(
      jsonResponse({ error: 'Dados invalidos', code: 'VALIDATION_FAILED', params: { field: 'email' } }, { status: 422 }),
    );
    const { api } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn });

    await expect(api.post('/products', {})).rejects.toMatchObject({
      message: 'Dados invalidos',
      code: 'HTTP',
      apiCode: 'VALIDATION_FAILED',
      params: { field: 'email' },
    });
  });

  it('401 em /auth/login apenas lanca ApiError HTTP, sem logout nem onUnauthorized', async () => {
    storage.setItem('movix_token', 'tok');
    fetchFn.mockResolvedValue(
      jsonResponse({ error: 'E-mail ou senha invalidos.', code: 'INVALID_CREDENTIALS' }, { status: 401 }),
    );
    const onUnauthorized = vi.fn();
    const { auth } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn, onUnauthorized });

    await expect(auth.login('a@a.com', 'wrong')).rejects.toMatchObject({
      code: 'HTTP',
      status: 401,
      message: 'E-mail ou senha invalidos.',
      apiCode: 'INVALID_CREDENTIALS',
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(storage.getItem('movix_token')).toBe('tok');
  });

  it('401 em /auth/setup apenas lanca ApiError HTTP, sem logout nem onUnauthorized', async () => {
    fetchFn.mockResolvedValue(jsonResponse({ error: 'Cadastro ja realizado' }, { status: 401 }));
    const onUnauthorized = vi.fn();
    const { auth } = createApi({ app: 'movix', baseUrl: 'https://api.test', storage, fetchFn, onUnauthorized });

    await expect(auth.setup('A', 'a@a.com', 'secret')).rejects.toMatchObject({
      code: 'HTTP',
      status: 401,
      message: 'Cadastro ja realizado',
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe('identificacao do app', () => {
  it('expoe o nome do app no client', () => {
    const client = createApi({ app: 'movix', baseUrl: 'https://api.test', storage: {}, fetchFn: async () => ({}) });

    expect(client.app).toBe('movix');
  });
});
