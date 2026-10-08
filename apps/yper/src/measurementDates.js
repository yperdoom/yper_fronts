import { date, toDateInput } from '@yper/i18n';

// Measurement forms store calendar dates as UTC midnight. Preserve that chosen day.
export function measurementDateInput(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/.test(value)) {
    return value.slice(0, 10);
  }
  return toDateInput(value);
}

export function measurementDate(value) {
  if (!value) return '—';
  return date(new Date(`${measurementDateInput(value)}T12:00:00`));
}
