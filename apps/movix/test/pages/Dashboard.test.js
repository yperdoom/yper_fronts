import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountPage, cleanupPages } from '@yper/test-utils';
import { currency } from '@yper/i18n';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';

import Dashboard from '../../src/pages/Dashboard.vue';

const DATA = {
  totalProducts: 12,
  stockValue: 1500.5,
  purchasesThisMonth: 300,
  salesThisMonth: 800,
  invoicesThisMonth: 4,
  lowStock: [
    { _id: 'p1', name: 'Arroz', sku: 'AR1', currentStock: 2, minimumStock: 10, unit: 'kg' },
    { _id: 'p2', name: 'Sal', currentStock: 0, minimumStock: 5, unit: 'kg' },
  ],
  recentMovements: [
    { _id: 'm1', occurredAt: '2024-03-05T10:00:00Z', product: { name: 'Arroz' }, delta: 5, balanceAfter: 20 },
    { _id: 'm2', occurredAt: '2024-03-06T10:00:00Z', product: null, delta: -3, balanceAfter: 17 },
  ],
};

async function mountDashboard(route = '/home') {
  return mountPage(Dashboard, { messages: ptBR, api: client, route });
}

afterEach(cleanupPages);

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async () => structuredClone(DATA));
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('Dashboard', () => {
  it('carrega o dashboard e renderiza os KPIs', async () => {
    const { wrapper } = await mountDashboard();

    expect(api.get).toHaveBeenCalledWith('/dashboard');
    expect(api.get).toHaveBeenCalledTimes(1);

    const text = wrapper.text();
    expect(text).toContain('12');
    expect(text).toContain(currency(1500.5));
    expect(text).toContain(currency(300));
    expect(text).toContain(currency(800));
    expect(text).toContain('4 nota(s) confirmada(s)');
  });

  it('renderiza a tabela de produtos abaixo do minimo com o badge correto', async () => {
    const { wrapper } = await mountDashboard();

    const rows = wrapper.findAll('tbody')[0].findAll('tr');
    expect(rows).toHaveLength(2);

    // Sal tem estoque zerado -> badge de perigo; Arroz ainda tem saldo -> badge de alerta.
    expect(rows[0].find('.badge').classes()).toContain('badge-warn');
    expect(rows[1].find('.badge').classes()).toContain('badge-danger');

    // Reposicao = minimo - atual
    expect(rows[0].text()).toContain('8');
    expect(rows[1].text()).toContain('5');
  });

  it('renderiza a tabela de movimentacoes recentes com badges de entrada/saida', async () => {
    const { wrapper } = await mountDashboard();

    const tables = wrapper.findAll('table.data');
    const rows = tables[1].findAll('tbody tr');
    expect(rows).toHaveLength(2);

    expect(rows[0].text()).toContain('Arroz');
    expect(rows[0].text()).toContain('+5');
    expect(rows[0].find('.badge').classes()).toContain('badge-ok');

    expect(rows[1].text()).toContain('—');
    expect(rows[1].text()).toContain('-3');
    expect(rows[1].find('.badge').classes()).toContain('badge-danger');
  });

  it('mostra mensagens de vazio quando nao ha dados', async () => {
    api.get.mockImplementation(async () => ({
      totalProducts: 0,
      stockValue: 0,
      purchasesThisMonth: 0,
      salesThisMonth: 0,
      invoicesThisMonth: 0,
      lowStock: [],
      recentMovements: [],
    }));

    const { wrapper } = await mountDashboard();

    expect(wrapper.text()).toContain('Nenhum produto abaixo do mínimo.');
    expect(wrapper.text()).toContain('Nenhuma movimentação registrada.');
  });

  it('o link "ver tudo" aponta para /movimentacoes', async () => {
    const { wrapper } = await mountDashboard();

    const link = wrapper.findAll('a').find((a) => a.text() === 'ver tudo');
    expect(link.attributes('href')).toBe('/movimentacoes');
  });

  it('erro ao carregar mostra alerta com a mensagem traduzida', async () => {
    api.get.mockRejectedValueOnce({ code: 'NETWORK' });

    await mountDashboard();

    expect(window.alert).toHaveBeenCalledWith('Não foi possível falar com o servidor. Tente de novo.');
  });
});
