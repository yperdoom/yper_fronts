import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountPage } from '@yper/test-utils';
import { number, date } from '@yper/i18n';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';
import Today from '../../src/pages/Today.vue';

const DASHBOARD = {
  targets: { calories: 2000, protein: 150, carbs: 200, fat: 60 },
  consumed: { calories: 1000, protein: 100, carbs: 100, fat: 70 },
  remaining: { calories: 1000, protein: 50, carbs: 100, fat: -10 },
  mealsToday: 2,
  workoutsThisWeek: 3,
  workoutTargetPerWeek: 4,
  todaysWorkouts: [
    {
      _id: 'w1',
      name: 'Treino A',
      focus: 'Peito',
      items: [{ exercise: { name: 'Supino' }, sets: 3, reps: '10', weight: 50 }],
    },
  ],
  recentLogs: [
    {
      _id: 'l1',
      date: '2024-03-05T10:00:00Z',
      workout: { name: 'Treino A' },
      durationMinutes: 45,
      totalVolume: 1200,
    },
  ],
  lastMeasurement: { weightKg: 80.5, date: '2024-03-01T00:00:00Z' },
};

async function mountToday(responder) {
  api.get.mockReset();
  api.get.mockImplementation(responder);
  return mountPage(Today, { messages: ptBR, api: client });
}

describe('Today', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carrega o dashboard e renderiza macros, treino do dia e ultimos treinos', async () => {
    const { wrapper } = await mountToday(async (path) => {
      expect(path).toBe('/dashboard');
      return DASHBOARD;
    });

    expect(api.get).toHaveBeenCalledWith('/dashboard');
    expect(wrapper.text()).toContain('2 refeição(ões) registrada(s)');
    expect(wrapper.text()).toContain(`${number(1000)} / ${number(2000)} kcal`);
    expect(wrapper.text()).toContain(`${number(100)} / ${number(150)}g`);
    expect(wrapper.text()).toContain(`faltam ${number(1000)} kcal`);
    expect(wrapper.text()).toContain(`${number(10)}g acima da meta`);

    const caloriesBar = wrapper.findAll('.bar span')[0];
    expect(caloriesBar.attributes('style')).toContain('width: 50%');

    expect(wrapper.text()).toContain('3 / 4 na semana');
    expect(wrapper.text()).toContain('Treino A');
    expect(wrapper.text()).toContain('Peito');
    expect(wrapper.text()).toContain('Supino');
    expect(wrapper.text()).toContain('3x10');
    expect(wrapper.text()).toContain(`${number(50, 1)}kg`);

    expect(wrapper.text()).toContain(date('2024-03-05T10:00:00Z'));
    expect(wrapper.text()).toContain('45 min');
    expect(wrapper.text()).toContain(`${number(1200)} kg`);

    expect(wrapper.text()).toContain('Último peso:');
    expect(wrapper.text()).toContain(`${number(80.5, 1)} kg`);
    expect(wrapper.text()).toContain(date('2024-03-01T00:00:00Z'));
  });

  it('mostra estados vazios quando nao ha treino do dia, historico ou medicao', async () => {
    const { wrapper } = await mountToday(async () => ({
      ...DASHBOARD,
      todaysWorkouts: [],
      recentLogs: [],
      lastMeasurement: null,
    }));

    expect(wrapper.text()).toContain('Nenhum treino marcado para hoje.');
    expect(wrapper.text()).toContain('Nenhum treino registrado ainda.');
    expect(wrapper.text()).not.toContain('Último peso:');
  });

  it('mostra alerta de erro quando o dashboard falha ao carregar', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    await mountToday(async () => {
      throw new Error('falhou');
    });

    expect(alertSpy).toHaveBeenCalledWith('falhou');
  });
});
