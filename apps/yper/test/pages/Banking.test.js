import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountPage } from '@yper/test-utils';
import { flushPromises } from '@vue/test-utils';
import ptBR from '../../src/locales/pt-BR.json';
vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi(); return { ...client, default: client };
});
import client, { api } from '@/api';
import Banking from '../../src/pages/Banking.vue';
const row = { _id: 'movement', account: 'account', description: 'Academia X', date: '2026-10-28', amountCents: 12000, direction: 'expense', bankStatus: 'POSTED', state: 'review', category: 'Academia', categorySource: 'rule', revision: 2, canRemember: true };
beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async path => {
    if (path === '/finance/banking') return { configured: false, links: [], rules: [], pending: 1 };
    if (path === '/finance/accounts') return { accounts: [{ _id: 'account', name: 'Nubank' }] };
    if (path.includes('/candidates')) return { manual: [], similar: [], transfers: [] };
    return { rows: [row], total: 1 };
  });
  api.post.mockResolvedValue({});
});
describe('Banking', () => {
  it('shows setup and incomplete totals without contacting a bank on mount', async () => {
    const { wrapper } = await mountPage(Banking, { messages: ptBR, api: client });
    expect(wrapper.text()).toContain(ptBR.banking.setup);
    expect(wrapper.text()).toContain(ptBR.banking.automatic);
    expect(api.post).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Pendências novas não entram nos totais');
    wrapper.unmount();
  });
  it('requires an explicit new-entry decision and sends category scope with revision', async () => {
    const { wrapper } = await mountPage(Banking, { messages: ptBR, api: client });
    await wrapper.vm.openReview(row);
    await wrapper.vm.decide();
    expect(api.post).not.toHaveBeenCalled();
    expect(wrapper.vm.formError).toBe(ptBR.banking.confirmNew);
    Object.assign(wrapper.vm.form, { confirmNew: true, remember: true, scope: 'all' });
    await wrapper.vm.decide();
    expect(api.post).toHaveBeenCalledWith('/finance/banking/movements/movement/decision', expect.objectContaining({ revision: 2, action: 'new', category: 'Academia', remember: true, scope: 'all' }));
    expect(wrapper.vm.selected).toBeNull();
    wrapper.unmount();
  });
  it('preserves the form when the server rejects a stale decision', async () => {
    const { wrapper } = await mountPage(Banking, { messages: ptBR, api: client });
    await wrapper.vm.openReview(row); wrapper.vm.form.confirmNew = true;
    api.post.mockRejectedValueOnce(new Error('Conflict'));
    await wrapper.vm.decide();
    expect(wrapper.vm.selected._id).toBe('movement');
    expect(wrapper.vm.form.category).toBe('Academia');
    expect(wrapper.vm.formError).toBeTruthy();
    wrapper.unmount();
  });
  it('does not offer confirmation of bank-pending items', async () => {
    const { wrapper } = await mountPage(Banking, { messages: ptBR, api: client });
    wrapper.vm.rows = [{ ...row, bankStatus: 'PENDING' }]; await flushPromises();
    const review = wrapper.findAll('button').find(b => b.text() === ptBR.banking.reviewAction);
    expect(review.attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });
  it('categorizes an included page in one request without recreating amounts', async () => {
    const { wrapper } = await mountPage(Banking, { messages: ptBR, api: client });
    const accepted = [{ ...row, state: 'accepted', decision: 'auto' }, { ...row, _id: 'second', state: 'accepted', decision: 'auto' }];
    wrapper.vm.openCategories(accepted); wrapper.vm.categoryForm.category = 'Saúde';
    await wrapper.vm.saveCategories();
    expect(api.post).toHaveBeenCalledWith('/finance/banking/categorize', { items: [{ id: 'movement', revision: 2 }, { id: 'second', revision: 2 }], category: 'Saúde', remember: false, scope: 'account' });
    expect(wrapper.vm.categoryRows).toEqual([]); wrapper.unmount();
  });
  it('updates all accounts with one action and reports partial failures', async () => {
    const { wrapper } = await mountPage(Banking, { messages: ptBR, api: client });
    api.post.mockResolvedValueOnce({ results: [{ status: 'ok', imported: 7, updated: 2 }, { status: 'error' }] });
    await wrapper.vm.syncAll();
    expect(api.post).toHaveBeenCalledWith('/finance/banking/sync', {});
    expect(wrapper.vm.syncMessage).toContain('7 incluído(s)');
    expect(wrapper.vm.syncMessage).toContain(ptBR.banking.syncPartial);
    wrapper.unmount();
  });
});
