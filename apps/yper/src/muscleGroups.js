export const MUSCLE_GROUPS = Object.freeze([
  'chest', 'back', 'legs', 'glutes', 'shoulders', 'biceps',
  'triceps', 'abs', 'calves', 'cardio', 'fullBody', 'other',
]);

const UPPER = ['chest', 'back', 'shoulders', 'biceps', 'triceps'];
const LOWER = ['legs', 'glutes', 'calves'];
const MAX_LISTED_GROUPS = 3;

export function workoutFocusLabel(items, { exercises = [], t, locale }) {
  const groups = items.map(({ exercise }) => {
    const id = exercise?._id || exercise;
    return exercises.find((entry) => entry._id === id)?.muscleGroup || exercise?.muscleGroup;
  });
  const focus = workoutFocus(groups);
  if (!focus) return '';
  if (focus.type !== 'groups') return t(`workouts.focus.${focus.type}`);
  return new Intl.ListFormat(locale, { type: 'conjunction' })
    .format(focus.groups.map((group) => t(`exercises.muscleGroups.${group}`)));
}

export function workoutFocus(groups) {
  const distinct = [...new Set(groups.filter(Boolean))];
  if (!distinct.length) return null;
  if (distinct.length <= MAX_LISTED_GROUPS) return { type: 'groups', groups: distinct };

  const hasUpper = distinct.some((group) => UPPER.includes(group));
  const hasLower = distinct.some((group) => LOWER.includes(group));
  if (hasUpper && !hasLower && !distinct.includes('fullBody')) return { type: 'upper' };
  if (hasLower && !hasUpper && !distinct.includes('fullBody')) return { type: 'lower' };
  return { type: 'full' };
}
