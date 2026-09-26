import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountPage, cleanupPages } from '@yper/test-utils';
import { flushPromises } from '@vue/test-utils';
import { currency, date } from '@yper/i18n';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';

import Dashboard from '../../src/pages/Dashboard.vue';

const UPCOMING = [
  {
    _id: 'o1', customer: { _id: 'c1', name: 'Maria Silva' }, recipe: { _id: 'r1', name: 'Bolo de Chocolate' },
    deliveryDate: '2024-05-20T12:00:00.000Z', status: 'in_production', paidPrice: 150,
  },
  {
    _id: 'o2', customer: null, recipe: null,
    deliveryDate: '2024-05-22T12:00:00.000Z', status: 'new', paidPrice: null,
  },
];

const DASHBOARD = {
  activeOrders: 5,
  revenueThisMonth: 1234.5,
  upcomingDeadlines: UPCOMING,
  pendingOrders: [UPCOMING[1], { _id: 'o3', status: 'new' }],
  ingredientAlerts: [
    { ingredient: { _id: 'i3', name: 'Chocolate Amargo', unit: 'kg' }, currentStock: 0, projectedStock: -1.5, severity: 'critical' },
    { ingredient: { _id: 'i2', name: 'Leite Condensado', unit: 'L' }, currentStock: 3, projectedStock: 2, severity: 'low' },
  ],
};

async function mountDashboard(route = '/home') {
  return mountPage(Dashboard, { messages: ptBR, api: client, route });
}

afterEach(cleanupPages);

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (path) => {
    if (path === '/dashboard') return structuredClone(DASHBOARD);
    return [];
  });
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('Dashboard', () => {
  it('carrega o painel e mostra os KPIs', async () => {
    const { wrapper } = await mountDashboard();

    expect(api.get).toHaveBeenCalledWith('/dashboard');

    const kpis = wrapper.findAll('.kpi');
    expect(kpis).toHaveLength(4);
    expect(kpis[0].text()).toContain('Encomendas ativas');
    expect(kpis[0].find('.kpi-value').text()).toBe('5');
    expect(kpis[1].text()).toContain('Faturamento do mês');
    expect(kpis[1].find('.kpi-value').text()).toBe(currency(1234.5));
    expect(kpis[2].text()).toContain('Próximos 7 dias');
    expect(kpis[2].find('.kpi-value').text()).toBe('2');
    expect(kpis[3].text()).toContain('Pendentes (novas)');
    expect(kpis[3].find('.kpi-value').text()).toBe('2');
  });

  it('lista as proximas encomendas com cliente, receita, entrega, status e valor', async () => {
    const { wrapper } = await mountDashboard();
    const rows = wrapper.findAll('[data-test="upcoming"] tbody tr');
    expect(rows).toHaveLength(2);

    const cellsA = rows[0].findAll('td');
    expect(cellsA[0].text()).toContain('MA');
    expect(cellsA[0].text()).toContain('Maria Silva');
    expect(cellsA[1].text()).toContain('Bolo de Chocolate');
    expect(cellsA[2].text()).toContain(date('2024-05-20T12:00:00.000Z'));
    expect(cellsA[3].text()).toContain('Em produção');
    expect(cellsA[3].find('.badge').classes()).toContain('badge-accent');
    expect(cellsA[4].text()).toContain(currency(150));

    const cellsB = rows[1].findAll('td');
    expect(cellsB[0].text()).toContain('?');
    expect(cellsB[0].text()).toContain('—');
    expect(cellsB[1].text()).toContain('—');
    expect(cellsB[3].text()).toContain('Nova');
    expect(cellsB[4].text()).toContain(currency(0));
  });

  it('link "ver todas" leva para a lista de encomendas', async () => {
    const { wrapper } = await mountDashboard();

    const link = wrapper.find('[data-test="upcoming"] a');
    expect(link.text()).toBe('Ver todas');
    expect(link.attributes('href')).toBe('/orders');
  });

  it('botao "nova encomenda" navega para /orders', async () => {
    const { wrapper, router } = await mountDashboard();

    await wrapper.findAll('button').find((btn) => btn.text().includes('Nova encomenda')).trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/orders');
  });

  it('mostra os alertas de ingredientes por severidade', async () => {
    const { wrapper } = await mountDashboard();
    const items = wrapper.findAll('[data-test="alerts"] li');
    expect(items).toHaveLength(2);

    expect(items[0].text()).toContain('Chocolate Amargo');
    expect(items[0].text()).toContain('Estoque: 0 kg · Projetado: -1.50 kg');
    expect(items[0].text()).toContain('Crítico');
    expect(items[0].find('.badge').classes()).toContain('badge-danger');
    expect(items[0].text()).toContain('error');

    expect(items[1].text()).toContain('Leite Condensado');
    expect(items[1].text()).toContain('Estoque: 3 L · Projetado: 2.00 L');
    expect(items[1].text()).toContain('Estoque baixo');
    expect(items[1].find('.badge').classes()).toContain('badge-warn');
    expect(items[1].text()).toContain('warning');
  });

  it('mostra mensagens vazias quando nao ha prazos nem alertas', async () => {
    api.get.mockImplementation(async () => ({
      activeOrders: 0, revenueThisMonth: 0, upcomingDeadlines: [], pendingOrders: [], ingredientAlerts: [],
    }));

    const { wrapper } = await mountDashboard();

    expect(wrapper.text()).toContain('Nenhuma encomenda nos próximos 7 dias.');
    expect(wrapper.text()).toContain('Todos os ingredientes estão OK.');
    expect(wrapper.findAll('.kpi-value').map((kpi) => kpi.text())).toEqual(['0', currency(0), '0', '0']);
  });

  it('erro ao carregar o painel mostra alerta traduzido e mantem os valores zerados', async () => {
    api.get.mockImplementation(async () => {
      throw { code: 'NETWORK' };
    });

    const { wrapper } = await mountDashboard();

    expect(window.alert).toHaveBeenCalledWith('Não foi possível falar com o servidor. Tente de novo.');
    expect(wrapper.findAll('.kpi-value').map((kpi) => kpi.text())).toEqual(['0', currency(0), '0', '0']);
  });
});
