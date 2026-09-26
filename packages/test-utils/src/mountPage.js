import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createAppI18n } from '@yper/i18n';
import { createShell } from '@yper/ui';

import { createFakeApi } from './createFakeApi.js';

/**
 * Monta uma pagina com i18n, shell e router reais (router de memoria), mais
 * um client de api (real ou `createFakeApi()`, usado por padrao).
 *
 * Sem `routes`, o router usa uma rota catch-all para o proprio componente.
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

  return { wrapper, api, router };
}
