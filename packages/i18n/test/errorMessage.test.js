import { describe, it, expect } from 'vitest';
import { createAppI18n, errorMessage } from '../src/index.js';

describe('errorMessage', () => {
  it('traduz erros com code conhecido', () => {
    const i18n = createAppI18n({ locale: 'pt-BR' });
    const t = i18n.global.t;

    expect(errorMessage(t, { code: 'NETWORK' })).toBe('Não foi possível falar com o servidor. Tente de novo.');
    expect(errorMessage(t, { code: 'UNAUTHORIZED' })).toBe('Sessão expirada. Faça login novamente.');
  });

  it('repassa a mensagem quando o code nao e conhecido (ex: HTTP)', () => {
    const i18n = createAppI18n({ locale: 'pt-BR' });
    const t = i18n.global.t;

    expect(errorMessage(t, { code: 'HTTP', message: 'Nome invalido' })).toBe('Nome invalido');
  });
});
