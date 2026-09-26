import { describe, it, expect, vi, afterEach } from 'vitest';
import { SUPPORTED_LOCALES, loadLocale, saveLocale, createAppI18n } from '../src/index.js';

function makeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    data,
  };
}

function stubDocument() {
  const documentElement = { lang: 'pt-BR' };
  vi.stubGlobal('document', { documentElement });
  return documentElement;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('locale persistido por app', () => {
  it('suporta pt-BR e en-US', () => {
    expect(SUPPORTED_LOCALES).toEqual(['pt-BR', 'en-US']);
    expect(Object.isFrozen(SUPPORTED_LOCALES)).toBe(true);
  });

  it('loadLocale le o valor salvo em <app>_locale', () => {
    const storage = makeStorage({ movix_locale: 'en-US' });

    expect(loadLocale('movix', storage)).toBe('en-US');
  });

  it('loadLocale cai para pt-BR sem valor salvo ou com valor invalido', () => {
    expect(loadLocale('movix', makeStorage())).toBe('pt-BR');
    expect(loadLocale('movix', makeStorage({ movix_locale: 'fr-FR' }))).toBe('pt-BR');
  });

  it('loadLocale cai para pt-BR sem storage disponivel', () => {
    expect(loadLocale('movix', undefined)).toBe('pt-BR');
  });

  it('saveLocale grava em <app>_locale e atualiza <html lang>', () => {
    const storage = makeStorage();
    const root = stubDocument();

    saveLocale('yper', 'en-US', storage);

    expect(storage.data.yper_locale).toBe('en-US');
    expect(root.lang).toBe('en-US');
  });

  it('createAppI18n com app inicia no locale salvo e atualiza <html lang>', () => {
    const storage = makeStorage({ helake_locale: 'en-US' });
    const root = stubDocument();

    const i18n = createAppI18n({ app: 'helake', storage });

    expect(i18n.global.locale.value).toBe('en-US');
    expect(root.lang).toBe('en-US');
  });

  it('createAppI18n com app e valor invalido inicia em pt-BR', () => {
    const storage = makeStorage({ helake_locale: 'xx' });
    const root = stubDocument();

    const i18n = createAppI18n({ app: 'helake', storage });

    expect(i18n.global.locale.value).toBe('pt-BR');
    expect(root.lang).toBe('pt-BR');
  });
});
