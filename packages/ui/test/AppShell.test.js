import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createAppI18n } from '@yper/i18n';
import AppShell from '../src/AppShell.vue';
import { createShell } from '../src/createShell.js';

const nav = [
  { to: '/home', labelKey: 'nav.home', icon: 'home' },
  { to: '/products', labelKey: 'nav.products', icon: 'inventory' },
];

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div/>' } },
      { path: '/home', component: { template: '<div/>' } },
      { path: '/products', component: { template: '<div/>' } },
      { path: '/users', component: { template: '<div/>' } },
      { path: '/account/password', component: { template: '<div/>' } },
    ],
  });
}

function makeApi({ email = 'user@yper.dev', admin = false } = {}) {
  return {
    auth: { logout: vi.fn() },
    session: { getUser: () => (email ? { email } : null), isAdmin: () => admin },
  };
}

async function mountShell({ api = makeApi(), appName = 'Movix', slots } = {}) {
  const router = makeRouter();
  router.push('/home');
  await router.isReady();

  const i18n = createAppI18n({
    messages: { 'pt-BR': { nav: { home: 'Inicio', products: 'Produtos' } } },
  });

  const shell = createShell({ appName, nav, api, logoUrl: '/logo.png' });

  const wrapper = mount(AppShell, {
    props: { title: 'Painel' },
    slots: slots || { default: 'conteudo', actions: '<button>acao</button>' },
    global: { plugins: [router, i18n, shell] },
  });

  return { wrapper, router, api };
}

describe('AppShell', () => {
  it('renderiza um router-link por item do nav com o label traduzido', async () => {
    const { wrapper } = await mountShell();

    const links = wrapper.find('nav').findAllComponents({ name: 'RouterLink' });
    expect(links).toHaveLength(2);
    expect(wrapper.text()).toContain('Inicio');
    expect(wrapper.text()).toContain('Produtos');
  });

  it('mostra o email do usuario logado', async () => {
    const { wrapper } = await mountShell({ api: makeApi({ email: 'ana@yper.dev' }) });

    expect(wrapper.text()).toContain('ana@yper.dev');
  });

  it('mostra travessao quando nao ha usuario', async () => {
    const { wrapper } = await mountShell({ api: makeApi({ email: null }) });

    expect(wrapper.text()).toContain('—');
  });

  it('clique em Sair chama api.auth.logout sem argumentos e navega para /', async () => {
    const { wrapper, router, api } = await mountShell();
    const push = vi.spyOn(router, 'push');

    const logoutButton = wrapper.findAll('button').find((button) => button.text().includes('Sair'));
    await logoutButton.trigger('click');

    expect(api.auth.logout).toHaveBeenCalledWith();
    expect(push).toHaveBeenCalledWith('/');
  });

  it('erro ao carregar o logo mostra a inicial do appName', async () => {
    const { wrapper } = await mountShell({ appName: 'Movix' });

    await wrapper.find('img').trigger('error');

    expect(wrapper.text()).toContain('M');
  });

  it('renderiza o title e os slots default e actions', async () => {
    const { wrapper } = await mountShell();

    expect(wrapper.text()).toContain('Painel');
    expect(wrapper.text()).toContain('conteudo');
    expect(wrapper.text()).toContain('acao');
  });

  it('admin ve Usuarios e Alterar senha no rodape da sidebar', async () => {
    const { wrapper } = await mountShell({ api: makeApi({ admin: true }) });

    const targets = footLinks(wrapper).map((link) => link.props('to'));
    expect(targets).toEqual(['/users', '/account/password']);
    expect(wrapper.text()).toContain('Usuários');
    expect(wrapper.text()).toContain('Alterar senha');
  });

  it('nao-admin ve so Alterar senha no rodape da sidebar', async () => {
    const { wrapper } = await mountShell({ api: makeApi({ admin: false }) });

    const targets = footLinks(wrapper).map((link) => link.props('to'));
    expect(targets).toEqual(['/account/password']);
    expect(wrapper.text()).not.toContain('Usuários');
  });

  it.each([
    ['link do nav', (wrapper) => wrapper.find('nav a')],
    ['Usuarios', (wrapper) => footLinks(wrapper)[0]],
    ['Alterar senha', (wrapper) => footLinks(wrapper)[1]],
  ])('menu abre a sidebar e clique em %s fecha', async (_name, target) => {
    const { wrapper } = await mountShell({ api: makeApi({ admin: true }) });
    await wrapper.find('header button').trigger('click');
    expect(wrapper.vm.open).toBe(true);

    await target(wrapper).trigger('click');
    expect(wrapper.vm.open).toBe(false);
  });

  it('clique no backdrop fecha a sidebar', async () => {
    const { wrapper } = await mountShell();

    await wrapper.find('header button').trigger('click');
    const backdrop = wrapper.find('aside + div');
    await backdrop.trigger('click');

    expect(wrapper.vm.open).toBe(false);
  });
});

function footLinks(wrapper) {
  return wrapper
    .findAllComponents({ name: 'RouterLink' })
    .filter((link) => !wrapper.find('nav').element.contains(link.element));
}
