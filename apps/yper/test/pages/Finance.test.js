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
  it('displays the reported bank balance including zero rather than adding the ledger to it', async () => {
    const get = api.get.getMockImplementation();
    api.get.mockImplementation(async path => path.startsWith('/finance/projection')
      ? { accounts: [{ ...account, currentBalanceCents: 99000, bankBalanceCents: 0, bankBalanceAt: '2026-11-04T12:00:00Z' }], months: [] }
      : get(path));
    const { wrapper } = await mountPage(Finance, { messages: ptBR, api: client });
    expect(wrapper.find('.kpi-value').text()).toContain('0,00');
    expect(wrapper.find('.kpi-hint').text()).toContain(ptBR.banking.reportedBalance);
    expect(wrapper.text()).toContain(ptBR.banking.balanceHint);
    wrapper.unmount();
  });
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
  it('syncs connected bank accounts from the finance page and reloads the projection', async () => {
    const get = api.get.getMockImplementation();
    const recent = new Date(Date.now() - 10 * 60000).toISOString();
    api.get.mockImplementation(async path => path.startsWith('/finance/projection')
      ? { accounts: [{ ...account, bankBalanceCents: 100, bankLastSuccess: recent }], months: [] } : get(path));
    api.post.mockResolvedValue({ results: [{ status: 'ok', imported: 2, updated: 0, transfers: 1 }] });
    const { wrapper } = await mountPage(Finance, { messages: ptBR, api: client });
    expect(api.post).not.toHaveBeenCalled();
    const calls = api.get.mock.calls.filter(([path]) => path.startsWith('/finance/projection')).length;
    await wrapper.find('.sync-banks').trigger('click'); await flushPromises();
    expect(api.post).toHaveBeenCalledWith('/finance/banking/sync', {});
    expect(api.get.mock.calls.filter(([path]) => path.startsWith('/finance/projection')).length).toBeGreaterThan(calls);
    expect(wrapper.text()).toContain('2 incluído(s)');
    wrapper.unmount();
  });
  it('syncs automatically on open when a connected account was read more than one hour ago', async () => {
    const get = api.get.getMockImplementation();
    const stale = new Date(Date.now() - 2 * 3600000).toISOString();
    api.get.mockImplementation(async path => path.startsWith('/finance/projection')
      ? { accounts: [{ ...account, bankBalanceCents: 100, bankLastSuccess: stale }], months: [] } : get(path));
    const { wrapper } = await mountPage(Finance, { messages: ptBR, api: client });
    await flushPromises();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/finance/banking/sync', {});
    wrapper.unmount();
  });
  it('does not show the sync action without connected accounts', async () => {
    const { wrapper } = await mountPage(Finance, { messages: ptBR, api: client });
    expect(wrapper.find('.sync-banks').exists()).toBe(false);
    wrapper.unmount();
  });
});
