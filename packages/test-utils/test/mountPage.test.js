import { describe, it, expect } from 'vitest';
import { mountPage, createFakeApi } from '../src/index.js';
import TinyPage from './fixtures/mount/TinyPage.vue';

describe('mountPage', () => {
  it('monta o componente com i18n, shell e fake api reais', async () => {
    const api = createFakeApi({ '/tiny': { value: 42 } });

    const { wrapper, router } = await mountPage(TinyPage, {
      messages: { tiny: { title: 'Ola mundo' } },
      api,
    });

    expect(wrapper.text()).toContain('Ola mundo');
    expect(api.api.get).toHaveBeenCalledWith('/tiny');
    expect(router.currentRoute.value.path).toBe('/');
  });
});
