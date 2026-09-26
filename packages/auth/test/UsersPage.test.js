import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountPage, cleanupPages, createFakeApi } from '@yper/test-utils';
import UsersPage from '../src/UsersPage.vue';

const USERS = [
  { id: 'u1', name: 'Admin', email: 'admin@yper.dev', role: 'admin', apps: ['helake', 'movix', 'yper'], active: true },
  { id: 'u2', name: 'Bia', email: 'bia@yper.dev', role: 'employee', apps: ['movix'], active: false },
];

function makeApi() {
  const api = createFakeApi();
  api.auth.users.list.mockResolvedValue({ users: USERS });
  api.session.getUser = () => USERS[0];
  api.session.isAdmin.mockReturnValue(true);
  return api;
}

async function mountUsers(api = makeApi()) {
  return mountPage(UsersPage, { api });
}

function row(wrapper, email) {
  return wrapper.findAll('tbody tr').find((tr) => tr.text().includes(email));
}

function button(scope, title) {
  return scope.find(`button[title="${title}"]`);
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    cleanupPages();
    vi.restoreAllMocks();
  });

  it('lista nome, e-mail, papel traduzido, apps e status', async () => {
    const { wrapper } = await mountUsers();

    const bia = row(wrapper, 'bia@yper.dev');
    expect(bia.text()).toContain('Bia');
    expect(bia.text()).toContain('Funcionário');
    expect(bia.text()).toContain('Movix');
    expect(bia.text()).toContain('Inativo');
    expect(row(wrapper, 'admin@yper.dev').text()).toContain('Administrador');
    expect(row(wrapper, 'admin@yper.dev').text()).toContain('Ativo');
  });

  it('erro ao carregar a lista mostra alerta', async () => {
    const api = makeApi();
    api.auth.users.list.mockRejectedValue({ code: 'HTTP', message: 'Admin only' });
    await mountUsers(api);

    expect(window.alert).toHaveBeenCalledWith('Apenas administradores podem fazer isso.');
  });

  it('cria usuario com nome, e-mail, senha, papel e apps e recarrega a lista', async () => {
    const { wrapper, body, api } = await mountUsers();

    await wrapper.find('.btn-primary').trigger('click');
    await body.find('#user-name').setValue('Caio');
    await body.find('#user-email').setValue('caio@yper.dev');
    await body.find('#user-password').setValue('secret1');
    await body.find('#user-role').setValue('manager');
    await body.find('input[name="apps"][value="yper"]').setValue(true);
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.auth.users.create).toHaveBeenCalledWith({
      name: 'Caio',
      email: 'caio@yper.dev',
      password: 'secret1',
      role: 'manager',
      apps: ['yper'],
    });
    expect(api.auth.users.list).toHaveBeenCalledTimes(2);
    expect(body.find('[role="dialog"]').exists()).toBe(false);
  });

  it('papel admin marca e trava todos os apps', async () => {
    const { wrapper, body } = await mountUsers();

    await wrapper.find('.btn-primary').trigger('click');
    await body.find('#user-role').setValue('admin');

    const boxes = body.findAll('input[name="apps"]');
    expect(boxes).toHaveLength(3);
    for (const box of boxes) {
      expect(box.element.checked).toBe(true);
      expect(box.element.disabled).toBe(true);
    }
  });

  it('edita usuario sem campo de senha e envia o ativo', async () => {
    const { wrapper, body, api } = await mountUsers();

    await button(row(wrapper, 'bia@yper.dev'), 'Editar').trigger('click');
    expect(body.find('#user-password').exists()).toBe(false);
    expect(body.find('#user-name').element.value).toBe('Bia');

    await body.find('#user-active').setValue(true);
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.auth.users.update).toHaveBeenCalledWith('u2', {
      name: 'Bia',
      email: 'bia@yper.dev',
      role: 'employee',
      apps: ['movix'],
      active: true,
    });
  });

  it('erro conhecido da api ao salvar mostra mensagem traduzida', async () => {
    const api = makeApi();
    api.auth.users.create.mockRejectedValue({ code: 'HTTP', status: 409, message: 'Duplicate value' });
    const { wrapper, body } = await mountUsers(api);

    await wrapper.find('.btn-primary').trigger('click');
    await body.find('#user-email').setValue('bia@yper.dev');
    await body.find('#user-password').setValue('secret1');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith('Já existe um usuário com este e-mail.');
    expect(body.find('[role="dialog"]').exists()).toBe(true);
  });

  it('redefine a senha de um usuario', async () => {
    const { wrapper, body, api } = await mountUsers();

    await button(row(wrapper, 'bia@yper.dev'), 'Redefinir senha').trigger('click');
    expect(body.text()).toContain('Redefinir senha de Bia');
    await body.find('#reset-password').setValue('newpass1');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.auth.users.setPassword).toHaveBeenCalledWith('u2', 'newpass1');
    expect(body.find('[role="dialog"]').exists()).toBe(false);
  });

  it('erro ao redefinir a senha mostra alerta traduzido', async () => {
    const api = makeApi();
    api.auth.users.setPassword.mockRejectedValue({
      code: 'HTTP',
      message: 'Password must have at least 6 characters',
    });
    const { wrapper, body } = await mountUsers(api);

    await button(row(wrapper, 'bia@yper.dev'), 'Redefinir senha').trigger('click');
    await body.find('#reset-password').setValue('123');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith('A senha precisa ter pelo menos 6 caracteres.');
  });

  it('remove com confirmacao e recarrega a lista', async () => {
    const { wrapper, api } = await mountUsers();

    await button(row(wrapper, 'bia@yper.dev'), 'Remover').trigger('click');
    await flushPromises();

    expect(window.confirm).toHaveBeenCalledWith('Remover "Bia"?');
    expect(api.auth.users.remove).toHaveBeenCalledWith('u2');
    expect(api.auth.users.list).toHaveBeenCalledTimes(2);
  });

  it('nao remove quando a confirmacao e cancelada', async () => {
    window.confirm.mockReturnValue(false);
    const { wrapper, api } = await mountUsers();

    await button(row(wrapper, 'bia@yper.dev'), 'Remover').trigger('click');

    expect(api.auth.users.remove).not.toHaveBeenCalled();
  });

  it('erro ao remover mostra alerta', async () => {
    const api = makeApi();
    api.auth.users.remove.mockRejectedValue({ code: 'HTTP', message: 'Not found' });
    const { wrapper } = await mountUsers(api);

    await button(row(wrapper, 'bia@yper.dev'), 'Remover').trigger('click');
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith('Usuário não encontrado.');
  });

  it('na propria linha nao ha remover nem controles de papel e ativo', async () => {
    const { wrapper, body } = await mountUsers();

    const own = row(wrapper, 'admin@yper.dev');
    expect(own.text()).toContain('você');
    expect(button(own, 'Remover').exists()).toBe(false);

    await button(own, 'Editar').trigger('click');
    expect(body.find('#user-role').exists()).toBe(false);
    expect(body.find('#user-active').exists()).toBe(false);
  });

  it('fechar o formulario esconde o modal', async () => {
    const { wrapper, body } = await mountUsers();

    await wrapper.find('.btn-primary').trigger('click');
    await body.find('.btn-icon').trigger('click');

    expect(body.find('[role="dialog"]').exists()).toBe(false);
  });
});
