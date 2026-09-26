import { describe, it, expect, afterEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountPage, cleanupPages, createFakeApi } from '../src/index.js';
import TinyPage from './fixtures/mount/TinyPage.vue';
import TinyModalPage from './fixtures/mount/TinyModalPage.vue';

describe('mountPage', () => {
  afterEach(cleanupPages);

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

  it('expoe body, um DOMWrapper de document.body, para consultar conteudo teleportado', async () => {
    const { wrapper, body } = await mountPage(TinyModalPage);

    wrapper.vm.show = true;
    await flushPromises();

    expect(body.find('[data-testid="modal-content"]').exists()).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });
});

describe('cleanupPages', () => {
  it('desmonta os wrappers criados por mountPage desde a ultima limpeza e limpa o document.body', async () => {
    const { body } = await mountPage(TinyModalPage);
    const { wrapper: wrapper2, body: body2 } = await mountPage(TinyModalPage);

    wrapper2.vm.show = true;
    await flushPromises();
    expect(body2.find('[data-testid="modal-content"]').exists()).toBe(true);

    cleanupPages();

    expect(document.body.style.overflow).toBe('');
    expect(document.body.innerHTML).toBe('');
    expect(body.find('[data-testid="modal-content"]').exists()).toBe(false);
  });
});
