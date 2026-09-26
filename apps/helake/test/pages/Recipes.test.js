import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountPage, cleanupPages } from '@yper/test-utils';
import { flushPromises } from '@vue/test-utils';
import { currency, number } from '@yper/i18n';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';

import Recipes from '../../src/pages/Recipes.vue';

const INGREDIENTS = [
  { _id: 'i1', name: 'Farinha', unit: 'kg', costPerUnit: 4.5 },
  { _id: 'i2', name: 'Chocolate', unit: 'kg', costPerUnit: 8 },
];

// Custos vem calculados da API: ingredientes 2*4,5 + 0,5*8 = 13; infra 20% = 2,6; mao de obra 20
// => total 35,6; margem (100 - 35,6) / 100 = 64,4%.
const RECIPES = [
  {
    _id: 'r1', name: 'Bolo de Chocolate', category: 'Cakes', yield: 10, yieldUnit: 'slices',
    laborCost: 20, infraCostPercentage: null, sellingPrice: 100,
    ingredients: [
      { ingredient: { _id: 'i1', name: 'Farinha', unit: 'kg', costPerUnit: 4.5 }, quantity: 2 },
      { ingredient: 'i2', quantity: 0.5 },
    ],
    ingredientCost: 13, infraCost: 2.6, totalCost: 35.6, suggestedPrice: 56.96, margin: 64.4,
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    _id: 'r2', name: 'Brigadeiro', category: 'Sweets', yield: 50, yieldUnit: 'un',
    laborCost: 10, infraCostPercentage: 15, sellingPrice: 50,
    ingredients: [],
    ingredientCost: 25, infraCost: 3.75, totalCost: 35, suggestedPrice: 56, margin: 30,
  },
  {
    _id: 'r3', name: 'Pao de Mel', category: 'Other', yield: 20, yieldUnit: 'un',
    laborCost: 0, infraCostPercentage: 0, sellingPrice: 40,
    ingredientCost: 36, infraCost: 0, totalCost: 36, suggestedPrice: 57.6, margin: 10,
  },
  {
    _id: 'r4', name: 'Torta', category: 'Pastries', yield: 1, yieldUnit: 'kg',
    laborCost: 0, infraCostPercentage: null, sellingPrice: 0,
    ingredients: [],
    ingredientCost: 0, infraCost: 0, totalCost: 0, suggestedPrice: 0, margin: null,
  },
];

async function mountRecipes(route = '/recipes') {
  return mountPage(Recipes, { messages: ptBR, api: client, route });
}

function findButtonByTitle(wrapper, title) {
  return wrapper.findAll('.btn-icon').find((btn) => btn.attributes('title') === title);
}

function openNewRecipe(wrapper) {
  return wrapper.findAll('button').find((btn) => btn.text().includes('Nova receita')).trigger('click');
}

function findButtonByText(body, text) {
  return body.findAll('button').find((btn) => btn.text().includes(text));
}

afterEach(cleanupPages);

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (path) => {
    if (path === '/recipes') return { recipes: structuredClone(RECIPES) };
    if (path === '/ingredients') return { ingredients: structuredClone(INGREDIENTS) };
    return [];
  });
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('Recipes', () => {
  it('carrega receitas e ingredientes e renderiza a tabela', async () => {
    const { wrapper } = await mountRecipes();

    expect(api.get).toHaveBeenCalledWith('/recipes');
    expect(api.get).toHaveBeenCalledWith('/ingredients');
    expect(wrapper.findAll('tbody tr')).toHaveLength(4);
  });

  it('mostra categoria, rendimento, custos, preco de venda e margem calculados', async () => {
    const { wrapper } = await mountRecipes();
    const cells = wrapper.findAll('tbody tr')[0].findAll('td');

    expect(cells[0].text()).toContain('Bolo de Chocolate');
    expect(cells[1].text()).toContain('Bolos');
    expect(cells[1].find('.badge').classes()).toContain('badge-accent');
    expect(cells[2].text()).toContain('10 fatias');
    expect(cells[3].text()).toContain(currency(13));
    expect(cells[4].text()).toContain(currency(35.6));
    expect(cells[5].text()).toContain(currency(100));
    expect(cells[6].text()).toContain(`${number(64.4, 1)}%`);
    expect(cells[6].find('.badge').classes()).toContain('badge-ok');
  });

  it('colore a margem por faixa e mostra traco quando nao ha margem', async () => {
    const { wrapper } = await mountRecipes();
    const rows = wrapper.findAll('tbody tr');

    expect(rows[1].findAll('td')[1].text()).toContain('Doces');
    expect(rows[1].findAll('td')[1].find('.badge').classes()).not.toContain('badge-accent');
    expect(rows[1].findAll('td')[6].find('.badge').classes()).toContain('badge-warn');
    expect(rows[2].findAll('td')[6].find('.badge').classes()).toContain('badge-danger');

    const marginNull = rows[3].findAll('td')[6];
    expect(marginNull.text()).toBe('—');
    expect(marginNull.find('.badge').classes()).toContain('badge-warn');
  });

  it('mostra traco para custos ausentes', async () => {
    api.get.mockImplementation(async (path) => {
      if (path === '/recipes') {
        return { recipes: [{ _id: 'r9', name: 'Sem custo', category: 'Breads', yield: 1, yieldUnit: 'un' }] };
      }
      return { ingredients: [] };
    });

    const { wrapper } = await mountRecipes();
    const cells = wrapper.findAll('tbody tr')[0].findAll('td');

    expect(cells[1].text()).toContain('Pães');
    expect(cells[3].text()).toBe('—');
    expect(cells[4].text()).toBe('—');
    expect(cells[5].text()).toBe('—');
  });

  it('mostra mensagem quando nao ha receitas', async () => {
    api.get.mockImplementation(async (path) => (path === '/recipes' ? { recipes: [] } : { ingredients: [] }));

    const { wrapper } = await mountRecipes();

    expect(wrapper.text()).toContain('Nenhuma receita ainda. Crie a primeira!');
  });

  it('cria uma receita com ingredientes, ignorando linhas sem ingrediente', async () => {
    const { wrapper, body } = await mountRecipes();
    api.get.mockClear();

    await openNewRecipe(wrapper);
    expect(body.find('h3').text()).toBe('Nova receita');
    expect(body.find('#name').attributes('required')).toBeDefined();
    expect(body.text()).toContain('Nenhum ingrediente adicionado ainda.');

    const categoryOption = body.findAll('#category option').find((o) => o.text() === 'Bolos');
    expect(categoryOption.attributes('value')).toBe('Cakes');

    const yieldUnitOption = body.findAll('#yieldUnit option').find((o) => o.text() === 'fatias');
    expect(yieldUnitOption.attributes('value')).toBe('slices');

    await body.find('#name').setValue('Bolo de Cenoura');
    await body.find('#category').setValue('Cakes');
    await body.find('#yield').setValue('12');
    await body.find('#yieldUnit').setValue('slices');
    await body.find('#sellingPrice').setValue('80');
    await body.find('#laborCost').setValue('15');
    await body.find('#infraCostPercentage').setValue('25');

    await findButtonByText(body, 'Adicionar').trigger('click');
    await findButtonByText(body, 'Adicionar').trigger('click');
    const rows = body.findAll('[data-test="ingredient-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].findAll('option').map((o) => o.text())).toEqual([
      '— Selecione o ingrediente —', 'Farinha (kg)', 'Chocolate (kg)',
    ]);

    await rows[0].find('select').setValue('i1');
    await rows[0].find('input').setValue('1.5');

    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/recipes', {
      name: 'Bolo de Cenoura', category: 'Cakes', yield: 12, yieldUnit: 'slices',
      laborCost: 15, infraCostPercentage: 25, sellingPrice: 80,
      ingredients: [{ ingredient: 'i1', quantity: 1.5 }],
    });
    expect(api.get).toHaveBeenCalledWith('/recipes');
    expect(body.find('[role="dialog"]').exists()).toBe(false);
  });

  it('cria receita com os valores padrao (infra nulo usa o padrao das configuracoes)', async () => {
    const { wrapper, body } = await mountRecipes();

    await openNewRecipe(wrapper);
    await body.find('#name').setValue('Simples');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/recipes', {
      name: 'Simples', category: 'Other', yield: 1, yieldUnit: 'un',
      laborCost: 0, infraCostPercentage: null, sellingPrice: 0, ingredients: [],
    });
  });

  it('remove uma linha de ingrediente do formulario', async () => {
    const { wrapper, body } = await mountRecipes();

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Editar').trigger('click');
    expect(body.findAll('[data-test="ingredient-row"]')).toHaveLength(2);

    await body.findAll('[data-test="ingredient-row"]')[0].find('button').trigger('click');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith('/recipes/r1', expect.objectContaining({
      ingredients: [{ ingredient: 'i2', quantity: 0.5 }],
    }));
  });

  it('edita uma receita enviando apenas os campos do formulario e ids dos ingredientes', async () => {
    const { wrapper, body } = await mountRecipes();

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Editar').trigger('click');

    expect(body.find('h3').text()).toBe('Editar receita');
    expect(body.find('#name').element.value).toBe('Bolo de Chocolate');
    const rows = body.findAll('[data-test="ingredient-row"]');
    expect(rows[0].find('select').element.value).toBe('i1');
    expect(rows[1].find('select').element.value).toBe('i2');

    await body.find('#sellingPrice').setValue('120');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith('/recipes/r1', {
      name: 'Bolo de Chocolate', category: 'Cakes', yield: 10, yieldUnit: 'slices',
      laborCost: 20, infraCostPercentage: null, sellingPrice: 120,
      ingredients: [{ ingredient: 'i1', quantity: 2 }, { ingredient: 'i2', quantity: 0.5 }],
    });
  });

  it('edita receita sem lista de ingredientes', async () => {
    const { wrapper, body } = await mountRecipes();

    await findButtonByTitle(wrapper.findAll('tbody tr')[2], 'Editar').trigger('click');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith('/recipes/r3', {
      name: 'Pao de Mel', category: 'Other', yield: 20, yieldUnit: 'un',
      laborCost: 0, infraCostPercentage: 0, sellingPrice: 40, ingredients: [],
    });
  });

  it('remove uma receita quando a confirmacao e aceita', async () => {
    const { wrapper } = await mountRecipes();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.get.mockClear();

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Remover').trigger('click');
    await flushPromises();

    expect(window.confirm).toHaveBeenCalledWith('Remover "Bolo de Chocolate"?');
    expect(api.del).toHaveBeenCalledWith('/recipes/r1');
    expect(api.get).toHaveBeenCalledWith('/recipes');
  });

  it('nao remove quando a confirmacao e recusada', async () => {
    const { wrapper } = await mountRecipes();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Remover').trigger('click');
    await flushPromises();

    expect(api.del).not.toHaveBeenCalled();
  });

  it('erro ao remover (receita com encomendas) mostra a mensagem da API', async () => {
    const { wrapper } = await mountRecipes();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.del.mockRejectedValueOnce({ message: 'Recipe has 2 order(s) and cannot be deleted' });

    await findButtonByTitle(wrapper.findAll('tbody tr')[0], 'Remover').trigger('click');
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith('Recipe has 2 order(s) and cannot be deleted');
  });

  it('erro ao carregar receitas mostra alerta traduzido', async () => {
    api.get.mockImplementation(async () => {
      throw { code: 'NETWORK' };
    });

    await mountRecipes();

    expect(window.alert).toHaveBeenCalledWith('Não foi possível falar com o servidor. Tente de novo.');
  });

  it('falha ao carregar ingredientes nao impede a lista de receitas', async () => {
    api.get.mockImplementation(async (path) => {
      if (path === '/recipes') return { recipes: structuredClone(RECIPES) };
      throw { message: 'boom' };
    });

    const { wrapper, body } = await mountRecipes();

    expect(wrapper.findAll('tbody tr')).toHaveLength(4);
    await openNewRecipe(wrapper);
    await findButtonByText(body, 'Adicionar').trigger('click');
    expect(body.findAll('[data-test="ingredient-row"] option')).toHaveLength(1);
  });

  it('erro ao salvar mostra a mensagem do erro e mantem o modal aberto', async () => {
    const { wrapper, body } = await mountRecipes();
    api.post.mockRejectedValueOnce({ message: 'Nome obrigatorio' });

    await openNewRecipe(wrapper);
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith('Nome obrigatorio');
    expect(body.find('[role="dialog"]').exists()).toBe(true);
  });
});
