import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushPromises, DOMWrapper } from '@vue/test-utils';
import { mountPage } from '@yper/test-utils';
import { number, toDateInput } from '@yper/i18n';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';
import Nutrition from '../../src/pages/Nutrition.vue';

function modal() {
  return new DOMWrapper(document.body);
}

const FOOD = { _id: 'f1', name: 'Arroz', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, servingSize: 100, servingUnit: 'g' };

const MEAL = {
  _id: 'm1',
  type: 'lunch',
  date: '2024-03-10',
  items: [{ food: FOOD, quantity: 200 }],
  totals: { calories: 260, protein: 5.4, carbs: 56, fat: 0.6 },
};

const PROFILE = { profile: { dailyCalories: 2000, proteinTarget: 150, carbsTarget: 200, fatTarget: 60 } };

function respond(overrides = {}) {
  const responses = {
    '/foods': { foods: [FOOD] },
    '/profile': PROFILE,
    ...overrides,
  };
  return async (path) => {
    if (path.startsWith('/meals')) return overrides.meals ?? { meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } };
    return responses[path];
  };
}

async function mountNutrition(overrides) {
  api.get.mockReset();
  api.get.mockImplementation(respond(overrides));
  return mountPage(Nutrition, { messages: ptBR, api: client });
}

async function submit() {
  await modal().find('form').trigger('submit');
  await flushPromises();
}

describe('Nutrition', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2024-03-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('carrega refeicoes do dia, macros e tabela com totais', async () => {
    const { wrapper } = await mountNutrition({ meals: { meals: [MEAL], totals: { calories: 260, protein: 5.4, carbs: 56, fat: 0.6 } } });

    expect(api.get).toHaveBeenCalledWith(`/meals?date=${toDateInput()}`);
    expect(api.get).toHaveBeenCalledWith('/foods');
    expect(api.get).toHaveBeenCalledWith('/profile');

    expect(wrapper.text()).toContain('1 refeição(ões)');
    expect(wrapper.text()).toContain(`${number(260)} / ${number(2000)} kcal`);
    expect(wrapper.text()).toContain(`${number(5.4)} / ${number(150)}g`);
    expect(wrapper.text()).toContain('Almoço');
    expect(wrapper.text()).toContain(`${number(260)} kcal`);
    expect(wrapper.text()).toContain('Arroz');
    expect(wrapper.text()).toContain(`${number(200, 1)} g`);
    expect(wrapper.text()).toContain(number(56, 1));
  });

  it('mostra mensagem vazia quando nao ha refeicoes no dia', async () => {
    const { wrapper } = await mountNutrition();
    expect(wrapper.text()).toContain('Nenhuma refeição registrada nesse dia.');
  });

  it('navega entre dias pelos botoes de seta e recarrega as refeicoes do novo dia', async () => {
    const { wrapper } = await mountNutrition();

    await wrapper.find('button[title="Próximo dia"]').trigger('click');
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/meals?date=2024-03-11');
  });

  it('trocar a data manualmente dispara o recarregamento', async () => {
    const { wrapper } = await mountNutrition();

    const dayInput = wrapper.find('input[type="date"]');
    await dayInput.setValue('2024-03-01');
    await dayInput.trigger('change');
    await flushPromises();

    expect(api.get).toHaveBeenCalledWith('/meals?date=2024-03-01');
  });

  it('cria uma refeicao escolhendo alimento e quantidade, envia o payload e recarrega no dia salvo', async () => {
    const { wrapper } = await mountNutrition();

    await wrapper.find('button.btn-primary').trigger('click');
    await flushPromises();

    await modal().find('#type').setValue('breakfast');
    const addItemButton = modal().findAll('button.btn').find((b) => b.text().includes('Alimento'));
    await addItemButton.trigger('click');

    await modal().find('select[required]').setValue('f1');
    await modal().find('input[type="number"][step="0.1"]').setValue(150);

    expect(modal().text()).toContain(`${number(195)} kcal`);

    await submit();

    expect(api.post).toHaveBeenCalledWith('/meals', {
      type: 'breakfast',
      date: toDateInput(),
      items: [{ food: 'f1', quantity: 150 }],
    });
  });

  it('edita uma refeicao existente pre-preenchendo o formulario e envia PUT', async () => {
    const { wrapper } = await mountNutrition({ meals: { meals: [MEAL], totals: MEAL.totals } });

    await wrapper.find('button[title="Editar"]').trigger('click');
    await flushPromises();

    expect(modal().find('#type').element.value).toBe('lunch');
    await modal().find('input[type="number"][step="0.1"]').setValue(100);
    await submit();

    expect(api.put).toHaveBeenCalledWith('/meals/m1', {
      type: 'lunch',
      date: toDateInput('2024-03-10'),
      items: [{ food: 'f1', quantity: 100 }],
    });
  });

  it('remove uma refeicao apenas quando o usuario confirma', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { wrapper } = await mountNutrition({ meals: { meals: [MEAL], totals: MEAL.totals } });

    await wrapper.find('button[title="Remover"]').trigger('click');
    expect(confirmSpy).toHaveBeenCalledWith('Remover almoço?');
    expect(api.del).not.toHaveBeenCalled();

    await wrapper.find('button[title="Remover"]').trigger('click');
    await flushPromises();
    expect(api.del).toHaveBeenCalledWith('/meals/m1');
  });

  it('mostra alerta de erro quando o carregamento de refeicoes falha', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    api.get.mockReset();
    api.get.mockImplementation(async (path) => {
      if (path.startsWith('/meals')) throw new Error('sem conexao');
      return respond()(path);
    });

    await mountPage(Nutrition, { messages: ptBR, api: client });

    expect(alertSpy).toHaveBeenCalledWith('sem conexao');
  });
});
