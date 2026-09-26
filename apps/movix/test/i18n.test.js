import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('i18n do app', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
    vi.resetModules();
  });

  it('inicia em pt-BR sem idioma salvo e marca <html lang>', async () => {
    const { i18n } = await import('../src/i18n.js');

    expect(i18n.global.locale.value).toBe('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
  });

  it('inicia no idioma salvo em movix_locale', async () => {
    localStorage.setItem('movix_locale', 'en-US');

    const { i18n } = await import('../src/i18n.js');

    expect(i18n.global.locale.value).toBe('en-US');
    expect(document.documentElement.lang).toBe('en-US');
    expect(i18n.global.te('nav.home', 'en-US')).toBe(true);
  });

  it('valor salvo invalido cai para pt-BR', async () => {
    localStorage.setItem('movix_locale', 'de-DE');

    const { i18n } = await import('../src/i18n.js');

    expect(i18n.global.locale.value).toBe('pt-BR');
  });
});
