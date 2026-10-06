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

import Orders from '../../src/pages/Orders.vue';

const CUSTOMERS = [
  { _id: 'c1', name: 'Maria Silva' },
  { _id: 'c2', name: 'Joao Souza' },
];

const RECIPES = [
  { _id: 'r1', name: 'Bolo de Chocolate' },
  { _id: 'r2', name: 'Brigadeiro' },
];

const ORDERS = [
  {
    _id: 'o1', customer: { _id: 'c1', name: 'Maria Silva' }, recipe: { _id: 'r1', name: 'Bolo de Chocolate' },
    quantity: 2, deliveryDate: '2024-05-20T12:00:00.000Z', paidPrice: 150, notes: 'Sem lactose',
    status: 'in_production', createdAt: '2024-05-01T00:00:00.000Z', updatedAt: '2024-05-02T00:00:00.000Z',
  },
  {
    _id: 'o2', customer: null, recipe: null,
    quantity: 1, deliveryDate: null, paidPrice: null, notes: '',
    status: 'cancelled', createdAt: '2024-05-01T00:00:00.000Z', updatedAt: '2024-05-02T00:00:00.000Z',
  },
];

async function mountOrders(route = '/orders') {
  return mountPage(Orders, { messages: ptBR, api: client, route });
}

function findButtonByTitle(wrapper, title) {
  return wrapper.findAll('.btn-icon').find((btn) => btn.attributes('title') === title);
}

function openNewOrder(wrapper) {
  return wrapper.findAll('button').find((btn) => btn.text().includes('Nova encomenda')).trigger('click');
}

afterEach(cleanupPages);

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (path) => {
    if (path === '/orders') return { orders: structuredClone(ORDERS) };
    if (path === '/customers') return { customers: structuredClone(CUSTOMERS) };
    if (path === '/recipes') return { recipes: structuredClone(RECIPES) };
    return [];
  });
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('Orders', () => {
  it('cadastra e seleciona cliente sem perder o rascunho do pedido', async () => {
    const { wrapper, body } = await mountOrders();
    await openNewOrder(wrapper);
    await body.find('#recipe').setValue('r2');
    await body.find('#quantity').setValue(4);
    await body.find('#notes').setValue('Entrega especial');
    await body.findAll('button').find(b => b.text() === 'Novo cliente').trigger('click');
    await body.find('#newCustomerName').setValue('Ana');
    await body.find('#newCustomerPhone').setValue('12345');
    api.post.mockResolvedValueOnce({ customer: { _id: 'c3', name: 'Ana', phone: '12345', notes: '' } });
    await body.find('form').trigger('submit');
    await flushPromises();
    expect(api.post).toHaveBeenCalledWith('/customers', { name: 'Ana', phone: '12345', notes: '' });
    expect(body.find('#customer').element.value).toBe('c3');
    expect(body.find('#recipe').element.value).toBe('r2');
    expect(body.find('#quantity').element.value).toBe('4');
    expect(body.find('#notes').element.value).toBe('Entrega especial');
    expect(api.post).not.toHaveBeenCalledWith('/orders', expect.anything());
  });

  it('cancelar ou falhar no cadastro de cliente preserva a encomenda', async () => {
    const { wrapper, body } = await mountOrders();
    await openNewOrder(wrapper);
    await body.find('#notes').setValue('Rascunho');
    await body.findAll('button').find(b => b.text() === 'Novo cliente').trigger('click');
    await body.find('#newCustomerName').setValue('Ana');
    api.post.mockRejectedValueOnce(new Error('Falha ao cadastrar'));
    await body.find('form').trigger('submit');
    await flushPromises();
    expect(body.find('#newCustomerName').element.value).toBe('Ana');
    await body.findAll('button').find(b => b.text() === 'Cancelar').trigger('click');
    expect(body.find('#notes').element.value).toBe('Rascunho');
  });
  it('carrega encomendas, clientes e receitas e renderiza a tabela', async () => {
    const { wrapper } = await mountOrders();

    expect(api.get).toHaveBeenCalledWith('/orders');
    expect(api.get).toHaveBeenCalledWith('/customers');
    expect(api.get).toHaveBeenCalledWith('/recipes');
    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
  });

  it('mostra cliente, receita, quantidade, entrega, status e valor de cada encomenda', async () => {
    const { wrapper } = await mountOrders();
    const rows = wrapper.findAll('tbody tr');

    const cellsA = rows[0].findAll('td');
    expect(cellsA[0].text()).toContain('MA');
    expect(cellsA[0].text()).toContain('Maria Silva');
    expect(cellsA[1].text()).toContain('Bolo de Chocolate');
    expect(cellsA[2].text()).toContain('2');
    expect(cellsA[3].text()).toContain(date('2024-05-20T12:00:00.000Z'));
    expect(cellsA[4].find('select').element.value).toBe('in_production');
    expect(cellsA[5].text()).toContain(currency(150));

    const cellsB = rows[1].findAll('td');
    expect(cellsB[0].text()).toContain('?');
    expect(cellsB[0].text()).toContain('—');
    expect(cellsB[1].text()).toContain('—');
    expect(cellsB[3].text()).toContain('—');
    expect(cellsB[5].text()).toContain(currency(0));
  });

  it('lista os status traduzidos mantendo os valores em ingles e colore pelo status', async () => {
    const { wrapper } = await mountOrders();
    const rows = wrapper.findAll('tbody tr');
    const options = rows[0].findAll('select option');

    expect(options.map((o) => o.attributes('value'))).toEqual([
      'new', 'in_production', 'ready', 'delivered', 'cancelled',
    ]);
    expect(options.map((o) => o.text())).toEqual(['Nova', 'Em produção', 'Pronta', 'Entregue', 'Cancelada']);
    expect(rows[0].find('select').classes()).toContain('badge-accent');
    expect(rows[1].find('select').classes()).toContain('badge-danger');
  });

  it('mostra mensagem quando nao ha encomendas', async () => {
    api.get.mockImplementation(async (path) => {
      if (path === '/orders') return { orders: [] };
      if (path === '/customers') return { customers: [] };
      return { recipes: [] };
    });

    const { wrapper } = await mountOrders();

    expect(wrapper.text()).toContain('Nenhuma encomenda ainda. Crie a primeira!');
  });

  it('troca o status da encomenda e recarrega a lista', async () => {
    const { wrapper } = await mountOrders();
    api.get.mockClear();

    await wrapper.findAll('tbody tr')[0].find('select').setValue('ready');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith('/orders/o1', { status: 'ready' });
    expect(api.get).toHaveBeenCalledWith('/orders');
  });

  it('erro ao trocar status mostra alerta e nao recarrega', async () => {
    const { wrapper } = await mountOrders();
    api.get.mockClear();
    api.put.mockRejectedValueOnce({ message: 'Status invalido' });

    await wrapper.findAll('tbody tr')[0].find('select').setValue('delivered');
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith('Status invalido');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('cria uma nova encomenda e recarrega a lista', async () => {
    const { wrapper, body } = await mountOrders();
    api.get.mockClear();

    await openNewOrder(wrapper);
    expect(body.find('h3').text()).toBe('Nova encomenda');

    const customerOptions = body.findAll('#customer option');
    expect(customerOptions.map((o) => o.text())).toEqual(['— Selecione o cliente —', 'Maria Silva', 'Joao Souza']);
    expect(body.findAll('#recipe option').map((o) => o.text())).toEqual([
      '— Selecione a receita —', 'Bolo de Chocolate', 'Brigadeiro',
    ]);
    expect(body.find('#customer').attributes('required')).toBeDefined();
    expect(body.find('#recipe').attributes('required')).toBeDefined();
    expect(body.find('#deliveryDate').attributes('required')).toBeDefined();
    expect(body.find('#quantity').element.value).toBe('1');

    await body.find('#customer').setValue('c2');
    await body.find('#recipe').setValue('r2');
    await body.find('#quantity').setValue('50');
    await body.find('#deliveryDate').setValue('2024-06-01');
    await body.find('#paidPrice').setValue('120.5');
    await body.find('#notes').setValue('Festa infantil');

    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/orders', {
      customer: 'c2', recipe: 'r2', quantity: 50, deliveryDate: '2024-06-01',
      paidPrice: 120.5, notes: 'Festa infantil',
    });
    expect(api.get).toHaveBeenCalledWith('/orders');
    expect(body.find('[role="dialog"]').exists()).toBe(false);
  });

  it('edita uma encomenda existente enviando apenas os campos do formulario', async () => {
    const { wrapper, body } = await mountOrders();

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Editar').trigger('click');

    expect(body.find('h3').text()).toBe('Editar encomenda');
    expect(body.find('#customer').element.value).toBe('c1');
    expect(body.find('#recipe').element.value).toBe('r1');
    expect(body.find('#deliveryDate').element.value).toBe('2024-05-20');

    await body.find('#paidPrice').setValue('180');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith('/orders/o1', {
      customer: 'c1', recipe: 'r1', quantity: 2, deliveryDate: '2024-05-20',
      paidPrice: 180, notes: 'Sem lactose',
    });
  });

  it('edita encomenda sem cliente, receita ou data usando valores vazios', async () => {
    const { wrapper, body } = await mountOrders();

    await findButtonByTitle(wrapper.findAll('tbody tr')[1], 'Editar').trigger('click');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith('/orders/o2', {
      customer: '', recipe: '', quantity: 1, deliveryDate: '', paidPrice: 0, notes: '',
    });
  });

  it('remove uma encomenda quando a confirmacao e aceita', async () => {
    const { wrapper } = await mountOrders();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.get.mockClear();

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Remover').trigger('click');
    await flushPromises();

    expect(window.confirm).toHaveBeenCalledWith('Remover "Maria Silva — Bolo de Chocolate"?');
    expect(api.del).toHaveBeenCalledWith('/orders/o1');
    expect(api.get).toHaveBeenCalledWith('/orders');
  });

  it('nao remove quando a confirmacao e recusada', async () => {
    const { wrapper } = await mountOrders();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Remover').trigger('click');
    await flushPromises();

    expect(api.del).not.toHaveBeenCalled();
  });

  it('erro ao remover mostra alerta', async () => {
    const { wrapper } = await mountOrders();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.del.mockRejectedValueOnce({ message: 'Nao encontrado' });

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Remover').trigger('click');
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith('Nao encontrado');
  });

  it('erro ao carregar encomendas mostra alerta traduzido', async () => {
    api.get.mockImplementation(async () => {
      throw { code: 'NETWORK' };
    });

    await mountOrders();

    expect(window.alert).toHaveBeenCalledWith('Não foi possível falar com o servidor. Tente de novo.');
  });

  it('falha ao carregar clientes/receitas nao impede a lista de encomendas', async () => {
    api.get.mockImplementation(async (path) => {
      if (path === '/orders') return { orders: structuredClone(ORDERS) };
      throw { message: 'boom' };
    });

    const { wrapper, body } = await mountOrders();

    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
    await openNewOrder(wrapper);
    expect(body.findAll('#customer option')).toHaveLength(1);
  });

  it('erro ao salvar mostra a mensagem do erro e mantem o modal aberto', async () => {
    const { wrapper, body } = await mountOrders();
    api.post.mockRejectedValueOnce({ message: 'Cliente obrigatorio' });

    await openNewOrder(wrapper);
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith('Cliente obrigatorio');
    expect(body.find('[role="dialog"]').exists()).toBe(true);
  });
});
