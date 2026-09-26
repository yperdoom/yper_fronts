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
import Workouts from '../../src/pages/Workouts.vue';

const EXERCISES = [
  { _id: 'e1', name: 'Supino', muscleGroup: 'chest' },
  { _id: 'e2', name: 'Agachamento', muscleGroup: 'legs' },
  { _id: 'e3', name: 'Elevação lateral', muscleGroup: 'shoulders' },
  { _id: 'e4', name: 'Tríceps francês', muscleGroup: 'triceps' },
  { _id: 'e5', name: 'Rosca scott', muscleGroup: 'biceps' },
];

const WORKOUT = {
  _id: 'w1',
  name: 'Treino A',
  focus: 'Foco antigo',
  weekdays: [1, 3],
  notes: '',
  active: true,
  items: [{ exercise: { _id: 'e1', name: 'Supino' }, sets: 4, reps: '8', weight: 60, restSeconds: 90 }],
};

function respond(overrides = {}) {
  const responses = { '/workouts': { workouts: [] }, '/exercises': { exercises: EXERCISES }, ...overrides };
  return async (path) => responses[path];
}

async function mountWorkouts(overrides) {
  api.get.mockReset();
  api.get.mockImplementation(respond(overrides));
  return mountPage(Workouts, { messages: ptBR, api: client });
}

async function submit(body) {
  await body.find('form').trigger('submit');
  await flushPromises();
}

describe('Workouts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupPages();
  });

  it('carrega treinos e exercicios, e renderiza dias, itens e foco', async () => {
    const { wrapper } = await mountWorkouts({ '/workouts': { workouts: [WORKOUT] } });

    expect(api.get).toHaveBeenCalledWith('/workouts');
    expect(api.get).toHaveBeenCalledWith('/exercises');
    expect(wrapper.text()).toContain('Treino A');
    expect(wrapper.text()).toContain('Peito');
    expect(wrapper.text()).not.toContain('Foco antigo');
    expect(wrapper.text()).toContain('Supino');
    expect(wrapper.text()).toContain('4x8');
    expect(wrapper.text()).toContain(`${number(60, 1)}kg`);

    const monday = wrapper.findAll('span.badge').find((b) => b.text() === 'Seg');
    expect(monday.classes()).toContain('badge-accent');
    const sunday = wrapper.findAll('span.badge').find((b) => b.text() === 'Dom');
    expect(sunday.classes()).not.toContain('badge-accent');
  });

  it('mostra mensagem vazia quando nao ha treinos', async () => {
    const { wrapper } = await mountWorkouts();
    expect(wrapper.text()).toContain('Monte seu primeiro treino para começar a registrar as sessões.');
  });

  it('cria um novo treino preenchendo dias e itens, envia o payload correto e recarrega', async () => {
    const { wrapper, body } = await mountWorkouts();

    await wrapper.find('button.btn-primary').trigger('click');
    await flushPromises();

    await body.find('#name').setValue('Treino B');

    const mondayToggle = body.findAll('button.badge').find((b) => b.text() === 'Seg');
    await mondayToggle.trigger('click');

    const addItemButton = body.findAll('button.btn').find((b) => b.text().includes('Exercício'));
    await addItemButton.trigger('click');

    await body.find('select').setValue('e2');
    await body.find('input[type="number"][min="1"]').setValue(5);
    await body.find('input[type="number"][step="0.5"]').setValue(40);

    await submit(body);

    expect(api.post).toHaveBeenCalledWith('/workouts', {
      name: 'Treino B',
      focus: 'Pernas',
      weekdays: [1],
      notes: '',
      active: true,
      items: [{ exercise: 'e2', sets: 5, reps: '10', weight: 40, restSeconds: 60 }],
    });
    expect(api.get.mock.calls.filter((call) => call[0] === '/workouts')).toHaveLength(2);
  });

  it('edita um treino existente pre-preenchendo o formulario e envia PUT', async () => {
    const { wrapper, body } = await mountWorkouts({ '/workouts': { workouts: [WORKOUT] } });

    await wrapper.find('button[title="Editar"]').trigger('click');
    await flushPromises();

    expect(body.find('#name').element.value).toBe('Treino A');
    expect(body.find('#focus').element.value).toBe('Peito');
    expect(body.find('#focus').attributes('readonly')).toBeDefined();

    await submit(body);

    expect(api.put).toHaveBeenCalledWith('/workouts/w1', {
      name: 'Treino A',
      focus: 'Peito',
      weekdays: [1, 3],
      notes: '',
      active: true,
      items: [{ exercise: 'e1', sets: 4, reps: '8', weight: 60, restSeconds: 90 }],
    });
  });

  it('calcula o foco listando ate 3 grupos e classificando acima disso', async () => {
    const { wrapper, body } = await mountWorkouts();

    await wrapper.find('button.btn-primary').trigger('click');
    await flushPromises();
    const addItemButton = body.findAll('button.btn').find((b) => b.text().includes('Exercício'));

    for (const id of ['e1', 'e3', 'e4']) {
      await addItemButton.trigger('click');
      await body.findAll('select').at(-1).setValue(id);
    }
    expect(body.find('#focus').element.value).toBe('Peito, Ombros e Tríceps');

    await addItemButton.trigger('click');
    await body.findAll('select').at(-1).setValue('e5');
    expect(body.find('#focus').element.value).toBe('Superior');

    await addItemButton.trigger('click');
    await body.findAll('select').at(-1).setValue('e2');
    expect(body.find('#focus').element.value).toBe('Full body');
  });

  it('usa o foco salvo quando os exercicios do treino nao tem grupo conhecido', async () => {
    const legacy = { ...WORKOUT, items: [{ ...WORKOUT.items[0], exercise: { _id: 'x', name: 'Removido' } }] };
    const { wrapper } = await mountWorkouts({ '/workouts': { workouts: [legacy] } });
    expect(wrapper.text()).toContain('Foco antigo');
  });

  it('remove um treino apenas quando o usuario confirma', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { wrapper } = await mountWorkouts({ '/workouts': { workouts: [WORKOUT] } });

    await wrapper.find('button[title="Remover"]').trigger('click');
    expect(confirmSpy).toHaveBeenCalledWith('Remover "Treino A"?');
    expect(api.del).not.toHaveBeenCalled();

    await wrapper.find('button[title="Remover"]').trigger('click');
    await flushPromises();
    expect(api.del).toHaveBeenCalledWith('/workouts/w1');
  });

  it('mostra alerta de erro quando o carregamento de treinos falha', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    await mountWorkouts({ '/workouts': Promise.reject(new Error('sem conexao')) });

    expect(alertSpy).toHaveBeenCalledWith('sem conexao');
  });
});
