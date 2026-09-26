import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountPage, cleanupPages } from '@yper/test-utils';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';

import Settings from '../../src/pages/Settings.vue';

const SETTINGS = {
  businessName: 'Doce Sabor Confeitaria',
  ownerName: 'Ana Souza',
  whatsapp: '11999998888',
  currency: 'USD',
  gas: 120,
  electricity: 300,
  water: 80,
  monthlyHours: 176,
  defaultInfraPercentage: 20,
  defaultMargin: 60,
};

async function mountSettings() {
  return mountPage(Settings, { messages: ptBR, api: client, route: '/settings' });
}

afterEach(cleanupPages);

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (path) => {
    if (path === '/settings') return { settings: structuredClone(SETTINGS) };
    return [];
  });
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('Settings', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('carrega as configuracoes e preenche o formulario, completando com os valores padrao', async () => {
    const { wrapper } = await mountSettings();

    expect(api.get).toHaveBeenCalledWith('/settings');
    expect(wrapper.find('#ownerName').element.value).toBe('Ana Souza');
    expect(wrapper.find('#whatsapp').element.value).toBe('11999998888');
    expect(wrapper.find('#businessName').element.value).toBe('Doce Sabor Confeitaria');
    expect(wrapper.find('#currency').element.value).toBe('USD');
    expect(wrapper.find('#defaultMargin').element.value).toBe('60');
    expect(wrapper.find('#gas').element.value).toBe('120');
    expect(wrapper.find('#electricity').element.value).toBe('300');
    expect(wrapper.find('#water').element.value).toBe('80');
    // "other" nao veio da API, entao usa o valor padrao (0)
    expect(wrapper.find('#other').element.value).toBe('0');
    expect(wrapper.find('#monthlyHours').element.value).toBe('176');
    expect(wrapper.find('#defaultInfraPercentage').element.value).toBe('20');
  });

  it('salva as configuracoes, envia o payload completo e mostra a mensagem de sucesso por um tempo', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout'] });
    const { wrapper } = await mountSettings();

    await wrapper.find('#ownerName').setValue('Ana Souza Lima');
    await wrapper.find('#whatsapp').setValue('11999997777');
    await wrapper.find('#businessName').setValue('Doce Sabor Bakery');
    await wrapper.find('#currency').setValue('BRL');
    await wrapper.find('#defaultMargin').setValue('65');
    await wrapper.find('#gas').setValue('130');
    await wrapper.find('#electricity').setValue('310');
    await wrapper.find('#water').setValue('90');
    await wrapper.find('#other').setValue('15');
    await wrapper.find('#monthlyHours').setValue('180');
    await wrapper.find('#defaultInfraPercentage').setValue('25');
    await wrapper.find('form').trigger('submit');
    await Promise.resolve();
    await Promise.resolve();

    expect(api.put).toHaveBeenCalledWith('/settings', {
      businessName: 'Doce Sabor Bakery',
      ownerName: 'Ana Souza Lima',
      whatsapp: '11999997777',
      currency: 'BRL',
      gas: 130,
      electricity: 310,
      water: 90,
      other: 15,
      monthlyHours: 180,
      defaultInfraPercentage: 25,
      defaultMargin: 65,
    });

    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Configurações salvas.');

    vi.advanceTimersByTime(3000);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).not.toContain('Configurações salvas.');
  });

  it('mostra alerta de erro traduzido quando o carregamento das configuracoes falha', async () => {
    api.get.mockImplementation(async () => {
      throw { code: 'NETWORK' };
    });

    await mountSettings();

    expect(window.alert).toHaveBeenCalledWith('Não foi possível falar com o servidor. Tente de novo.');
  });

  it('mostra alerta de erro quando salvar falha', async () => {
    const { wrapper } = await mountSettings();
    api.put.mockRejectedValueOnce({ message: 'Valor invalido' });

    await wrapper.find('form').trigger('submit');
    await Promise.resolve();
    await Promise.resolve();

    expect(window.alert).toHaveBeenCalledWith('Valor invalido');
  });
});
