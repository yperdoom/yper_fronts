import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createAppI18n } from '@yper/i18n';
import WorkoutSession from '../../src/components/WorkoutSession.vue';
import WorkoutCalendar from '../../src/components/WorkoutCalendar.vue';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', () => ({ api: { get: vi.fn(), put: vi.fn() } }));
import { api } from '@/api';

let wrappers = [];
function render(component, props = {}) {
  const wrapper = mount(component, { props, global: { plugins: [createAppI18n({ messages: { 'pt-BR': ptBR } })] } });
  wrappers.push(wrapper);
  return wrapper;
}
const props = {
  workout: { _id: 'w1', items: [{ exercise: { _id: 'e1', name: 'Supino' }, weight: 20 }] },
  exercises: [{ _id: 'e1', name: 'Supino', weight: 30 }],
};
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 2, 12));
  vi.resetAllMocks();
});
afterEach(() => { wrappers.forEach(wrapper => wrapper.unmount()); wrappers = []; vi.useRealTimers(); });

describe('Acompanhamento diário', () => {
  it('recupera conclusão do dia, salva carga no exercício e não exige séries', async () => {
    api.get.mockResolvedValue({ completedExercises: ['e1'] });
    api.put.mockResolvedValue({ exercise: { _id: 'e1', weight: 35.5 } });
    const wrapper = render(WorkoutSession, props);
    await flushPromises();
    expect(api.get).toHaveBeenCalledWith('/workouts/w1/progress?day=2026-10-02');
    expect(wrapper.find('input[type=checkbox]').element.checked).toBe(true);
    expect(wrapper.text()).toContain('30,0 kg');
    await wrapper.find('button').trigger('click');
    await wrapper.find('input[type=number]').setValue(35.5);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.put).toHaveBeenCalledWith('/exercises/e1', { weight: 35.5 });
    expect(wrapper.emitted('weight-saved')[0][0]).toEqual({ id: 'e1', weight: 35.5 });
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('falha ao concluir mantém estado anterior e permite tentar novamente', async () => {
    api.get.mockResolvedValue({ completedExercises: [] });
    api.put.mockRejectedValueOnce(new Error('Sem conexão')).mockResolvedValueOnce({ completedExercises: ['e1'] });
    const wrapper = render(WorkoutSession, props);
    await flushPromises();
    await wrapper.find('input[type=checkbox]').setValue(true);
    await flushPromises();
    expect(wrapper.find('input[type=checkbox]').element.checked).toBe(false);
    expect(wrapper.find('[role=alert]').text()).toContain('Sem conexão');
    await wrapper.find('input[type=checkbox]').setValue(true);
    await flushPromises();
    expect(api.put).toHaveBeenLastCalledWith('/workouts/w1/progress', { day: '2026-10-02', exercise: 'e1', completed: true });
    expect(wrapper.find('input[type=checkbox]').element.checked).toBe(true);
  });

  it('novo dia limpa a conclusão visível sem apagar o histórico', async () => {
    api.get.mockResolvedValueOnce({ completedExercises: ['e1'] }).mockResolvedValueOnce({ completedExercises: [] });
    const wrapper = render(WorkoutSession, props);
    await flushPromises();
    vi.setSystemTime(new Date(2026, 9, 3, 0, 1));
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(api.get).toHaveBeenLastCalledWith('/workouts/w1/progress?day=2026-10-03');
    expect(wrapper.find('input[type=checkbox]').element.checked).toBe(false);
    expect(api.put).not.toHaveBeenCalled();
  });

  it('falha ao salvar peso preserva o editor e não emite sucesso', async () => {
    api.get.mockResolvedValue({ completedExercises: [] });
    api.put.mockRejectedValue(new Error('Falha no peso'));
    const wrapper = render(WorkoutSession, props);
    await flushPromises();
    await wrapper.find('button').trigger('click');
    await wrapper.find('input[type=number]').setValue(40);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.find('input[type=number]').element.value).toBe('40');
    expect(wrapper.emitted('weight-saved')).toBeUndefined();
    expect(wrapper.find('[role=alert]').text()).toContain('Falha no peso');
  });
});

describe('Calendário de treinos', () => {
  it('conta dias únicos, distingue dias futuros e reinicia a semana na segunda', async () => {
    api.get.mockResolvedValueOnce({ activity: [
      { day: '2026-10-01', workoutName: 'A', completedCount: 2 },
      { day: '2026-10-01', workoutName: 'B', completedCount: 1 },
    ] }).mockResolvedValueOnce({ activity: [] });
    const wrapper = render(WorkoutCalendar, { weekly: true });
    await flushPromises();
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('from=2026-09-28&to=2026-10-04'));
    expect(wrapper.text()).toContain('Dias com treino: 1');
    expect(wrapper.find('[data-day="2026-10-01"]').attributes('aria-label')).toContain('Com treino');
    expect(wrapper.find('[data-day="2026-10-04"]').attributes('aria-label')).toContain('Dia futuro');
    await wrapper.find('[data-day="2026-10-01"]').trigger('click');
    expect(wrapper.text()).toContain('2 exercícios concluídos');
    vi.setSystemTime(new Date(2026, 9, 5, 0, 1));
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(api.get).toHaveBeenLastCalledWith(expect.stringContaining('from=2026-10-05&to=2026-10-11'));
    expect(wrapper.text()).toContain('Dias com treino: 0');
  });

  it('navega entre meses, incluindo fevereiro bissexto, e exibe o histórico do dia', async () => {
    vi.setSystemTime(new Date(2024, 1, 29, 12));
    api.get.mockResolvedValue({ activity: [{ day: '2024-02-29', workoutName: 'Treino antigo', completedCount: 3 }] });
    const wrapper = render(WorkoutCalendar);
    await flushPromises();
    expect(wrapper.findAll('[data-day]')).toHaveLength(29);
    await wrapper.find('[data-day="2024-02-29"]').trigger('click');
    expect(wrapper.text()).toContain('Treino antigo');
    api.get.mockResolvedValue({ activity: [] });
    await wrapper.find('button[aria-label="Próximo mês"]').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('[data-day]')).toHaveLength(31);
    expect(api.get).toHaveBeenLastCalledWith(expect.stringContaining('from=2024-03-01&to=2024-03-31'));
    expect(wrapper.text()).not.toContain('Treino antigo');
  });

  it('erro de rede não apresenta falsos dias sem treino', async () => {
    api.get.mockRejectedValue(new Error('Sem conexão'));
    const wrapper = render(WorkoutCalendar, { weekly: true });
    await flushPromises();
    expect(wrapper.find('[role=alert]').text()).toContain('Sem conexão');
    expect(wrapper.findAll('[data-day]')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('Dias com treino: 0');
  });
});
