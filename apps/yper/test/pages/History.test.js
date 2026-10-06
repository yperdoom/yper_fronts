import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountPage, cleanupPages } from '@yper/test-utils';
import { number, date, toDateInput } from '@yper/i18n';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';
import History from '../../src/pages/History.vue';

const WORKOUT = {
  _id: 'w1',
  name: 'Treino A',
  items: [{ exercise: { _id: 'e1' }, sets: 2, reps: '8', weight: 20 }],
};

const EXERCISES = [{ _id: 'e1', name: 'Supino' }];

const LOG = {
  _id: 'l1',
  date: '2024-03-05T00:00:00Z',
  workout: { name: 'Treino A' },
  durationMinutes: 40,
  totalVolume: 800,
  notes: 'Boa sessao',
  entries: [{ exercise: { name: 'Supino' }, sets: [{ reps: 8, weight: 20 }, { reps: 8, weight: 22.5 }] }],
};

function respond(overrides = {}) {
  const responses = { '/logs': { logs: [] }, '/workouts': { workouts: [] }, '/exercises': { exercises: [] }, ...overrides };
  return async (path) => path.startsWith('/workouts/activity') ? { activity: [] } : responses[path];
}

async function mountHistory(overrides) {
  api.get.mockReset();
  api.get.mockImplementation(respond(overrides));
  return mountPage(History, { messages: ptBR, api: client });
}

async function submit(body) {
  await body.find('form').trigger('submit');
  await flushPromises();
}

describe('History', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2024-03-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    cleanupPages();
  });

  it('carrega sessoes e renderiza series, duracao, volume e notas', async () => {
    const { wrapper } = await mountHistory({ '/logs': { logs: [LOG] } });

    expect(api.get).toHaveBeenCalledWith('/logs');
    expect(api.get).toHaveBeenCalledWith('/workouts');
    expect(api.get).toHaveBeenCalledWith('/exercises');
    expect(wrapper.text()).toContain('Treino A');
    expect(wrapper.text()).toContain(date('2024-03-05T00:00:00Z'));
    expect(wrapper.text()).toContain('40 min');
    expect(wrapper.text()).toContain(`${number(800)} kg de volume`);
    expect(wrapper.text()).toContain('8x20kg');
    expect(wrapper.text()).toContain('8x22.5kg');
    expect(wrapper.text()).toContain('Boa sessao');
  });

  it('mostra treino avulso e "sem series" quando aplicavel', async () => {
    const { wrapper } = await mountHistory({
      '/logs': { logs: [{ _id: 'l2', date: '2024-03-06', workout: null, durationMinutes: 0, totalVolume: 0, entries: [{ exercise: { name: 'X' }, sets: [] }] }] },
    });

    expect(wrapper.text()).toContain('Treino avulso');
    expect(wrapper.text()).toContain('sem séries');
  });

  it('mostra mensagem vazia quando nao ha sessoes registradas', async () => {
    const { wrapper } = await mountHistory();
    expect(wrapper.text()).toContain('As atividades diárias aparecem no calendário. Nenhuma sessão detalhada registrada.');
  });

  it('escolher um treino no formulario preenche os exercicios com as series planejadas', async () => {
    const { wrapper, body } = await mountHistory({ '/workouts': { workouts: [WORKOUT] }, '/exercises': { exercises: EXERCISES } });

    await wrapper.find('button.btn-primary').trigger('click');
    await flushPromises();

    await body.find('#workout').setValue('w1');
    await submit(body);

    expect(api.post).toHaveBeenCalledWith('/logs', {
      workout: 'w1',
      date: toDateInput(),
      durationMinutes: 0,
      notes: '',
      entries: [{ exercise: 'e1', sets: [{ reps: 8, weight: 20 }, { reps: 8, weight: 20 }] }],
    });
    expect(api.get.mock.calls.filter((call) => call[0] === '/logs')).toHaveLength(2);
  });

  it('permite adicionar exercicios e series manualmente antes de salvar', async () => {
    const { wrapper, body } = await mountHistory({ '/exercises': { exercises: EXERCISES } });

    await wrapper.find('button.btn-primary').trigger('click');
    await flushPromises();

    const addEntry = body.findAll('button.btn').find((b) => b.text().includes('Exercício'));
    await addEntry.trigger('click');

    await body.find('select[required]').setValue('e1');
    const addSet = body.findAll('button.btn').find((b) => b.text().includes('Série'));
    await addSet.trigger('click');

    await body.find('input[placeholder="reps"]').setValue(12);

    await submit(body);

    expect(api.post).toHaveBeenCalledWith('/logs', {
      workout: null,
      date: toDateInput(),
      durationMinutes: 0,
      notes: '',
      entries: [{ exercise: 'e1', sets: [{ reps: 12, weight: 0 }, { reps: 10, weight: 0 }] }],
    });
  });

  it('remove um registro apenas quando o usuario confirma', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { wrapper } = await mountHistory({ '/logs': { logs: [LOG] } });

    await wrapper.find('button[title="Remover"]').trigger('click');
    expect(confirmSpy).toHaveBeenCalledWith('Remover este registro?');
    expect(api.del).not.toHaveBeenCalled();

    await wrapper.find('button[title="Remover"]').trigger('click');
    await flushPromises();
    expect(api.del).toHaveBeenCalledWith('/logs/l1');
  });

  it('mostra alerta de erro quando o carregamento de sessoes falha', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    await mountHistory({ '/logs': Promise.reject(new Error('sem conexao')) });

    expect(alertSpy).toHaveBeenCalledWith('sem conexao');
  });
});
