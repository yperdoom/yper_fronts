import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createAppI18n } from '@yper/i18n';
import { createShell } from '@yper/ui';
import LoginPage from '../src/LoginPage.vue';

function makeAuth(overrides = {}) {
  return {
    status: vi.fn().mockResolvedValue({ initialized: true }),
    login: vi.fn().mockResolvedValue({}),
    setup: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Login', component: LoginPage, meta: { public: true } },
      { path: '/home', name: 'Home', component: { template: '<div/>' } },
      { path: '/produtos', name: 'Products', component: { template: '<div/>' } },
    ],
  });
}

async function mountLogin({ auth = makeAuth(), query = {}, props = {} } = {}) {
  const router = makeRouter();
  router.push({ path: '/', query });
  await router.isReady();

  const i18n = createAppI18n({});
  const shell = createShell({ appName: 'Movix', nav: [], api: { auth } });

  const wrapper = mount(LoginPage, {
    props,
    global: { plugins: [router, i18n, shell] },
  });

  await flushPromises();
  return { wrapper, router, auth };
}

describe('LoginPage', () => {
  it('mostra campo nome e botao "Criar conta" quando a base ainda nao tem usuario', async () => {
    const auth = makeAuth({ status: vi.fn().mockResolvedValue({ initialized: false }) });
    const { wrapper } = await mountLogin({ auth });

    expect(wrapper.find('#name').exists()).toBe(true);
    expect(wrapper.text()).toContain('Criar conta');
    expect(wrapper.text()).toContain('Nenhuma conta cadastrada ainda');
  });

  it('permanece em modo login quando auth.status falha', async () => {
    const auth = makeAuth({ status: vi.fn().mockRejectedValue(new Error('fail')) });
    const { wrapper } = await mountLogin({ auth });

    expect(wrapper.find('#name').exists()).toBe(false);
    expect(wrapper.text()).toContain('Entrar');
  });

  it.each([['<html>'], [{}]])('permanece em modo login quando auth.status responde %j', async (response) => {
    const auth = makeAuth({ status: vi.fn().mockResolvedValue(response) });
    const { wrapper } = await mountLogin({ auth });

    expect(wrapper.find('#name').exists()).toBe(false);
  });

  it('submit em modo login chama auth.login e navega para o redirect informado', async () => {
    const auth = makeAuth();
    const { wrapper, router } = await mountLogin({ auth, query: { redirect: '/produtos' } });

    await wrapper.find('#email').setValue('ana@yper.dev');
    await wrapper.find('#password').setValue('segredo123');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(auth.login).toHaveBeenCalledWith('ana@yper.dev', 'segredo123');
    expect(router.currentRoute.value.path).toBe('/produtos');
  });

  it('submit em modo login sem redirect navega para /home', async () => {
    const auth = makeAuth();
    const { wrapper, router } = await mountLogin({ auth });

    await wrapper.find('#email').setValue('ana@yper.dev');
    await wrapper.find('#password').setValue('segredo123');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/home');
  });

  it('submit em modo setup chama auth.setup com nome, email e senha', async () => {
    const auth = makeAuth({ status: vi.fn().mockResolvedValue({ initialized: false }) });
    const { wrapper } = await mountLogin({ auth });

    await wrapper.find('#name').setValue('Ana');
    await wrapper.find('#email').setValue('ana@yper.dev');
    await wrapper.find('#password').setValue('segredo123');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(auth.setup).toHaveBeenCalledWith('Ana', 'ana@yper.dev', 'segredo123');
  });

  it('setup rejeitado com status 403 volta para o modo login e mostra o erro', async () => {
    const forbidden = Object.assign(new Error('Cadastro ja realizado'), { status: 403, code: 'HTTP' });
    const auth = makeAuth({
      status: vi.fn().mockResolvedValue({ initialized: false }),
      setup: vi.fn().mockRejectedValue(forbidden),
    });
    const { wrapper } = await mountLogin({ auth });

    await wrapper.find('#name').setValue('Ana');
    await wrapper.find('#email').setValue('ana@yper.dev');
    await wrapper.find('#password').setValue('segredo123');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('#name').exists()).toBe(false);
    expect(wrapper.text()).toContain('Cadastro ja realizado');
  });

  it('erro de rede exibe a mensagem traduzida', async () => {
    const auth = makeAuth({ login: vi.fn().mockRejectedValue({ code: 'NETWORK' }) });
    const { wrapper } = await mountLogin({ auth });

    await wrapper.find('#email').setValue('ana@yper.dev');
    await wrapper.find('#password').setValue('segredo123');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Não foi possível falar com o servidor. Tente de novo.');
  });

  it('erro HTTP exibe a mensagem vinda da api', async () => {
    const auth = makeAuth({
      login: vi.fn().mockRejectedValue({ code: 'HTTP', message: 'Credenciais invalidas' }),
    });
    const { wrapper } = await mountLogin({ auth });

    await wrapper.find('#email').setValue('ana@yper.dev');
    await wrapper.find('#password').setValue('segredo123');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Credenciais invalidas');
  });

  it('erro ao carregar o wordmark mostra o appName no h1 e a tagline', async () => {
    const { wrapper } = await mountLogin({ props: { tagline: 'Controle de estoque e notas' } });

    await wrapper.find('img').trigger('error');

    expect(wrapper.find('h1').text()).toBe('Movix');
    expect(wrapper.text()).toContain('Controle de estoque e notas');
  });

  it('desabilita o botao e mostra "Aguarde..." durante o carregamento', async () => {
    let resolveLogin;
    const auth = makeAuth({
      login: vi.fn().mockReturnValue(new Promise((resolve) => { resolveLogin = resolve; })),
    });
    const { wrapper } = await mountLogin({ auth });

    await wrapper.find('#email').setValue('ana@yper.dev');
    await wrapper.find('#password').setValue('segredo123');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const button = wrapper.find('button[type="submit"]');
    expect(button.attributes('disabled')).toBeDefined();
    expect(button.text()).toBe('Aguarde...');

    resolveLogin({});
    await flushPromises();
  });
});
