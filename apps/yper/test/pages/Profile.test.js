import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountPage } from '@yper/test-utils';
import { number, toDateInput } from '@yper/i18n';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';
import Profile from '../../src/pages/Profile.vue';

const PROFILE = {
  birthDate: '1990-05-20',
  heightCm: 180,
  goal: 'bulk',
  dailyCalories: 2000,
  proteinTarget: 100,
  carbsTarget: 100,
  fatTarget: 50,
  workoutDaysPerWeek: 5,
};

async function mountProfile(profile = PROFILE) {
  api.get.mockReset();
  api.get.mockImplementation(async () => ({ profile }));
  return mountPage(Profile, { messages: ptBR, api: client });
}

describe('Profile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('carrega o perfil e preenche o formulario, incluindo a conversao da data de nascimento', async () => {
    const { wrapper } = await mountProfile();

    expect(api.get).toHaveBeenCalledWith('/profile');
    expect(wrapper.find('#birthDate').element.value).toBe(toDateInput('1990-05-20'));
    expect(wrapper.find('#heightCm').element.value).toBe('180');
    expect(wrapper.find('#goal').element.value).toBe('bulk');
    expect(wrapper.find('#workoutDays').element.value).toBe('5');
    expect(wrapper.find('#dailyCalories').element.value).toBe('2000');

    // 100*4 + 100*4 + 50*9 = 1250, mais de 50 kcal de diferenca da meta (2000) -> aviso
    expect(wrapper.text()).toContain(`macros somam ${number(1250)} kcal`);
    expect(wrapper.find('.badge').classes()).toContain('badge-warn');
  });

  it('usa placeholder vazio quando o perfil nao tem data de nascimento', async () => {
    const { wrapper } = await mountProfile({ ...PROFILE, birthDate: null });
    expect(wrapper.find('#birthDate').element.value).toBe('');
  });

  it('atualiza o badge de macros em tempo real conforme os alvos mudam', async () => {
    const { wrapper } = await mountProfile();

    await wrapper.find('#proteinTarget').setValue(125);
    await wrapper.find('#carbsTarget').setValue(175);
    await wrapper.find('#fatTarget').setValue(56);
    // 125*4 + 175*4 + 56*9 = 500 + 700 + 504 = 1704, ainda com aviso pois a diferenca > 50
    expect(wrapper.text()).toContain(`macros somam ${number(1704)} kcal`);

    await wrapper.find('#dailyCalories').setValue(1704);
    expect(wrapper.find('.badge').classes()).toContain('badge-ok');
  });

  it('salva as metas, envia o payload correto e mostra a mensagem de sucesso por um tempo', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout'] });
    const { wrapper } = await mountProfile({ ...PROFILE, birthDate: '' });

    await wrapper.find('#heightCm').setValue(182);
    await wrapper.find('form').trigger('submit');
    await Promise.resolve();
    await Promise.resolve();

    expect(api.put).toHaveBeenCalledWith('/profile', {
      birthDate: null,
      heightCm: 182,
      goal: 'bulk',
      dailyCalories: 2000,
      proteinTarget: 100,
      carbsTarget: 100,
      fatTarget: 50,
      workoutDaysPerWeek: 5,
    });

    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Metas salvas.');

    vi.advanceTimersByTime(3000);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).not.toContain('Metas salvas.');
  });

  it('mostra alerta de erro quando o carregamento do perfil falha', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    api.get.mockReset();
    api.get.mockImplementation(async () => { throw new Error('sem conexao'); });

    await mountPage(Profile, { messages: ptBR, api: client });

    expect(alertSpy).toHaveBeenCalledWith('sem conexao');
  });

  it('mostra alerta de erro quando salvar falha', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { wrapper } = await mountProfile();

    api.put.mockRejectedValueOnce(new Error('falha ao salvar'));
    await wrapper.find('form').trigger('submit');
    await Promise.resolve();
    await Promise.resolve();

    expect(alertSpy).toHaveBeenCalledWith('falha ao salvar');
  });
});
