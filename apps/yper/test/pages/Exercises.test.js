import { describe, it, expect, vi, afterEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountPage, cleanupPages } from '@yper/test-utils';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';
import Exercises from '../../src/pages/Exercises.vue';

const EXERCISES = [
  {
    _id: 'e1', name: 'Supino reto', muscleGroup: 'chest', equipment: 'Barra', notes: '', videoUrl: 'https://vid/1',
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    _id: 'e2', name: 'Agachamento', muscleGroup: 'legs', equipment: 'Barra', notes: '',
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

async function mountExercises(exercises = EXERCISES) {
  api.get.mockReset();
  api.get.mockImplementation(async () => ({ exercises }));
  return mountPage(Exercises, { messages: ptBR, api: client });
}

async function submit(body) {
  await body.find('form').trigger('submit');
  await flushPromises();
}

describe('Exercises', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupPages();
  });

  it('carrega exercicios e mostra grupo muscular, equipamento e link de video', async () => {
    const { wrapper } = await mountExercises();

    expect(api.get).toHaveBeenCalledWith('/exercises');
    expect(wrapper.text()).toContain('2 de 2');
    expect(wrapper.text()).toContain('Supino reto');
    expect(wrapper.find('td .badge').text()).toBe('Peito');
    expect(wrapper.text()).toContain('Barra');
    expect(wrapper.find('a[href="https://vid/1"]').exists()).toBe(true);
  });

  it('mostra mensagem de lista vazia quando nao ha exercicios cadastrados', async () => {
    const { wrapper } = await mountExercises([]);
    expect(wrapper.text()).toContain('Cadastre seu primeiro exercício.');
  });

  it('classifica legado em Outros na listagem e permite corrigir no cadastro', async () => {
    const { wrapper, body } = await mountExercises([{ _id: 'e1', name: 'Legado', muscleGroup: null }]);
    await wrapper.find('select').setValue('other');
    expect(wrapper.text()).toContain('Legado');
    await wrapper.find('button[title="Editar"]').trigger('click');
    expect(body.find('#muscleGroup').element.value).toBe('other');
    await body.find('#muscleGroup').setValue('biceps');
    await submit(body);
    expect(api.put).toHaveBeenCalledWith('/exercises/e1', expect.objectContaining({ muscleGroup: 'biceps' }));
  });

  it('filtra por texto de busca e por grupo muscular', async () => {
    const { wrapper } = await mountExercises();

    await wrapper.find('input[type="search"]').setValue('agacha');
    expect(wrapper.text()).toContain('1 de 2');
    expect(wrapper.text()).toContain('Agachamento');
    expect(wrapper.text()).not.toContain('Supino reto');

    await wrapper.find('input[type="search"]').setValue('');
    await wrapper.find('select').setValue('chest');
    expect(wrapper.text()).toContain('1 de 2');
    expect(wrapper.text()).toContain('Supino reto');
    expect(wrapper.text()).not.toContain('Agachamento');

    await wrapper.find('input[type="search"]').setValue('zzz');
    expect(wrapper.text()).toContain('Nenhum exercício com esse filtro.');
  });

  it('cria um novo exercicio e envia o payload correto', async () => {
    const { wrapper, body } = await mountExercises([]);

    await wrapper.find('button.btn-primary').trigger('click');
    await flushPromises();

    await body.find('#name').setValue('Remada curvada');
    await body.find('#muscleGroup').setValue('back');
    await body.find('#equipment').setValue('Barra');
    await body.find('#weight').setValue(25);
    await body.find('#videoUrl').setValue('https://vid/2');
    await body.find('#notes').setValue('cuidado com a lombar');

    await submit(body);

    expect(api.post).toHaveBeenCalledWith('/exercises', {
      name: 'Remada curvada',
      muscleGroup: 'back',
      equipment: 'Barra',
      weight: 25,
      videoUrl: 'https://vid/2',
      notes: 'cuidado com a lombar',
    });
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('edita um exercicio existente pre-preenchendo o formulario e envia PUT', async () => {
    const { wrapper, body } = await mountExercises();

    const editButtons = wrapper.findAll('button[title="Editar"]');
    await editButtons[0].trigger('click');
    await flushPromises();

    expect(body.find('#name').element.value).toBe('Supino reto');
    await body.find('#equipment').setValue('Halteres');
    await submit(body);

    expect(api.put).toHaveBeenCalledWith('/exercises/e1', {
      name: 'Supino reto',
      muscleGroup: 'chest',
      equipment: 'Halteres',
      weight: 0,
      notes: '',
      videoUrl: 'https://vid/1',
    });
  });

  it('remove um exercicio apenas quando o usuario confirma', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { wrapper } = await mountExercises();

    const removeButtons = wrapper.findAll('button[title="Remover"]');
    await removeButtons[0].trigger('click');
    expect(confirmSpy).toHaveBeenCalledWith('Remover "Supino reto"?');
    expect(api.del).not.toHaveBeenCalled();

    await removeButtons[0].trigger('click');
    await flushPromises();
    expect(api.del).toHaveBeenCalledWith('/exercises/e1');
  });

  it('mostra alerta de erro quando o carregamento falha', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    api.get.mockReset();
    api.get.mockImplementation(async () => { throw new Error('sem conexao'); });

    await mountPage(Exercises, { messages: ptBR, api: client });

    expect(alertSpy).toHaveBeenCalledWith('sem conexao');
  });
});
