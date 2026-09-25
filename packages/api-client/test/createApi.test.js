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
});
