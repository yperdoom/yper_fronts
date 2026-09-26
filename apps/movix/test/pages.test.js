import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountPage } from '@yper/test-utils';

import { routes } from '../src/router.js';
import { NAV, APP_NAME } from '../src/nav.js';
import ptBR from '../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';

import Dashboard from '../src/pages/Dashboard.vue';
import Products from '../src/pages/Products.vue';
import Movements from '../src/pages/Movements.vue';
import Invoices from '../src/pages/Invoices.vue';
import Suppliers from '../src/pages/Suppliers.vue';

const RESPONSES = {
  '/dashboard': {
    totalProducts: 0,
    stockValue: 0,
    purchasesThisMonth: 0,
    salesThisMonth: 0,
    invoicesThisMonth: 0,
    lowStock: [],
    recentMovements: [],
  },
  '/products': { products: [] },
  '/movements': { movements: [] },
  '/invoices': { invoices: [] },
  '/suppliers': { suppliers: [] },
};

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (path) => RESPONSES[path] ?? []);
});

describe('pages (smoke)', () => {
  it.each([
    ['Dashboard', Dashboard],
    ['Products', Products],
    ['Movements', Movements],
    ['Invoices', Invoices],
    ['Suppliers', Suppliers],
  ])('%s monta sem lancar erro', async (_name, Component) => {
    const { wrapper } = await mountPage(Component, {
      messages: ptBR,
      api: client,
      route: '/home',
      routes,
      appName: APP_NAME,
      nav: NAV,
    });
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });
});
