import { describe, it, expect } from 'vitest';
import ptBR from '../src/locales/pt-BR.json' with { type: 'json' };
import enUS from '../src/locales/en-US.json' with { type: 'json' };

function flatKeys(obj, prefix = '') {
  return Object.keys(obj).flatMap((key) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return flatKeys(value, path);
    }
    return [path];
  });
}

describe('locales', () => {
  it('pt-BR e en-US tem o mesmo conjunto de chaves', () => {
    expect(flatKeys(ptBR).sort()).toEqual(flatKeys(enUS).sort());
  });
});

describe('mensagens comuns', () => {
  it.each(['pt-BR', 'en-US'])('todas compilam e traduzem em %s', async (locale) => {
    const { createAppI18n } = await import('../src/index.js');
    const { t } = createAppI18n({ locale }).global;
    for (const key of flatKeys(ptBR)) {
      expect(t(key)).not.toBe(key);
    }
  });
});
