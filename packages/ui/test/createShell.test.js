import { describe, it, expect, vi } from 'vitest';
import { createShell, SHELL_KEY } from '../src/createShell.js';

describe('createShell', () => {
  it('retorna um plugin que provê appName, nav, api e logoUrl', () => {
    const api = { auth: {}, session: {} };
    const nav = [{ to: '/home', labelKey: 'nav.home', icon: 'home' }];
    const shell = createShell({ appName: 'Movix', nav, api });
    const app = { provide: vi.fn() };

    shell.install(app);

    expect(app.provide).toHaveBeenCalledWith(SHELL_KEY, {
      appName: 'Movix',
      nav,
      api,
      logoUrl: '/logo.png',
    });
  });

  it('usa logoUrl customizado quando informado', () => {
    const shell = createShell({ appName: 'Movix', nav: [], api: {}, logoUrl: '/brand/logo.svg' });
    const app = { provide: vi.fn() };

    shell.install(app);

    expect(app.provide).toHaveBeenCalledWith(
      SHELL_KEY,
      expect.objectContaining({ logoUrl: '/brand/logo.svg' }),
    );
  });
});
