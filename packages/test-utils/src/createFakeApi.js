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
 * `auth.users.list()` resolve `{ users: [] }`; os demais metodos de `auth.users`
 * e `auth.changePassword` resolvem `{}`.
 *
 * Todos os metodos de api/auth sao `vi.fn()`; `session.isAdmin` tambem (false por padrao).
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
    changePassword: vi.fn(async () => ({})),
    users: {
      list: vi.fn(async () => ({ users: [] })),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
      setPassword: vi.fn(async () => ({})),
      remove: vi.fn(async () => ({})),
    },
  };

  const session = {
    getToken: () => 'tok',
    getUser: () => ({ email: 'user@test.dev' }),
    isAuthenticated: () => true,
    isAdmin: vi.fn(() => false),
  };

  return { api, auth, session };
}
