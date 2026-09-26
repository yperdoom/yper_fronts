import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountPage } from '@yper/test-utils';
import ptBR from '../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';
import Workouts from '../src/pages/Workouts.vue';
import Exercises from '../src/pages/Exercises.vue';

function withOverrides(overrides) {
  return {
    ...ptBR,
    workouts: { ...ptBR.workouts, ...overrides.workouts },
    exercises: { ...ptBR.exercises, ...overrides.exercises },
  };
}

describe('rotulos de enums vem do locale', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('dias da semana dos treinos usam workouts.weekdays', async () => {
    api.get.mockImplementation(async (path) => (path === '/workouts'
      ? { workouts: [{ _id: 'w1', name: 'A', weekdays: [1], items: [], active: true }] }
      : { exercises: [] }));
    const weekdays = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

    const { wrapper } = await mountPage(Workouts, { messages: withOverrides({ workouts: { weekdays } }), api: client });

    expect(wrapper.text()).toContain('Mon');
    expect(wrapper.text()).not.toContain('Seg');
  });

  it('grupos musculares mostram o rotulo traduzido e mantem o valor salvo', async () => {
    api.get.mockImplementation(async () => ({
      exercises: [{ _id: 'e1', name: 'Supino', muscleGroup: 'chest' }],
    }));
    const muscleGroups = { chest: 'Chest' };

    const { wrapper } = await mountPage(Exercises, { messages: withOverrides({ exercises: { muscleGroups } }), api: client });

    expect(wrapper.find('td .badge').text()).toBe('Chest');
    const option = wrapper.findAll('option').find((o) => o.text() === 'Chest');
    expect(option.attributes('value')).toBe('chest');
  });
});
