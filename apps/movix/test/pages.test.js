import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createAppI18n } from '@yper/i18n';
import { createShell } from '@yper/ui';

import { routes } from '../src/router.js';
import { NAV, APP_NAME } from '../src/nav.js';
import ptBR from '../src/locales/pt-BR.json';

vi.mock('@/api', () => {
  const api = {
    get: vi.fn(async (path) => {
      if (path.startsWith('/dashboard')) {
        return {
          totalProducts: 0,
          stockValue: 0,
          purchasesThisMonth: 0,
          salesThisMonth: 0,
          invoicesThisMonth: 0,
          lowStock: [],
          recentMovements: [],
        };
      }
      if (path.startsWith('/products')) return { products: [] };
      if (path.startsWith('/movements')) return { movements: [] };
      if (path.startsWith('/invoices')) return { invoices: [] };
      if (path.startsWith('/suppliers')) return { suppliers: [] };
      return {};
    }),
    post: vi.fn(async () => ({})),
    put: vi.fn(async () => ({})),
    del: vi.fn(async () => ({})),
  };
  const auth = {
    logout: vi.fn(),
    login: vi.fn(),
    setup: vi.fn(),
    status: vi.fn(async () => ({ initialized: true })),
    me: vi.fn(),
  };
  const session = {
    getUser: () => ({ email: 'user@movix.dev' }),
    getToken: () => 'tok',
    isAuthenticated: () => true,
  };
  const client = { api, auth, session };
  return { api, auth, session, default: client };
});

const Dashboard = (await import('../src/pages/Dashboard.vue')).default;
const Products = (await import('../src/pages/Products.vue')).default;
const Movements = (await import('../src/pages/Movements.vue')).default;
const Invoices = (await import('../src/pages/Invoices.vue')).default;
const Suppliers = (await import('../src/pages/Suppliers.vue')).default;
const client = (await import('@/api')).default;

function makeRouter() {
  return createRouter({ history: createMemoryHistory(), routes });
}

async function mountPage(Component) {
  const router = makeRouter();
  router.push('/home');
  await router.isReady();

  const i18n = createAppI18n({ messages: { 'pt-BR': ptBR } });
  const shell = createShell({ appName: APP_NAME, nav: NAV, api: client });

  const wrapper = mount(Component, {
    global: { plugins: [router, i18n, shell] },
  });
  await flushPromises();
  return wrapper;
}

describe('pages (smoke)', () => {
  it.each([
    ['Dashboard', Dashboard],
    ['Products', Products],
    ['Movements', Movements],
    ['Invoices', Invoices],
    ['Suppliers', Suppliers],
  ])('%s monta sem lancar erro', async (_name, Component) => {
    const wrapper = await mountPage(Component);
    expect(wrapper.exists()).toBe(true);
  });
});
