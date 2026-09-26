import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountPage } from '@yper/test-utils';
import { DOMWrapper, flushPromises } from '@vue/test-utils';
import { currency, toDateInput } from '@yper/i18n';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';

import Invoices from '../../src/pages/Invoices.vue';

const SUPPLIERS = [{ _id: 's1', name: 'Fornecedor A' }];
const PRODUCTS = [{ _id: 'p1', name: 'Arroz' }, { _id: 'p2', name: 'Feijão' }];

const INVOICES = [
  {
    _id: 'i1', number: '1', series: '1', type: 'in', issueDate: '2024-03-01T00:00:00Z',
    supplier: { _id: 's1', name: 'Fornecedor A' }, counterpartName: null, accessKey: '',
    items: [{ product: { _id: 'p1', name: 'Arroz' }, quantity: 10, unitPrice: 2 }],
    totalAmount: 20, status: 'draft',
  },
  {
    _id: 'i2', number: '2', series: '1', type: 'out', issueDate: '2024-03-02T00:00:00Z',
    supplier: null, counterpartName: 'Cliente X', accessKey: '',
    items: [{ product: { _id: 'p2', name: 'Feijão' }, quantity: 5, unitPrice: 3 }],
    totalAmount: 15, status: 'confirmed',
  },
  {
    _id: 'i3', number: '3', series: '1', type: 'in', issueDate: '2024-03-03T00:00:00Z',
    supplier: { _id: 's1', name: 'Fornecedor A' }, counterpartName: null, accessKey: '',
    items: [], totalAmount: 0, status: 'cancelled',
  },
];

let activeWrapper;

async function mountInvoices(route = '/notas') {
  const ctx = await mountPage(Invoices, { messages: ptBR, api: client, route });
  activeWrapper = ctx.wrapper;
  return ctx;
}

function findButtonByTitle(wrapper, title) {
  return wrapper.findAll('.btn-icon').find((btn) => btn.attributes('title') === title);
}

// classe CSS-module gerada para a linha de item e "_item_<hash>"; o container
// da secao de itens vira "_items_<hash>" (nao contem "_item_" como substring).
function itemRows(body) {
  return body.findAll('[class*="_item_"]');
}

afterEach(() => {
  activeWrapper?.unmount();
  activeWrapper = undefined;
});

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (path) => {
    if (path.startsWith('/invoices')) return { invoices: structuredClone(INVOICES) };
    if (path === '/products') return { products: structuredClone(PRODUCTS) };
    if (path === '/suppliers') return { suppliers: structuredClone(SUPPLIERS) };
    return [];
  });
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('Invoices', () => {
  it('carrega notas, produtos e fornecedores, renderiza a tabela', async () => {
    const { wrapper } = await mountInvoices();

    expect(api.get).toHaveBeenCalledWith('/invoices');
    expect(api.get).toHaveBeenCalledWith('/products');
    expect(api.get).toHaveBeenCalledWith('/suppliers');

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(3);
    expect(wrapper.text()).toContain('3 nota(s)');
    expect(rows[0].text()).toContain(currency(20));
  });

  it('mostra tipo, contraparte e status de cada nota', async () => {
    const { wrapper } = await mountInvoices();
    const rows = wrapper.findAll('tbody tr');

    expect(rows[0].text()).toContain('Entrada');
    expect(rows[0].text()).toContain('Fornecedor A');
    expect(rows[0].find('.badge').classes()).toContain('badge-ok');

    expect(rows[1].text()).toContain('Saída');
    expect(rows[1].text()).toContain('Cliente X');

    expect(rows[0].text()).toContain('Rascunho');
    expect(rows[1].text()).toContain('Confirmada');
    expect(rows[2].text()).toContain('Cancelada');
  });

  it('mostra as acoes certas conforme o status', async () => {
    const { wrapper } = await mountInvoices();
    const rows = wrapper.findAll('tbody tr');

    // draft: confirmar, editar, cancelar, remover
    expect(rows[0].findAll('.btn-icon')).toHaveLength(4);
    // confirmed: so cancelar
    expect(rows[1].findAll('.btn-icon')).toHaveLength(1);
    expect(rows[1].find('.btn-icon').attributes('title')).toBe('Cancelar');
    // cancelled: nenhuma acao
    expect(rows[2].findAll('.btn-icon')).toHaveLength(0);
  });

  it('filtra por tipo e por status, combinando na query', async () => {
    const { wrapper } = await mountInvoices();
    const selects = wrapper.findAll('select');

    await selects[0].setValue('in');
    expect(api.get).toHaveBeenCalledWith('/invoices?type=in');

    await selects[1].setValue('draft');
    expect(api.get).toHaveBeenCalledWith('/invoices?type=in&status=draft');
  });

  it('confirma uma nota quando a confirmacao e aceita', async () => {
    const { wrapper } = await mountInvoices();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Confirmar e dar baixa no estoque').trigger('click');
    await flushPromises();

    expect(window.confirm).toHaveBeenCalledWith('Confirmar a nota 1/1? Isso vai somar os itens no estoque.');
    expect(api.post).toHaveBeenCalledWith('/invoices/i1/confirm');
    expect(api.get).toHaveBeenCalledWith('/invoices');
  });

  it('nao confirma quando a confirmacao e recusada', async () => {
    const { wrapper } = await mountInvoices();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Confirmar e dar baixa no estoque').trigger('click');
    await flushPromises();

    expect(api.post).not.toHaveBeenCalled();
  });

  it('cancela uma nota', async () => {
    const { wrapper } = await mountInvoices();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Cancelar').trigger('click');
    await flushPromises();

    expect(window.confirm).toHaveBeenCalledWith('Cancelar a nota 1/1? As movimentações geradas serão estornadas.');
    expect(api.post).toHaveBeenCalledWith('/invoices/i1/cancel');
  });

  it('remove uma nota em rascunho', async () => {
    const { wrapper } = await mountInvoices();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Remover').trigger('click');
    await flushPromises();

    expect(window.confirm).toHaveBeenCalledWith('Remover a nota 1/1?');
    expect(api.del).toHaveBeenCalledWith('/invoices/i1');
  });

  it('nao remove quando a confirmacao e recusada', async () => {
    const { wrapper } = await mountInvoices();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Remover').trigger('click');
    await flushPromises();

    expect(api.del).not.toHaveBeenCalled();
  });

  it('alterna entre fornecedor e contraparte conforme o tipo', async () => {
    const { wrapper } = await mountInvoices();
    const body = new DOMWrapper(document.body);

    await wrapper.findAll('button').find((btn) => btn.text().includes('Nova nota')).trigger('click');

    expect(body.find('#supplier').exists()).toBe(true);
    expect(body.find('#counterpart').exists()).toBe(false);

    await body.find('#type').setValue('out');

    expect(body.find('#supplier').exists()).toBe(false);
    expect(body.find('#counterpart').exists()).toBe(true);
  });

  it('cria uma nota nova com item e recarrega a lista', async () => {
    const { wrapper } = await mountInvoices();
    const body = new DOMWrapper(document.body);

    await wrapper.findAll('button').find((btn) => btn.text().includes('Nova nota')).trigger('click');

    await body.find('#number').setValue('10');
    await body.find('#series').setValue('2');
    await body.find('#issueDate').setValue('2024-04-01');
    await body.find('#supplier').setValue('s1');

    await body.findAll('button').find((btn) => btn.text().includes('Item')).trigger('click');
    const itemRow = itemRows(body)[0];
    await itemRow.find('select').setValue('p1');
    const numberInputs = itemRow.findAll('input');
    await numberInputs[0].setValue('3');
    await numberInputs[1].setValue('4');

    expect(body.text()).toContain(currency(12));

    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/invoices', {
      number: '10', series: '2', type: 'in', issueDate: '2024-04-01',
      supplier: 's1', counterpartName: '', accessKey: '',
      items: [{ product: 'p1', quantity: 3, unitPrice: 4 }],
    });
    expect(body.find('[role="dialog"]').exists()).toBe(false);
  });

  it('edita uma nota existente com os itens pre-preenchidos', async () => {
    const { wrapper } = await mountInvoices();
    const body = new DOMWrapper(document.body);

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Editar').trigger('click');

    expect(body.find('#number').element.value).toBe('1');
    expect(body.find('#supplier').element.value).toBe('s1');

    const itemRow = itemRows(body)[0];
    expect(itemRow.find('select').element.value).toBe('p1');

    const numberInputs = itemRow.findAll('input');
    await numberInputs[0].setValue('20');

    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith('/invoices/i1', {
      number: '1', series: '1', type: 'in', issueDate: toDateInput(INVOICES[0].issueDate),
      supplier: 's1', counterpartName: null, accessKey: '',
      items: [{ product: 'p1', quantity: 20, unitPrice: 2 }],
    });
  });

  it('remove um item da nota antes de salvar', async () => {
    const { wrapper } = await mountInvoices();
    const body = new DOMWrapper(document.body);

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Editar').trigger('click');
    expect(itemRows(body)).toHaveLength(1);

    await itemRows(body)[0].find('.btn-icon').trigger('click');

    expect(itemRows(body)).toHaveLength(0);
  });

  it('erro ao carregar notas mostra alerta traduzido', async () => {
    api.get.mockImplementation(async (path) => {
      if (path.startsWith('/invoices')) throw { code: 'NETWORK' };
      return [];
    });

    await mountInvoices();

    expect(window.alert).toHaveBeenCalledWith('Não foi possível falar com o servidor. Tente de novo.');
  });

  it('erro ao confirmar mostra a mensagem do erro', async () => {
    const { wrapper } = await mountInvoices();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.post.mockRejectedValueOnce({ message: 'Estoque insuficiente' });

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Confirmar e dar baixa no estoque').trigger('click');
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith('Estoque insuficiente');
  });
});
