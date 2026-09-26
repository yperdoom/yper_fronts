import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountPage } from '@yper/test-utils';
import { DOMWrapper, flushPromises } from '@vue/test-utils';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';

import Movements from '../../src/pages/Movements.vue';

const PRODUCTS = [
  { _id: 'p1', name: 'Arroz', unit: 'kg', currentStock: 50 },
  { _id: 'p2', name: 'Feijão', unit: 'kg', currentStock: 20 },
];

const MOVEMENTS = [
  {
    _id: 'm1', occurredAt: '2024-03-05T10:00:00Z', product: { _id: 'p1', name: 'Arroz', sku: 'AR1' },
    type: 'in', delta: 10, balanceAfter: 50, invoice: null, reason: 'compra',
  },
  {
    _id: 'm2', occurredAt: '2024-03-06T10:00:00Z', product: { _id: 'p2', name: 'Feijão' },
    type: 'out', delta: -5, balanceAfter: 15, invoice: { number: '123', series: '1' }, reason: null,
  },
];

let activeWrapper;

async function mountMovements(route = '/movimentacoes') {
  const ctx = await mountPage(Movements, { messages: ptBR, api: client, route });
  activeWrapper = ctx.wrapper;
  return ctx;
}

afterEach(() => {
  activeWrapper?.unmount();
  activeWrapper = undefined;
});

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (path) => {
    if (path.startsWith('/movements')) return { movements: structuredClone(MOVEMENTS) };
    if (path === '/products') return { products: structuredClone(PRODUCTS) };
    return [];
  });
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('Movements', () => {
  it('carrega movimentacoes e produtos, renderiza a tabela', async () => {
    const { wrapper } = await mountMovements();

    expect(api.get).toHaveBeenCalledWith('/movements');
    expect(api.get).toHaveBeenCalledWith('/products');

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(wrapper.text()).toContain('2 lançamento(s)');
  });

  it('mostra o tipo e a variacao com o sinal correto', async () => {
    const { wrapper } = await mountMovements();

    const rows = wrapper.findAll('tbody tr');
    expect(rows[0].text()).toContain('Entrada');
    expect(rows[0].find('.badge').classes()).toContain('badge-ok');
    expect(rows[0].text()).toContain('+10');

    expect(rows[1].text()).toContain('Saída');
    expect(rows[1].find('.badge').classes()).toContain('badge-danger');
    expect(rows[1].text()).toContain('-5');
  });

  it('mostra a referencia da nota quando existe, e o motivo quando nao existe', async () => {
    const { wrapper } = await mountMovements();

    const rows = wrapper.findAll('tbody tr');
    expect(rows[0].text()).toContain('compra');
    expect(rows[1].text()).toContain('NF 123/1');
  });

  it('filtra por produto e recarrega com a query certa', async () => {
    const { wrapper } = await mountMovements();
    vi.clearAllMocks();
    api.get.mockImplementation(async (path) => {
      if (path.startsWith('/movements')) return { movements: [] };
      return { products: PRODUCTS };
    });

    await wrapper.find('select').setValue('p1');

    expect(api.get).toHaveBeenCalledWith('/movements?product=p1');
    expect(api.get).not.toHaveBeenCalledWith('/products'); // so o load, nao loadProducts
  });

  it('filtra por tipo e combina com o filtro de produto', async () => {
    const { wrapper } = await mountMovements();
    const selects = wrapper.findAll('select');

    await selects[0].setValue('p1');
    await selects[1].setValue('out');

    expect(api.get).toHaveBeenCalledWith('/movements?product=p1&type=out');
  });

  it('ao chegar de /produtos com ?produto=X, filtra e abre o formulario com o produto selecionado', async () => {
    const { wrapper } = await mountMovements('/movimentacoes?produto=p2');
    const body = new DOMWrapper(document.body);

    expect(api.get).toHaveBeenCalledWith('/movements?product=p2');
    expect(body.find('[role="dialog"]').exists()).toBe(true);
    expect(body.find('#product').element.value).toBe('p2');
    expect(wrapper.find('select').element.value).toBe('p2');
  });

  it('lanca uma movimentacao nova com os dados do formulario', async () => {
    const { wrapper } = await mountMovements();
    const body = new DOMWrapper(document.body);

    await wrapper.findAll('button').find((btn) => btn.text().includes('Lançar')).trigger('click');

    await body.find('#product').setValue('p1');
    await body.find('#type').setValue('in');
    await body.find('#quantity').setValue('15');
    await body.find('#unitCost').setValue('2.5');
    await body.find('#reason').setValue('compra extra');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/movements', {
      product: 'p1', type: 'in', quantity: 15, unitCost: 2.5, reason: 'compra extra',
    });
    expect(body.find('[role="dialog"]').exists()).toBe(false);
  });

  it('troca o rotulo e a nota ao selecionar o tipo ajuste', async () => {
    const { wrapper } = await mountMovements();
    const body = new DOMWrapper(document.body);

    await wrapper.findAll('button').find((btn) => btn.text().includes('Lançar')).trigger('click');
    await body.find('#type').setValue('adjustment');

    expect(body.find('label[for="quantity"]').text()).toBe('Novo saldo');
    expect(body.text()).toContain('No ajuste, informe o saldo que o produto passa a ter.');
  });

  it('erro ao carregar movimentacoes mostra alerta traduzido', async () => {
    api.get.mockImplementation(async (path) => {
      if (path.startsWith('/movements')) throw { code: 'UNAUTHORIZED' };
      return { products: [] };
    });

    await mountMovements();

    expect(window.alert).toHaveBeenCalledWith('Sessão expirada. Faça login novamente.');
  });

  it('erro ao lancar mostra a mensagem do erro', async () => {
    const { wrapper } = await mountMovements();
    const body = new DOMWrapper(document.body);
    api.post.mockRejectedValueOnce({ message: 'Quantidade invalida' });

    await wrapper.findAll('button').find((btn) => btn.text().includes('Lançar')).trigger('click');
    await body.find('#product').setValue('p1');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith('Quantidade invalida');
  });
});
