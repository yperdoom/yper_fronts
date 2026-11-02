import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountPage } from '@yper/test-utils';
import { flushPromises } from '@vue/test-utils';
import ptBR from '../../src/locales/pt-BR.json';
import { moneyToCents } from '../../src/finance.js';
vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi(); return { ...client, default: client };
});
import client, { api } from '@/api';
import Finance from '../../src/pages/Finance.vue';
const account = { _id: 'account', revision: 0, name: 'Principal', kind: 'operational', openingDate: '2026-10-01', openingBalanceCents: 100000 };
beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async path => {
    if (path === '/finance/accounts') return { accounts: [account] };
    if (path === '/finance/entries') return { entries: [] };
    if (path === '/finance/estimates') return { estimates: [] };
    return { accounts: [{ ...account, currentBalanceCents: 100000 }], months: [] };
  });
  api.post.mockResolvedValue({});
});
describe('Finance', () => {
  it('preserves cent precision and rejects ambiguous or fractional-cent amounts', () => {
    expect(moneyToCents('12,34')).toBe(1234);
    expect(moneyToCents('0.29')).toBe(29);
    expect(moneyToCents('-0,01')).toBe(-1);
    for (const v of ['', '1.001', '1.234,50', '1e3', 'NaN']) expect(() => moneyToCents(v)).toThrow();
  });
  it('loads accounts and a 12 month projection without writing records', async () => {
    const { wrapper } = await mountPage(Finance, { messages: ptBR, api: client });
    expect(wrapper.text()).toContain(ptBR.finance.coverage);
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/finance/projection?from='));
    expect(api.post).not.toHaveBeenCalled();
    await wrapper.find('#finance-count').setValue(3);
    await flushPromises();
    expect(api.get).toHaveBeenLastCalledWith(expect.stringContaining('count=3'));
    wrapper.unmount();
  });
  it('creates installment entries with exact cents and specified installment numbers', async () => {
    const { wrapper } = await mountPage(Finance, { messages: ptBR, api: client });
    wrapper.vm.openEntry(); await flushPromises();
    Object.assign(wrapper.vm.form, { description: 'Compra', amount: '123,45', category: 'Casa', repeat: 'installments', installment: 2, totalInstallments: 4 });
    await wrapper.vm.save();
    expect(api.post).toHaveBeenCalledWith('/finance/entries', expect.objectContaining({ amountCents: 12345, installment: 2, totalInstallments: 4, account: 'account' }));
    expect(wrapper.vm.modal).toBe('');
    wrapper.unmount();
  });
  it('keeps the form and entered data on validation failure', async () => {
    const { wrapper } = await mountPage(Finance, { messages: ptBR, api: client });
    wrapper.vm.openEntry(); wrapper.vm.form.amount = '1.001';
    await wrapper.vm.save();
    expect(api.post).not.toHaveBeenCalled();
    expect(wrapper.vm.formError).toBe(ptBR.finance.invalidMoney);
    expect(wrapper.vm.modal).toBe('entries');
    wrapper.unmount();
  });
  it('keeps unknown opening balance distinct from zero', async () => {
    const { wrapper } = await mountPage(Finance, { messages: ptBR, api: client });
    wrapper.vm.openAccount(); wrapper.vm.form.name = 'Reserva'; await wrapper.vm.save();
    expect(api.post).toHaveBeenCalledWith('/finance/accounts', expect.objectContaining({ openingBalanceCents: null }));
    wrapper.unmount();
  });
});
