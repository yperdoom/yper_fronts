import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('api', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('envia Accept-Language com o locale ativo do i18n em toda requisicao', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ initialized: true }),
    });

    const { auth } = await import('../src/api.js');
    await auth.status();

    const [, options] = fetchSpy.mock.calls[0];
    expect(options.headers['Accept-Language']).toBe('pt-BR');
  });
});
