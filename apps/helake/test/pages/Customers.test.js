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

import Customers from '../../src/pages/Customers.vue';

const CUSTOMERS = [
  {
    _id: 'c1', name: 'Maria Silva', phone: '11999990000', notes: 'Prefere entrega a tarde',
    totalOrders: 12, completedOrders: 8, cancelledOrders: 3, totalSpent: 540.5, lastOrder: '2024-03-10T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    _id: 'c2', name: 'Joao Souza', phone: null, notes: null,
    totalOrders: 0, totalSpent: 0, lastOrder: null,
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

async function mountCustomers(route = '/customers') {
  return mountPage(Customers, { messages: ptBR, api: client, route });
}

function findButtonByTitle(wrapper, title) {
  return wrapper.findAll('.btn-icon').find((btn) => btn.attributes('title') === title);
}

afterEach(cleanupPages);

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (path) => {
    if (path === '/customers') return { customers: structuredClone(CUSTOMERS) };
    return [];
  });
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('Customers', () => {
  it('carrega clientes e renderiza a tabela', async () => {
    const { wrapper } = await mountCustomers();

    expect(api.get).toHaveBeenCalledWith('/customers');

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(wrapper.text()).toContain('2 de 2');
  });

  it('mostra telefone, pedidos, total gasto e ultimo pedido de cada cliente', async () => {
    const { wrapper } = await mountCustomers();
    const rows = wrapper.findAll('tbody tr');

    const cellsA = rows[0].findAll('td');
    expect(cellsA[0].text()).toContain('Maria Silva');
    expect(cellsA[1].text()).toContain('11999990000');
    expect(cellsA[2].text()).toContain('12');
    expect(cellsA[3].text()).toContain(currency(540.5));
    expect(cellsA[4].text()).toContain(date('2024-03-10T00:00:00.000Z'));
    expect(cellsA[5].text()).toBe('8');
    expect(cellsA[6].text()).toBe('3');

    const cellsB = rows[1].findAll('td');
    expect(cellsB[1].text()).toContain('—');
    expect(cellsB[4].text()).toContain('—');
  });

  it('filtra por nome ou telefone', async () => {
    const { wrapper } = await mountCustomers();

    await wrapper.find('input[type="search"]').setValue('999990000');

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toContain('Maria Silva');
    expect(wrapper.text()).toContain('1 de 2');
  });

  it('mostra mensagem de "primeiro cliente" quando a lista esta vazia', async () => {
    api.get.mockImplementation(async () => ({ customers: [] }));

    const { wrapper } = await mountCustomers();

    expect(wrapper.text()).toContain('Cadastre seu primeiro cliente.');
  });

  it('mostra mensagem de filtro sem resultado', async () => {
    const { wrapper } = await mountCustomers();

    await wrapper.find('input[type="search"]').setValue('inexistente');

    expect(wrapper.text()).toContain('Nenhum cliente com esse filtro.');
  });

  it('cria um novo cliente e recarrega a lista', async () => {
    const { wrapper, body } = await mountCustomers();

    await wrapper.findAll('button').find((btn) => btn.text().includes('Novo cliente')).trigger('click');
    expect(body.find('h3').text()).toBe('Novo cliente');

    await body.find('#name').setValue('Ana Paula');
    await body.find('#phone').setValue('11888887777');
    await body.find('#notes').setValue('gosta de chocolate');

    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/customers', {
      name: 'Ana Paula', phone: '11888887777', notes: 'gosta de chocolate',
    });
    expect(api.get).toHaveBeenCalledWith('/customers');
    expect(body.find('[role="dialog"]').exists()).toBe(false);
  });

  it('edita um cliente existente', async () => {
    const { wrapper, body } = await mountCustomers();

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Editar').trigger('click');

    expect(body.find('h3').text()).toBe('Editar cliente');
    expect(body.find('#name').element.value).toBe('Maria Silva');

    await body.find('#phone').setValue('11900001111');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith('/customers/c1', {
      name: 'Maria Silva', phone: '11900001111', notes: 'Prefere entrega a tarde',
    });
  });

  it('remove um cliente quando a confirmacao e aceita', async () => {
    const { wrapper } = await mountCustomers();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Remover').trigger('click');
    await flushPromises();

    expect(window.confirm).toHaveBeenCalledWith('Remover "Maria Silva"?');
    expect(api.del).toHaveBeenCalledWith('/customers/c1');
    expect(api.get).toHaveBeenCalledWith('/customers');
  });

  it('nao remove quando a confirmacao e recusada', async () => {
    const { wrapper } = await mountCustomers();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Remover').trigger('click');
    await flushPromises();

    expect(api.del).not.toHaveBeenCalled();
  });

  it('erro ao carregar clientes mostra alerta traduzido', async () => {
    api.get.mockImplementation(async () => {
      throw { code: 'NETWORK' };
    });

    await mountCustomers();

    expect(window.alert).toHaveBeenCalledWith('Não foi possível falar com o servidor. Tente de novo.');
  });

  it('erro ao salvar mostra a mensagem do erro', async () => {
    const { wrapper, body } = await mountCustomers();
    api.post.mockRejectedValueOnce({ message: 'Telefone invalido' });

    await wrapper.findAll('button').find((btn) => btn.text().includes('Novo cliente')).trigger('click');
    await body.find('#name').setValue('Teste');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith('Telefone invalido');
  });
});
