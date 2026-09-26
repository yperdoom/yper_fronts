import { describe, it, expect, beforeEach } from 'vitest';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createAuthGuard } from '@yper/auth';
import { routes } from '../src/router.js';
import { session } from '../src/api.js';

function makeRouter() {
  const router = createRouter({ history: createMemoryHistory(), routes });
  router.beforeEach(createAuthGuard({ isAuthenticated: session.isAuthenticated, homeRoute: 'Today' }));
  return router;
}

beforeEach(() => {
  localStorage.clear();
});

describe('router', () => {
  it.each([
    ['/home', 'Today'],
    ['/workouts', 'Workouts'],
    ['/exercises', 'Exercises'],
    ['/history', 'History'],
    ['/nutrition', 'Nutrition'],
    ['/foods', 'Foods'],
    ['/measurements', 'Measurements'],
    ['/profile', 'Profile'],
  ])('resolve %s na rota %s', async (path, name) => {
    localStorage.setItem('yper_token', 'tok');
    const router = makeRouter();
    router.push(path);
    await router.isReady();
    expect(router.currentRoute.value.name).toBe(name);
  });

  it('caminho desconhecido redireciona para /home', async () => {
    localStorage.setItem('yper_token', 'tok');
    const router = makeRouter();
    router.push('/qualquer');
    await router.isReady();
    expect(router.currentRoute.value.path).toBe('/home');
  });

  it('sem sessao, /workouts redireciona para Login com redirect=/workouts', async () => {
    const router = makeRouter();
    router.push('/workouts');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('Login');
    expect(router.currentRoute.value.query.redirect).toBe('/workouts');
  });

  it('com sessao, / vai para Today', async () => {
    localStorage.setItem('yper_token', 'tok');
    const router = makeRouter();
    router.push('/');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('Today');
  });

  it('sem sessao, / resolve na rota Login', async () => {
    const router = makeRouter();
    router.push('/');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('Login');
  });
});
