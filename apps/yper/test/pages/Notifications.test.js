import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountPage } from '@yper/test-utils';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  client.session.getUser = vi.fn();
  return { ...client, default: client };
});
vi.mock('../../src/push.js', () => ({ pushAvailability: vi.fn(() => 'ready'), deviceFor: vi.fn(() => null), enablePush: vi.fn(), disablePush: vi.fn() }));
import client, { api, session } from '@/api';
import { enablePush, deviceFor } from '../../src/push.js';
import Notifications from '../../src/pages/Notifications.vue';

beforeEach(() => {
  vi.clearAllMocks();
  session.getUser.mockReturnValue({ id: 'user1' });
  api.get.mockResolvedValue({ configured: true, devices: [], preferences: {
    timezone: 'America/Sao_Paulo', locale: 'pt-BR', reminders: [{ kind: 'weight', time: '07:30', days: [0, 1, 2, 3, 4, 5, 6], enabled: true }],
  } });
  api.put.mockResolvedValue({});
  deviceFor.mockReturnValue(null);
});

describe('Notifications page', () => {
  it('shows editable time and saves selected days and timezone', async () => {
    const { wrapper } = await mountPage(Notifications, { messages: ptBR, api: client });
    expect(wrapper.find('input[type=time]').element.value).toBe('07:30');
    await wrapper.find('input[type=time]').setValue('08:15');
    await wrapper.find('form').trigger('submit');
    expect(api.put).toHaveBeenCalledWith('/notifications/preferences', expect.objectContaining({ timezone: 'America/Sao_Paulo', reminders: [expect.objectContaining({ time: '08:15' })] }));
  });
  it('activates only after the click and saves the displayed schedule', async () => {
    const { wrapper } = await mountPage(Notifications, { messages: ptBR, api: client });
    expect(enablePush).not.toHaveBeenCalled();
    enablePush.mockResolvedValue({ id: 'device1' });
    await wrapper.findAll('button').find(button => button.text() === ptBR.notifications.enable).trigger('click');
    await flushPromises();
    expect(enablePush).toHaveBeenCalledWith(api, 'user1');
    expect(api.put).toHaveBeenCalled();
    expect(wrapper.text()).toContain(ptBR.notifications.activated);
  });
  it('disables activation when server configuration is missing', async () => {
    api.get.mockResolvedValue({ configured: false, devices: [], preferences: { timezone: 'America/Sao_Paulo', reminders: [] } });
    const { wrapper } = await mountPage(Notifications, { messages: ptBR, api: client });
    expect(wrapper.text()).toContain(ptBR.notifications.unconfigured);
    expect(wrapper.findAll('button').find(button => button.text() === ptBR.notifications.enable).attributes('disabled')).toBeDefined();
  });
});
