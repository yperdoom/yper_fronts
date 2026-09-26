import { describe, it, expect, vi } from 'vitest';
import { createAuthGuard } from '../src/createAuthGuard.js';

function makeTo({ public: isPublic = false, admin = false, fullPath = '/produtos' } = {}) {
  return { meta: { public: isPublic, admin }, fullPath };
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

  it('rota admin com sessao de nao-admin redireciona para home', () => {
    const guard = createAuthGuard({ isAuthenticated: () => true, isAdmin: () => false, homeRoute: 'Painel' });

    expect(guard(makeTo({ admin: true, fullPath: '/users' }))).toEqual({ name: 'Painel' });
  });

  it('rota admin com sessao de admin libera a navegacao', () => {
    const guard = createAuthGuard({ isAuthenticated: () => true, isAdmin: () => true });

    expect(guard(makeTo({ admin: true, fullPath: '/users' }))).toBe(true);
  });

  it('rota admin sem isAdmin informado nega o acesso', () => {
    const guard = createAuthGuard({ isAuthenticated: () => true });

    expect(guard(makeTo({ admin: true, fullPath: '/users' }))).toEqual({ name: 'Home' });
  });

  it('rota admin sem sessao vai para o login', () => {
    const guard = createAuthGuard({ isAuthenticated: () => false, isAdmin: () => false });

    expect(guard(makeTo({ admin: true, fullPath: '/users' }))).toEqual({
      name: 'Login',
      query: { redirect: '/users' },
    });
  });
});
