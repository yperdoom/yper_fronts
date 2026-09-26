import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountPage, cleanupPages } from '@yper/test-utils';
import { flushPromises } from '@vue/test-utils';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';

import Suppliers from '../../src/pages/Suppliers.vue';

const SUPPLIERS = [
  {
    _id: 's1', name: 'Fornecedor A', document: '11.111.111/0001-11',
    phone: '11999999999', email: 'a@x.com', notes: 'entrega rapida', active: true,
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    _id: 's2', name: 'Fornecedor B', document: '22.222.222/0001-22',
    phone: null, email: null, notes: null, active: false,
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

async function mountSuppliers(route = '/suppliers') {
  return mountPage(Suppliers, { messages: ptBR, api: client, route });
}

function findButtonByTitle(wrapper, title) {
  return wrapper.findAll('.btn-icon').find((btn) => btn.attributes('title') === title);
}

afterEach(cleanupPages);

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (path) => {
    if (path === '/suppliers') return { suppliers: structuredClone(SUPPLIERS) };
    return [];
  });
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('Suppliers', () => {
  it('carrega fornecedores e renderiza a tabela', async () => {
    const { wrapper } = await mountSuppliers();

    expect(api.get).toHaveBeenCalledWith('/suppliers');

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(wrapper.text()).toContain('2 de 2');
  });

  it('mostra status, contato e observacoes de cada fornecedor', async () => {
    const { wrapper } = await mountSuppliers();
    const rows = wrapper.findAll('tbody tr');

    expect(rows[0].find('.badge').classes()).toContain('badge-ok');
    expect(rows[0].text()).toContain('Ativo');
    expect(rows[0].text()).toContain('11999999999');
    expect(rows[0].text()).toContain('a@x.com');
    expect(rows[0].text()).toContain('entrega rapida');

    expect(rows[1].find('.badge').classes()).not.toContain('badge-ok');
    expect(rows[1].text()).toContain('Inativo');
    expect(rows[1].text()).toContain('—');
  });

  it('filtra por nome ou documento', async () => {
    const { wrapper } = await mountSuppliers();

    await wrapper.find('input[type="search"]').setValue('22.222');

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toContain('Fornecedor B');
    expect(wrapper.text()).toContain('1 de 2');
  });

  it('mostra mensagem de "primeiro fornecedor" quando a lista esta vazia', async () => {
    api.get.mockImplementation(async () => ({ suppliers: [] }));

    const { wrapper } = await mountSuppliers();

    expect(wrapper.text()).toContain('Cadastre seu primeiro fornecedor.');
  });

  it('mostra mensagem de filtro sem resultado', async () => {
    const { wrapper } = await mountSuppliers();

    await wrapper.find('input[type="search"]').setValue('inexistente');

    expect(wrapper.text()).toContain('Nenhum fornecedor com esse filtro.');
  });

  it('cria um novo fornecedor e recarrega a lista', async () => {
    const { wrapper, body } = await mountSuppliers();

    await wrapper.findAll('button').find((btn) => btn.text().includes('Novo fornecedor')).trigger('click');
    expect(body.find('h3').text()).toBe('Novo fornecedor');

    await body.find('#name').setValue('Fornecedor C');
    await body.find('#document').setValue('33.333.333/0001-33');
    await body.find('#phone').setValue('11888888888');
    await body.find('#email').setValue('c@x.com');
    await body.find('#notes').setValue('nova obs');
    await body.find('input[type="checkbox"]').setValue(false);

    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/suppliers', {
      name: 'Fornecedor C', document: '33.333.333/0001-33', email: 'c@x.com',
      phone: '11888888888', notes: 'nova obs', active: false,
    });
    expect(api.get).toHaveBeenCalledWith('/suppliers');
    expect(body.find('[role="dialog"]').exists()).toBe(false);
  });

  it('edita um fornecedor existente', async () => {
    const { wrapper, body } = await mountSuppliers();

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Editar').trigger('click');

    expect(body.find('h3').text()).toBe('Editar fornecedor');
    expect(body.find('#name').element.value).toBe('Fornecedor A');

    await body.find('#email').setValue('novo@x.com');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith('/suppliers/s1', {
      name: 'Fornecedor A', document: '11.111.111/0001-11',
      phone: '11999999999', email: 'novo@x.com', notes: 'entrega rapida', active: true,
    });
  });

  it('remove um fornecedor quando a confirmacao e aceita', async () => {
    const { wrapper } = await mountSuppliers();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Remover').trigger('click');
    await flushPromises();

    expect(window.confirm).toHaveBeenCalledWith('Remover "Fornecedor A"?');
    expect(api.del).toHaveBeenCalledWith('/suppliers/s1');
  });

  it('nao remove quando a confirmacao e recusada', async () => {
    const { wrapper } = await mountSuppliers();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Remover').trigger('click');
    await flushPromises();

    expect(api.del).not.toHaveBeenCalled();
  });

  it('erro ao carregar fornecedores mostra alerta traduzido', async () => {
    api.get.mockImplementation(async () => {
      throw { code: 'NETWORK' };
    });

    await mountSuppliers();

    expect(window.alert).toHaveBeenCalledWith('Não foi possível falar com o servidor. Tente de novo.');
  });

  it('erro ao salvar mostra a mensagem do erro', async () => {
    const { wrapper, body } = await mountSuppliers();
    api.post.mockRejectedValueOnce({ message: 'Documento invalido' });

    await wrapper.findAll('button').find((btn) => btn.text().includes('Novo fornecedor')).trigger('click');
    await body.find('#name').setValue('Teste');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith('Documento invalido');
  });
});
