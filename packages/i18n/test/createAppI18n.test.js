import { describe, it, expect } from 'vitest';
import { createAppI18n } from '../src/index.js';

describe('createAppI18n', () => {
  it('usa pt-BR como locale padrao', () => {
    const i18n = createAppI18n({});

    expect(i18n.global.locale.value).toBe('pt-BR');
    expect(i18n.global.t('common.save')).toBe('Salvar');
  });

  it('mescla mensagens do app com as comuns, app sobrescreve', () => {
    const i18n = createAppI18n({
      messages: {
        'pt-BR': {
          common: { save: 'Gravar' },
          products: { title: 'Produtos' },
        },
      },
    });

    expect(i18n.global.t('common.save')).toBe('Gravar');
    expect(i18n.global.t('common.cancel')).toBe('Cancelar');
    expect(i18n.global.t('products.title')).toBe('Produtos');
  });

  it('chave inexistente em en-US cai no pt-BR (fallbackLocale)', () => {
    const i18n = createAppI18n({
      locale: 'en-US',
      messages: {
        'pt-BR': { products: { title: 'Produtos' } },
      },
    });

    expect(i18n.global.t('products.title')).toBe('Produtos');
  });
});
