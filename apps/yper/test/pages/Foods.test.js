import { describe, it, expect, vi, afterEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountPage, cleanupPages } from '@yper/test-utils';
import { number } from '@yper/i18n';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';
import Foods from '../../src/pages/Foods.vue';

const FOODS = [
  { _id: 'f1', name: 'Arroz branco', brand: '', servingSize: 100, servingUnit: 'g', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
  { _id: 'f2', name: 'Whey isolado', brand: 'Marca X', servingSize: 30, servingUnit: 'g', calories: 120, protein: 25, carbs: 2, fat: 1, fiber: 0 },
];

async function mountFoods(foods = FOODS) {
  api.get.mockReset();
  api.get.mockImplementation(async () => ({ foods }));
  return mountPage(Foods, { messages: ptBR, api: client });
}

async function submit(body) {
  await body.find('form').trigger('submit');
  await flushPromises();
}

describe('Foods', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupPages();
  });

  it('carrega alimentos e renderiza porcao, marca e macros formatados', async () => {
    const { wrapper } = await mountFoods();

    expect(api.get).toHaveBeenCalledWith('/foods');
    expect(wrapper.text()).toContain('2 de 2');
    expect(wrapper.text()).toContain('Arroz branco');
    expect(wrapper.text()).toContain('Marca X');
    expect(wrapper.text()).toContain(`${number(100)} g`);
    expect(wrapper.text()).toContain(number(130));
    expect(wrapper.text()).toContain(`${number(2.7, 1)} g`);
  });

  it('mostra mensagem vazia quando nao ha alimentos cadastrados', async () => {
    const { wrapper } = await mountFoods([]);
    expect(wrapper.text()).toContain('Cadastre seu primeiro alimento.');
  });

  it('filtra por nome ou marca', async () => {
    const { wrapper } = await mountFoods();

    await wrapper.find('input[type="search"]').setValue('whey');
    expect(wrapper.text()).toContain('1 de 2');
    expect(wrapper.text()).toContain('Whey isolado');
    expect(wrapper.text()).not.toContain('Arroz branco');

    await wrapper.find('input[type="search"]').setValue('marca x');
    expect(wrapper.text()).toContain('Whey isolado');

    await wrapper.find('input[type="search"]').setValue('inexistente');
    expect(wrapper.text()).toContain('Nenhum alimento com esse filtro.');
  });

  it('cria um novo alimento e envia o payload correto', async () => {
    const { wrapper, body } = await mountFoods([]);

    await wrapper.find('button.btn-primary').trigger('click');
    await flushPromises();

    await body.find('#name').setValue('Batata doce');
    await body.find('#brand').setValue('');
    await body.find('#servingSize').setValue(100);
    await body.find('#servingUnit').setValue('g');
    await body.find('#calories').setValue(86);
    await body.find('#protein').setValue(1.6);
    await body.find('#carbs').setValue(20);
    await body.find('#fat').setValue(0.1);
    await body.find('#fiber').setValue(3);

    await submit(body);

    expect(api.post).toHaveBeenCalledWith('/foods', {
      name: 'Batata doce',
      brand: '',
      servingSize: 100,
      servingUnit: 'g',
      calories: 86,
      protein: 1.6,
      carbs: 20,
      fat: 0.1,
      fiber: 3,
    });
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('edita um alimento existente pre-preenchendo o formulario e envia PUT', async () => {
    const { wrapper, body } = await mountFoods();

    const editButtons = wrapper.findAll('button[title="Editar"]');
    await editButtons[0].trigger('click');
    await flushPromises();

    expect(body.find('#name').element.value).toBe('Arroz branco');
    await body.find('#calories').setValue(135);
    await submit(body);

    expect(api.put).toHaveBeenCalledWith('/foods/f1', {
      _id: 'f1',
      name: 'Arroz branco',
      brand: '',
      servingSize: 100,
      servingUnit: 'g',
      calories: 135,
      protein: 2.7,
      carbs: 28,
      fat: 0.3,
      fiber: 0.4,
    });
  });

  it('remove um alimento apenas quando o usuario confirma', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { wrapper } = await mountFoods();

    const removeButtons = wrapper.findAll('button[title="Remover"]');
    await removeButtons[0].trigger('click');
    expect(confirmSpy).toHaveBeenCalledWith('Remover "Arroz branco"?');
    expect(api.del).not.toHaveBeenCalled();

    await removeButtons[0].trigger('click');
    await flushPromises();
    expect(api.del).toHaveBeenCalledWith('/foods/f1');
  });

  it('mostra alerta de erro quando o carregamento falha', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    api.get.mockReset();
    api.get.mockImplementation(async () => { throw new Error('sem conexao'); });

    await mountPage(Foods, { messages: ptBR, api: client });

    expect(alertSpy).toHaveBeenCalledWith('sem conexao');
  });
});
