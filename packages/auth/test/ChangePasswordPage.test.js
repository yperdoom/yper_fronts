import { describe, it, expect, afterEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountPage, cleanupPages, createFakeApi } from '@yper/test-utils';
import ChangePasswordPage from '../src/ChangePasswordPage.vue';

async function fill(wrapper, { current = 'old123', next = 'new123', confirm = next } = {}) {
  await wrapper.find('#current-password').setValue(current);
  await wrapper.find('#new-password').setValue(next);
  await wrapper.find('#confirm-password').setValue(confirm);
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

describe('ChangePasswordPage', () => {
  afterEach(cleanupPages);

  it('envia senha atual e nova, mostra sucesso e limpa os campos', async () => {
    const { wrapper, api } = await mountPage(ChangePasswordPage);

    await fill(wrapper);

    expect(api.auth.changePassword).toHaveBeenCalledWith('old123', 'new123');
    expect(wrapper.text()).toContain('Senha alterada com sucesso.');
    expect(wrapper.find('#current-password').element.value).toBe('');
    expect(wrapper.find('#new-password').element.value).toBe('');
    expect(wrapper.find('#confirm-password').element.value).toBe('');
  });

  it('confirmacao diferente nao chama a api e mostra erro traduzido', async () => {
    const { wrapper, api } = await mountPage(ChangePasswordPage);

    await fill(wrapper, { next: 'new123', confirm: 'other123' });

    expect(api.auth.changePassword).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('A confirmação não confere com a nova senha.');
  });

  it('nova senha curta nao chama a api e mostra erro traduzido', async () => {
    const { wrapper, api } = await mountPage(ChangePasswordPage);

    await fill(wrapper, { next: '123' });

    expect(api.auth.changePassword).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('A senha precisa ter pelo menos 6 caracteres.');
  });

  it('senha atual errada (400 da api) mostra mensagem traduzida', async () => {
    const api = createFakeApi();
    api.auth.changePassword.mockRejectedValue({ code: 'HTTP', status: 400, message: 'Current password is incorrect' });
    const { wrapper } = await mountPage(ChangePasswordPage, { api });

    await fill(wrapper);

    expect(wrapper.text()).toContain('Senha atual incorreta.');
    expect(wrapper.text()).not.toContain('Senha alterada com sucesso.');
  });
});
