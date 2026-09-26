import { vi } from 'vitest';

/**
 * Fake do client de api/auth/session usado pelas paginas, no formato de
 * `@yper/api-client` (`{ api, auth, session }`).
 *
 * Lookup de `responses`:
 * - `api.get(path)` resolve `responses[path]`, ou `[]` se ausente.
 * - `api.post/put/del(path)` resolve `responses['METHOD path']` (ex: `'POST /produtos'`),
 *   ou `{}` se ausente.
 *
 * Todos os metodos sao `vi.fn()`.
 */
export function createFakeApi(responses = {}) {
  const api = {
    get: vi.fn(async (path) => responses[path] ?? []),
    post: vi.fn(async (path) => responses[`POST ${path}`] ?? {}),
    put: vi.fn(async (path) => responses[`PUT ${path}`] ?? {}),
    del: vi.fn(async (path) => responses[`DELETE ${path}`] ?? {}),
  };

  const auth = {
    logout: vi.fn(),
    login: vi.fn(),
    setup: vi.fn(),
    status: vi.fn(async () => ({ initialized: true })),
    me: vi.fn(),
  };

  const session = {
    getToken: () => 'tok',
    getUser: () => ({ email: 'user@test.dev' }),
    isAuthenticated: () => true,
  };

  return { api, auth, session };
}
