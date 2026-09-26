import { describe, it, expect, vi } from 'vitest';
import { mountPage } from '@yper/test-utils';

import { routes } from '../src/router.js';
import { NAV, APP_NAME } from '../src/nav.js';
import ptBR from '../src/locales/pt-BR.json';

const { fakeApi } = await vi.hoisted(async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const fakeApi = createFakeApi({
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
  });
  return { fakeApi };
});

vi.mock('@/api', () => ({ api: fakeApi.api, auth: fakeApi.auth, session: fakeApi.session, default: fakeApi }));

const Dashboard = (await import('../src/pages/Dashboard.vue')).default;
const Products = (await import('../src/pages/Products.vue')).default;
const Movements = (await import('../src/pages/Movements.vue')).default;
const Invoices = (await import('../src/pages/Invoices.vue')).default;
const Suppliers = (await import('../src/pages/Suppliers.vue')).default;

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
      api: fakeApi,
      route: '/home',
      routes,
      appName: APP_NAME,
      nav: NAV,
    });
    expect(wrapper.exists()).toBe(true);
  });
});
