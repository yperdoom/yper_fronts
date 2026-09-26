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

  it.each(['pt-BR', 'en-US'])('edit/remove/confirmRemove sao compartilhados entre apps em %s', async (locale) => {
    const { createAppI18n } = await import('../src/index.js');
    const { t } = createAppI18n({ locale }).global;

    expect(t('common.edit')).not.toBe('common.edit');
    expect(t('common.remove')).not.toBe('common.remove');
    expect(t('common.confirmRemove', { name: 'Acme' })).toContain('Acme');
  });
});

describe('usuarios, papeis e conta', () => {
  it.each(['pt-BR', 'en-US'])('traduz papeis, apps, usuarios e conta em %s', async (locale) => {
    const { createAppI18n } = await import('../src/index.js');
    const { t } = createAppI18n({ locale }).global;

    for (const key of [
      'roles.admin',
      'roles.manager',
      'roles.employee',
      'users.title',
      'users.errors.duplicateEmail',
      'account.changePassword',
      'account.errors.currentIncorrect',
    ]) {
      expect(t(key)).not.toBe(key);
    }
  });

  it('nomes dos apps sao os nomes dos produtos nos dois locales', () => {
    const expected = { helake: 'Helake', movix: 'Movix', yper: 'Yper' };

    expect(ptBR.apps).toEqual(expected);
    expect(enUS.apps).toEqual(expected);
  });
});
