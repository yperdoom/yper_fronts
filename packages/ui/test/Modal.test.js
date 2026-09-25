import { afterEach, describe, expect, it } from 'vitest';
import { mount, DOMWrapper } from '@vue/test-utils';
import { createAppI18n } from '@yper/i18n';
import Modal from '../src/Modal.vue';

// Modal usa Teleport para body: as queries precisam olhar document.body, nao a arvore do wrapper.
let activeWrapper;

afterEach(() => {
  try {
    activeWrapper?.unmount();
  } catch {
    // ja desmontado pelo proprio teste
  }
  activeWrapper = undefined;
});

function mountModal(props = {}) {
  const i18n = createAppI18n({});
  activeWrapper = mount(Modal, {
    props: { show: true, title: 'Produto', ...props },
    global: { plugins: [i18n] },
  });
  return { wrapper: activeWrapper, body: new DOMWrapper(document.body) };
}

describe('Modal', () => {
  it('nao renderiza nada quando show e false', () => {
    const { body } = mountModal({ show: false });

    expect(body.find('[role="dialog"]').exists()).toBe(false);
  });

  it('renderiza o dialogo quando show e true', () => {
    const { body } = mountModal();

    expect(body.find('[role="dialog"]').exists()).toBe(true);
  });

  it('emite close ao clicar no botao de fechar', async () => {
    const { wrapper, body } = mountModal();

    await body.find('.btn-icon').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('emite close ao clicar em cancelar', async () => {
    const { wrapper, body } = mountModal();

    const cancelButton = body.findAll('button').find((button) => button.text() === 'Cancelar');
    await cancelButton.trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('emite close ao clicar no overlay (mousedown.self)', async () => {
    const { wrapper, body } = mountModal();

    const overlay = body.find('[role="dialog"]').element.parentElement;
    await new DOMWrapper(overlay).trigger('mousedown');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('emite submit ao enviar o formulario', async () => {
    const { wrapper, body } = mountModal();

    await body.find('form').trigger('submit');

    expect(wrapper.emitted('submit')).toHaveLength(1);
  });

  it('usa os labels padrao traduzidos para cancelar e salvar', () => {
    const { body } = mountModal();

    const buttons = body.findAll('button').map((button) => button.text());
    expect(buttons).toContain('Cancelar');
    expect(buttons).toContain('Salvar');
  });

  it('submitLabel customizado sobrescreve o padrao', () => {
    const { body } = mountModal({ submitLabel: 'Publicar' });

    expect(body.text()).toContain('Publicar');
  });

  it('saving desabilita o submit e mostra o label de salvando', () => {
    const { body } = mountModal({ saving: true });

    const submitButton = body.find('button[type="submit"]');
    expect(submitButton.attributes('disabled')).toBeDefined();
    expect(body.text()).toContain('Salvando...');
  });

  it('trava e destrava o scroll do body conforme show muda', async () => {
    const { wrapper } = mountModal({ show: false });
    expect(document.body.style.overflow).toBe('');

    await wrapper.setProps({ show: true });
    expect(document.body.style.overflow).toBe('hidden');

    await wrapper.setProps({ show: false });
    expect(document.body.style.overflow).toBe('');
  });

  it('restaura o overflow do body ao desmontar', async () => {
    const { wrapper } = mountModal({ show: false });

    await wrapper.setProps({ show: true });
    expect(document.body.style.overflow).toBe('hidden');

    wrapper.unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
