import { describe, it, expect, beforeEach } from 'vitest';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createAuthGuard } from '@yper/auth';
import { routes } from '../src/router.js';
import { session } from '../src/api.js';

function makeRouter() {
  const router = createRouter({ history: createMemoryHistory(), routes });
  router.beforeEach(
    createAuthGuard({ isAuthenticated: session.isAuthenticated, isAdmin: session.isAdmin, homeRoute: 'Dashboard' }),
  );
  return router;
}

beforeEach(() => {
  localStorage.clear();
});

describe('router', () => {
  it.each([
    ['/home', 'Dashboard'],
    ['/products', 'Products'],
    ['/movements', 'Movements'],
    ['/invoices', 'Invoices'],
    ['/suppliers', 'Suppliers'],
  ])('resolve %s na rota %s', async (path, name) => {
    localStorage.setItem('movix_token', 'tok');
    const router = makeRouter();
    router.push(path);
    await router.isReady();
    expect(router.currentRoute.value.name).toBe(name);
  });

  it('caminho desconhecido redireciona para /home', async () => {
    localStorage.setItem('movix_token', 'tok');
    const router = makeRouter();
    router.push('/qualquer');
    await router.isReady();
    expect(router.currentRoute.value.path).toBe('/home');
  });

  it('sem sessao, /products redireciona para Login com redirect=/products', async () => {
    const router = makeRouter();
    router.push('/products');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('Login');
    expect(router.currentRoute.value.query.redirect).toBe('/products');
  });

  it('com sessao, / vai para Dashboard', async () => {
    localStorage.setItem('movix_token', 'tok');
    const router = makeRouter();
    router.push('/');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('Dashboard');
  });

  it('sem sessao, / resolve na rota Login', async () => {
    const router = makeRouter();
    router.push('/');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('Login');
  });

  it('admin acessa /users', async () => {
    localStorage.setItem('movix_token', 'tok');
    localStorage.setItem('movix_user', JSON.stringify({ role: 'admin' }));
    const router = makeRouter();
    router.push('/users');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('Users');
  });

  it('usuario logado nao-admin tentando /users e redirecionado para Dashboard', async () => {
    localStorage.setItem('movix_token', 'tok');
    localStorage.setItem('movix_user', JSON.stringify({ role: 'employee' }));
    const router = makeRouter();
    router.push('/users');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('Dashboard');
  });

  it('sem sessao, /users redireciona para Login', async () => {
    const router = makeRouter();
    router.push('/users');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('Login');
  });

  it('qualquer usuario logado acessa /account/password', async () => {
    localStorage.setItem('movix_token', 'tok');
    localStorage.setItem('movix_user', JSON.stringify({ role: 'employee' }));
    const router = makeRouter();
    router.push('/account/password');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('ChangePassword');
  });

  it('sem sessao, /account/password redireciona para Login', async () => {
    const router = makeRouter();
    router.push('/account/password');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('Login');
  });
});
