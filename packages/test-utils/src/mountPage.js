import { mount, flushPromises, DOMWrapper } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createAppI18n } from '@yper/i18n';
import { createShell } from '@yper/ui';

import { createFakeApi } from './createFakeApi.js';

const mountedWrappers = [];

/**
 * Monta uma pagina com i18n, shell e router reais (router de memoria), mais
 * um client de api (real ou `createFakeApi()`, usado por padrao).
 *
 * Sem `routes`, o router usa uma rota catch-all para o proprio componente.
 *
 * `Modal` (`@yper/ui`) usa `<Teleport to="body">`, entao seu conteudo fica
 * fora da arvore de `wrapper`; `body` e um `DOMWrapper` de `document.body`
 * para consultar esse conteudo teleportado.
 */
export async function mountPage(
  component,
  { messages = {}, api = createFakeApi(), route = '/', routes, appName = 'Test', nav = [] } = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: routes || [{ path: '/:pathMatch(.*)*', component }],
  });
  router.push(route);
  await router.isReady();

  const i18n = createAppI18n({ messages: { 'pt-BR': messages } });
  const shell = createShell({ appName, nav, api });

  const wrapper = mount(component, {
    global: { plugins: [router, i18n, shell] },
  });
  await flushPromises();

  mountedWrappers.push(wrapper);
  const body = new DOMWrapper(document.body);

  return { wrapper, api, router, body };
}

/**
 * Desmonta todos os wrappers criados por `mountPage` desde a ultima limpeza
 * e limpa o `document.body` (inclusive conteudo teleportado por `Modal`).
 * Chamar em `afterEach(cleanupPages)`.
 */
export function cleanupPages() {
  while (mountedWrappers.length) {
    mountedWrappers.pop().unmount();
  }
  document.body.innerHTML = '';
}
