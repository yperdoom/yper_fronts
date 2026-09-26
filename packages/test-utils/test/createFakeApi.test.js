import { describe, it, expect, vi } from 'vitest';
import { createFakeApi } from '../src/index.js';

describe('createFakeApi', () => {
  it('get resolve [] por padrao quando o path nao tem resposta configurada', async () => {
    const { api } = createFakeApi();

    await expect(api.get('/produtos')).resolves.toEqual([]);
  });

  it('get resolve a resposta configurada para o path', async () => {
    const { api } = createFakeApi({ '/produtos': { products: [{ id: 1 }] } });

    await expect(api.get('/produtos')).resolves.toEqual({ products: [{ id: 1 }] });
  });

  it('post/put/del resolvem {} por padrao', async () => {
    const { api } = createFakeApi();

    await expect(api.post('/produtos', { name: 'x' })).resolves.toEqual({});
    await expect(api.put('/produtos/1', { name: 'y' })).resolves.toEqual({});
    await expect(api.del('/produtos/1')).resolves.toEqual({});
  });

  it('post/put/del resolvem a resposta configurada com prefixo do metodo', async () => {
    const { api } = createFakeApi({
      'POST /produtos': { id: 2 },
      'PUT /produtos/1': { id: 1, name: 'atualizado' },
      'DELETE /produtos/1': { ok: true },
    });

    await expect(api.post('/produtos', { name: 'x' })).resolves.toEqual({ id: 2 });
    await expect(api.put('/produtos/1', { name: 'y' })).resolves.toEqual({ id: 1, name: 'atualizado' });
    await expect(api.del('/produtos/1')).resolves.toEqual({ ok: true });
  });

  it('api e auth expoe spies (vi.fn)', async () => {
    const { api, auth } = createFakeApi();

    await api.get('/produtos');

    expect(vi.isMockFunction(api.get)).toBe(true);
    expect(vi.isMockFunction(auth.logout)).toBe(true);
    expect(api.get).toHaveBeenCalledWith('/produtos');
  });

  it('session expoe getToken/getUser/isAuthenticated', () => {
    const { session } = createFakeApi();

    expect(session.isAuthenticated()).toBe(true);
    expect(session.getToken()).toBeTruthy();
    expect(session.getUser()).toEqual(expect.objectContaining({ email: expect.any(String) }));
  });
});
