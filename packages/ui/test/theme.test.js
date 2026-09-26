import { describe, it, expect, beforeEach } from 'vitest';
import { loadTheme, applyTheme, toggleTheme } from '../src/index.js';

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

function systemPrefers(dark) {
  return (query) => ({ matches: query === '(prefers-color-scheme: dark)' && dark });
}

describe('tema', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it('loadTheme prefere o valor salvo em <app>_theme ao tema do sistema', () => {
    const storage = makeStorage({ movix_theme: 'light' });

    expect(loadTheme('movix', { storage, matchMedia: systemPrefers(true) })).toBe('light');
  });

  it('loadTheme sem valor salvo segue prefers-color-scheme', () => {
    expect(loadTheme('movix', { storage: makeStorage(), matchMedia: systemPrefers(true) })).toBe('dark');
    expect(loadTheme('movix', { storage: makeStorage(), matchMedia: systemPrefers(false) })).toBe('light');
  });

  it('loadTheme ignora valor salvo invalido', () => {
    const storage = makeStorage({ movix_theme: 'sepia' });

    expect(loadTheme('movix', { storage, matchMedia: systemPrefers(true) })).toBe('dark');
  });

  it('loadTheme sem matchMedia disponivel cai para light', () => {
    expect(loadTheme('movix', { storage: makeStorage(), matchMedia: undefined })).toBe('light');
  });

  it('applyTheme marca data-theme no <html>', () => {
    applyTheme('dark');

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('toggleTheme alterna, aplica e persiste o novo tema', () => {
    const storage = makeStorage();

    expect(toggleTheme('yper', 'light', storage)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(storage.data.yper_theme).toBe('dark');

    expect(toggleTheme('yper', 'dark', storage)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(storage.data.yper_theme).toBe('light');
  });
});
