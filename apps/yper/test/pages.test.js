import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountPage } from '@yper/test-utils';
import ptBR from '../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';

import Today from '../src/pages/Today.vue';
import Workouts from '../src/pages/Workouts.vue';
import Exercises from '../src/pages/Exercises.vue';
import History from '../src/pages/History.vue';
import Nutrition from '../src/pages/Nutrition.vue';
import Foods from '../src/pages/Foods.vue';
import Measurements from '../src/pages/Measurements.vue';
import Profile from '../src/pages/Profile.vue';

const RESPONSES = {
  '/dashboard': {
    targets: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    consumed: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    remaining: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    mealsToday: 0,
    workoutsThisWeek: 0,
    workoutTargetPerWeek: 0,
    todaysWorkouts: [],
    recentLogs: [],
    lastMeasurement: null,
  },
  '/workouts': { workouts: [] },
  '/exercises': { exercises: [] },
  '/logs': { logs: [] },
  '/foods': { foods: [] },
  '/measurements': { measurements: [] },
  '/profile': { profile: { dailyCalories: 2000, proteinTarget: 150, carbsTarget: 200, fatTarget: 60 } },
};

beforeEach(() => {
  api.get.mockImplementation(async (path) => {
    if (path.startsWith('/meals')) return { meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } };
    return RESPONSES[path] ?? [];
  });
});

describe('pages (smoke)', () => {
  it.each([
    ['Today', Today],
    ['Workouts', Workouts],
    ['Exercises', Exercises],
    ['History', History],
    ['Nutrition', Nutrition],
    ['Foods', Foods],
    ['Measurements', Measurements],
    ['Profile', Profile],
  ])('%s monta sem lancar erro', async (_name, Component) => {
    const { wrapper } = await mountPage(Component, { messages: ptBR, api: client, route: '/home' });
    expect(wrapper.exists()).toBe(true);
  });
});
