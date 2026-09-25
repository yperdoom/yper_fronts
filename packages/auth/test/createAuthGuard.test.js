import { describe, it, expect, vi } from 'vitest';
import { createAuthGuard } from '../src/createAuthGuard.js';

function makeTo({ public: isPublic = false, fullPath = '/produtos' } = {}) {
  return { meta: { public: isPublic }, fullPath };
}

describe('createAuthGuard', () => {
  it('rota privada sem sessao redireciona para login com o redirect', () => {
    const guard = createAuthGuard({ isAuthenticated: () => false });

    const result = guard(makeTo({ fullPath: '/produtos' }));

    expect(result).toEqual({ name: 'Login', query: { redirect: '/produtos' } });
  });

  it('rota publica com sessao redireciona para home', () => {
    const guard = createAuthGuard({ isAuthenticated: () => true });

    const result = guard(makeTo({ public: true }));

    expect(result).toEqual({ name: 'Home' });
  });

  it('rota privada com sessao libera a navegacao', () => {
    const guard = createAuthGuard({ isAuthenticated: () => true });

    expect(guard(makeTo({ public: false }))).toBe(true);
  });

  it('rota publica sem sessao libera a navegacao', () => {
    const guard = createAuthGuard({ isAuthenticated: () => false });

    expect(guard(makeTo({ public: true }))).toBe(true);
  });

  it('respeita nomes de rota customizados', () => {
    const isAuthenticated = vi.fn().mockReturnValue(false);
    const guard = createAuthGuard({
      isAuthenticated,
      loginRoute: 'Entrar',
      homeRoute: 'Painel',
    });

    expect(guard(makeTo({ public: false, fullPath: '/notas' }))).toEqual({
      name: 'Entrar',
      query: { redirect: '/notas' },
    });

    isAuthenticated.mockReturnValue(true);
    const guardHome = createAuthGuard({
      isAuthenticated,
      loginRoute: 'Entrar',
      homeRoute: 'Painel',
    });

    expect(guardHome(makeTo({ public: true }))).toEqual({ name: 'Painel' });
  });
});
