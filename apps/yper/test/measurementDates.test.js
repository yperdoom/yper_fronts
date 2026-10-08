import { describe, it, expect } from 'vitest';
import { measurementDate, measurementDateInput } from '../src/measurementDates';
import { date, toDateInput } from '@yper/i18n';

describe('Datas retroativas de peso corporal', () => {
  it('preserva a data salva como meia-noite UTC ao abrir e exibir a medição', () => {
    expect(measurementDateInput('2026-09-01T00:00:00.000Z')).toBe('2026-09-01');
    expect(measurementDateInput('2026-09-01')).toBe('2026-09-01');
    expect(measurementDate('2026-09-01T00:00:00.000Z')).toBe(date(new Date(2026, 8, 1, 12)));
  });
  it('mantém o fuso local para timestamps reais e o dia atual como padrão', () => {
    expect(measurementDateInput('2026-09-01T18:30:00.000Z')).toBe(toDateInput('2026-09-01T18:30:00.000Z'));
    expect(measurementDateInput()).toBe(toDateInput());
    expect(measurementDate(null)).toBe('—');
  });
});
