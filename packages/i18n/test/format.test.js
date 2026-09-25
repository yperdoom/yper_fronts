import { describe, it, expect } from 'vitest';
import { createAppI18n, currency, number, date, dateTime, toDateInput } from '../src/index.js';

describe('format', () => {
  it('currency usa BRL formatado no locale ativo', () => {
    createAppI18n({ locale: 'pt-BR' });
    expect(currency(12.5)).toBe('R$ 12,50');

    createAppI18n({ locale: 'en-US' });
    expect(currency(12.5)).toBe('R$12.50');
  });

  it('date retorna travessao para valor vazio', () => {
    createAppI18n({ locale: 'pt-BR' });
    expect(date(null)).toBe('—');
    expect(date(undefined)).toBe('—');
  });

  it('date e dateTime seguem o locale ativo', () => {
    const value = '2024-03-05T10:00:00Z';

    createAppI18n({ locale: 'pt-BR' });
    expect(date(value)).toBe(new Date(value).toLocaleDateString('pt-BR'));

    createAppI18n({ locale: 'en-US' });
    expect(date(value)).toBe(new Date(value).toLocaleDateString('en-US'));
    expect(dateTime(null)).toBe('—');
  });

  it('number formata conforme o locale ativo', () => {
    createAppI18n({ locale: 'pt-BR' });
    expect(number(1234.5, 2)).toBe('1.234,50');

    createAppI18n({ locale: 'en-US' });
    expect(number(1234.5, 2)).toBe('1,234.50');
  });

  it('toDateInput e imune a timezone', () => {
    const value = '2024-03-05T23:30:00-03:00';
    const expected = new Date(value).toLocaleDateString('en-CA');
    expect(toDateInput(value)).toBe(expected);
  });

  it('toDateInput sem valor usa a data atual', () => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const expected = new Date(today.getTime() - offset).toISOString().slice(0, 10);

    expect(toDateInput()).toBe(expected);
  });
});
