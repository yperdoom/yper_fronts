import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountPage, cleanupPages } from '@yper/test-utils';
import { flushPromises } from '@vue/test-utils';
import { currency } from '@yper/i18n';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';

import Ingredients from '../../src/pages/Ingredients.vue';

const INGREDIENTS = [
  {
    _id: 'i1', name: 'Farinha de Trigo', category: 'Dry Goods', unit: 'kg',
    costPerUnit: 4.5, currentStock: 20, minimumStock: 5, projectedStock: 18,
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    _id: 'i2', name: 'Leite Condensado', category: 'Dairy', unit: 'L',
    costPerUnit: 8, currentStock: 3, minimumStock: 5, projectedStock: 2,
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    _id: 'i3', name: 'Chocolate Amargo', category: 'Chocolate', unit: 'kg',
    costPerUnit: 32, currentStock: 0, minimumStock: 2, projectedStock: -1,
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

async function mountIngredients(route = '/ingredients') {
  return mountPage(Ingredients, { messages: ptBR, api: client, route });
}

function findButtonByTitle(wrapper, title) {
  return wrapper.findAll('.btn-icon').find((btn) => btn.attributes('title') === title);
}

function findButtonByText(wrapper, text) {
  return wrapper.findAll('button').find((btn) => btn.text() === text);
}

afterEach(cleanupPages);

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (path) => {
    if (path === '/ingredients') return { ingredients: structuredClone(INGREDIENTS) };
    return [];
  });
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('Ingredients', () => {
  it('carrega ingredientes e renderiza a tabela', async () => {
    const { wrapper } = await mountIngredients();

    expect(api.get).toHaveBeenCalledWith('/ingredients');

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(3);
  });

  it('mostra categoria, unidade, custo, projetado e status de cada ingrediente', async () => {
    const { wrapper } = await mountIngredients();
    const rows = wrapper.findAll('tbody tr');

    const cellsA = rows[0].findAll('td');
    expect(cellsA[0].text()).toContain('Farinha de Trigo');
    expect(cellsA[1].text()).toContain('Dry Goods');
    expect(cellsA[2].text()).toContain('20');
    expect(cellsA[3].text()).toContain('18.00');
    expect(cellsA[4].text()).toContain('5');
    expect(cellsA[5].text()).toContain('kg');
    expect(cellsA[6].text()).toContain(currency(4.5));
    expect(cellsA[7].text()).toContain('Em estoque');

    expect(rows[1].find('.badge').classes()).toContain('badge-warn');
    expect(rows[1].text()).toContain('Estoque baixo');

    expect(rows[2].find('.badge').classes()).toContain('badge-danger');
    expect(rows[2].text()).toContain('Crítico');
  });

  it('filtra por categoria', async () => {
    const { wrapper } = await mountIngredients();

    await findButtonByText(wrapper, 'Dairy').trigger('click');

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toContain('Leite Condensado');

    await findButtonByText(wrapper, 'Todos').trigger('click');
    expect(wrapper.findAll('tbody tr')).toHaveLength(3);
  });

  it('filtra por nome', async () => {
    const { wrapper } = await mountIngredients();

    await wrapper.find('input[type="search"]').setValue('choc');

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toContain('Chocolate Amargo');
  });

  it('mostra mensagem quando a lista esta vazia', async () => {
    api.get.mockImplementation(async () => ({ ingredients: [] }));

    const { wrapper } = await mountIngredients();

    expect(wrapper.text()).toContain('Nenhum ingrediente encontrado.');
  });

  it('cria um novo ingrediente e recarrega a lista', async () => {
    const { wrapper, body } = await mountIngredients();

    await wrapper.findAll('button').find((btn) => btn.text().includes('Novo ingrediente')).trigger('click');
    expect(body.find('h3').text()).toBe('Novo ingrediente');

    await body.find('#name').setValue('Açúcar Refinado');
    await body.find('#category').setValue('Dry Goods');
    await body.find('#unit').setValue('kg');
    await body.find('#cost').setValue('3.2');
    await body.find('#currentStock').setValue('10');
    await body.find('#minimumStock').setValue('2');

    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/ingredients', {
      name: 'Açúcar Refinado', category: 'Dry Goods', unit: 'kg',
      costPerUnit: 3.2, currentStock: 10, minimumStock: 2,
    });
    expect(api.get).toHaveBeenCalledWith('/ingredients');
    expect(body.find('[role="dialog"]').exists()).toBe(false);
  });

  it('edita um ingrediente existente', async () => {
    const { wrapper, body } = await mountIngredients();

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Editar').trigger('click');

    expect(body.find('h3').text()).toBe('Editar ingrediente');
    expect(body.find('#name').element.value).toBe('Farinha de Trigo');

    await body.find('#cost').setValue('5');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith('/ingredients/i1', {
      name: 'Farinha de Trigo', category: 'Dry Goods', unit: 'kg',
      costPerUnit: 5, currentStock: 20, minimumStock: 5,
    });
  });

  it('remove um ingrediente quando a confirmacao e aceita', async () => {
    const { wrapper } = await mountIngredients();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Remover').trigger('click');
    await flushPromises();

    expect(window.confirm).toHaveBeenCalledWith('Remover "Farinha de Trigo"?');
    expect(api.del).toHaveBeenCalledWith('/ingredients/i1');
    expect(api.get).toHaveBeenCalledWith('/ingredients');
  });

  it('nao remove quando a confirmacao e recusada', async () => {
    const { wrapper } = await mountIngredients();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Remover').trigger('click');
    await flushPromises();

    expect(api.del).not.toHaveBeenCalled();
  });

  it('erro ao carregar ingredientes mostra alerta traduzido', async () => {
    api.get.mockImplementation(async () => {
      throw { code: 'NETWORK' };
    });

    await mountIngredients();

    expect(window.alert).toHaveBeenCalledWith('Não foi possível falar com o servidor. Tente de novo.');
  });

  it('erro ao salvar mostra a mensagem do erro', async () => {
    const { wrapper, body } = await mountIngredients();
    api.post.mockRejectedValueOnce({ message: 'Nome invalido' });

    await wrapper.findAll('button').find((btn) => btn.text().includes('Novo ingrediente')).trigger('click');
    await body.find('#name').setValue('Teste');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith('Nome invalido');
  });
});
