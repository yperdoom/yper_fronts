import { describe, it, expect } from 'vitest';
import { MUSCLE_GROUPS, workoutFocus } from '../src/muscleGroups';

describe('muscleGroups', () => {
  it('lists every muscle group', () => {
    expect(MUSCLE_GROUPS).toContain('chest');
    expect(MUSCLE_GROUPS).toContain('other');
    expect(MUSCLE_GROUPS).toHaveLength(12);
  });
});

describe('workoutFocus', () => {
  it('returns null without groups', () => {
    expect(workoutFocus([])).toBeNull();
    expect(workoutFocus([undefined, ''])).toBeNull();
  });

  it('returns the distinct groups when there are up to 3', () => {
    expect(workoutFocus(['chest', 'triceps', 'chest', 'abs'])).toEqual({
      type: 'groups',
      groups: ['chest', 'triceps', 'abs'],
    });
  });

  it('classifies more than 3 upper groups as upper', () => {
    expect(workoutFocus(['chest', 'shoulders', 'triceps', 'biceps'])).toEqual({ type: 'upper' });
  });

  it('classifies more than 3 lower groups as lower', () => {
    expect(workoutFocus(['legs', 'glutes', 'calves', 'cardio'])).toEqual({ type: 'lower' });
  });

  it('ignores neutral groups when classifying', () => {
    expect(workoutFocus(['chest', 'back', 'abs', 'cardio', 'other'])).toEqual({ type: 'upper' });
  });

  it('classifies upper and lower mixed as full', () => {
    expect(workoutFocus(['chest', 'back', 'shoulders', 'calves'])).toEqual({ type: 'full' });
  });

  it('classifies fullBody as full', () => {
    expect(workoutFocus(['chest', 'back', 'shoulders', 'fullBody'])).toEqual({ type: 'full' });
  });
});
