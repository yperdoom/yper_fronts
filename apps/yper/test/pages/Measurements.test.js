import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountPage, cleanupPages } from '@yper/test-utils';
import { number, date, toDateInput } from '@yper/i18n';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';
import Measurements from '../../src/pages/Measurements.vue';

const SERVER_FIELDS = { createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' };
const M1 = { _id: 'm1', date: '2024-03-10', weightKg: 79.5, bodyFatPercentage: 15.2, chestCm: 100, waistCm: 80, hipCm: 95, armCm: 35, thighCm: 55, notes: '', ...SERVER_FIELDS };
const M2 = { _id: 'm2', date: '2024-02-10', weightKg: 81, bodyFatPercentage: 16, chestCm: 99, waistCm: 82, hipCm: 96, armCm: 34, thighCm: 54, notes: '', ...SERVER_FIELDS };
const M3 = { _id: 'm3', date: '2024-01-10', weightKg: 83, bodyFatPercentage: null, chestCm: null, waistCm: null, hipCm: null, armCm: null, thighCm: null, notes: 'primeira medicao', ...SERVER_FIELDS };

async function mountMeasurements(measurements = [M1, M2, M3]) {
  api.get.mockReset();
  api.get.mockImplementation(async () => ({ measurements }));
  return mountPage(Measurements, { messages: ptBR, api: client });
}

async function submit(body) {
  await body.find('form').trigger('submit');
  await flushPromises();
}

describe('Measurements', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2024-03-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    cleanupPages();
  });

  it('carrega medicoes e renderiza kpis, grafico e tabela', async () => {
    const { wrapper } = await mountMeasurements();

    expect(api.get).toHaveBeenCalledWith('/measurements');
    expect(wrapper.text()).toContain(`${number(79.5, 1)} kg`);
    expect(wrapper.text()).toContain(`${number(-3.5, 1)} kg`);
    expect(wrapper.text()).not.toContain(`+${number(-3.5, 1)}`);
    expect(wrapper.text()).toContain(`${number(15.2, 1)}%`);
    expect(wrapper.text()).toContain(`desde ${date('2024-01-10')}`);

    expect(wrapper.find('svg').exists()).toBe(true);
    expect(wrapper.findAll('circle')).toHaveLength(3);

    expect(wrapper.text()).toContain('3 registro(s)');
    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(3);
    expect(rows[2].text()).toContain('—');
    expect(rows[2].text()).toContain(date('2024-01-10'));
  });

  it('nao renderiza grafico nem kpi de variacao com apenas uma medicao', async () => {
    const { wrapper } = await mountMeasurements([M1]);

    expect(wrapper.find('svg').exists()).toBe(false);
    expect(wrapper.text()).toContain(`${number(0, 1)} kg`);
  });

  it('mostra mensagem vazia quando nao ha medicoes', async () => {
    const { wrapper } = await mountMeasurements([]);
    expect(wrapper.text()).toContain('Registre sua primeira medição para acompanhar a evolução.');
  });

  it('cria uma medicao com os campos preenchidos e envia o payload correto', async () => {
    const { wrapper, body } = await mountMeasurements([]);

    await wrapper.find('button.btn-primary').trigger('click');
    await flushPromises();

    await body.find('#weightKg').setValue(78.2);
    await body.find('#bodyFat').setValue(14.5);
    await body.find('#chest').setValue(98);
    await body.find('#waist').setValue(79);
    await body.find('#hip').setValue(94);
    await body.find('#arm').setValue(33);
    await body.find('#thigh').setValue(53);
    await body.find('#notes').setValue('boa evolucao');

    await submit(body);

    expect(api.post).toHaveBeenCalledWith('/measurements', {
      date: toDateInput(),
      weightKg: 78.2,
      bodyFatPercentage: 14.5,
      chestCm: 98,
      waistCm: 79,
      hipCm: 94,
      armCm: 33,
      thighCm: 53,
      notes: 'boa evolucao',
    });
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('edita uma medicao existente pre-preenchendo o formulario e envia PUT', async () => {
    const { wrapper, body } = await mountMeasurements();

    const editButtons = wrapper.findAll('button[title="Editar"]');
    await editButtons[0].trigger('click');
    await flushPromises();

    expect(body.find('#weightKg').element.value).toBe('79.5');
    await body.find('#weightKg').setValue(79);
    await submit(body);

    expect(api.put).toHaveBeenCalledWith('/measurements/m1', {
      date: toDateInput('2024-03-10'),
      weightKg: 79,
      bodyFatPercentage: 15.2,
      chestCm: 100,
      waistCm: 80,
      hipCm: 95,
      armCm: 35,
      thighCm: 55,
      notes: '',
    });
  });

  it('remove uma medicao apenas quando o usuario confirma', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { wrapper } = await mountMeasurements();

    const removeButtons = wrapper.findAll('button[title="Remover"]');
    await removeButtons[0].trigger('click');
    expect(confirmSpy).toHaveBeenCalledWith(`Remover a medição de ${date('2024-03-10')}?`);
    expect(api.del).not.toHaveBeenCalled();

    await removeButtons[0].trigger('click');
    await flushPromises();
    expect(api.del).toHaveBeenCalledWith('/measurements/m1');
  });

  it('mostra alerta de erro quando o carregamento falha', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    api.get.mockReset();
    api.get.mockImplementation(async () => { throw new Error('sem conexao'); });

    await mountPage(Measurements, { messages: ptBR, api: client });

    expect(alertSpy).toHaveBeenCalledWith('sem conexao');
  });
});
