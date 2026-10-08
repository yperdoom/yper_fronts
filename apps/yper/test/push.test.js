import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sdk: { isSupported: vi.fn(), getMessaging: vi.fn(), getToken: vi.fn(), deleteToken: vi.fn(), onMessage: vi.fn() },
}));
vi.mock('../src/firebaseConfig.js', () => ({ firebaseConfig: {}, firebaseConfigured: true, vapidKey: 'public-key' }));
vi.mock('firebase/app', () => ({ getApps: () => [], initializeApp: () => ({}) }));
vi.mock('firebase/messaging', () => mocks.sdk);

let push;
let api;
let registration;
beforeEach(async () => {
  vi.resetModules(); localStorage.clear(); vi.clearAllMocks();
  registration = { showNotification: vi.fn(), pushManager: { getSubscription: vi.fn().mockResolvedValue({ unsubscribe: vi.fn() }) } };
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Chrome' });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register: vi.fn().mockResolvedValue(registration), ready: Promise.resolve(registration) } });
  vi.stubGlobal('PushManager', class {});
  vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn().mockResolvedValue('granted') });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}));
  mocks.sdk.isSupported.mockResolvedValue(true);
  mocks.sdk.getMessaging.mockReturnValue({});
  mocks.sdk.getToken.mockResolvedValue('firebase-token');
  mocks.sdk.onMessage.mockReturnValue(vi.fn());
  api = { post: vi.fn().mockResolvedValue({ device: { _id: 'device1' } }), del: vi.fn().mockResolvedValue({}), get: vi.fn() };
  push = await import('../src/push.js');
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('push lifecycle', () => {
  it('requests permission in the click before registration and binds the device to the user', async () => {
    const work = push.enablePush(api, 'user1');
    expect(Notification.requestPermission).toHaveBeenCalledOnce();
    expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
    await work;
    expect(mocks.sdk.getToken).toHaveBeenCalledWith({}, { vapidKey: 'public-key', serviceWorkerRegistration: registration });
    expect(api.post).toHaveBeenCalledWith('/notifications/devices', { token: 'firebase-token' });
    expect(push.deviceFor('user1')).toEqual({ id: 'device1', userId: 'user1' });
    expect(push.deviceFor('user2')).toBeNull();
    expect(localStorage.getItem('yper_push_device')).not.toContain('firebase-token');
  });
  it('does not register when permission is refused', async () => {
    Notification.requestPermission.mockResolvedValue('denied');
    await expect(push.enablePush(api, 'user1')).rejects.toThrow('denied');
    expect(api.post).not.toHaveBeenCalled();
  });
  it('displays foreground reminders with a stable tag and stops after logout', async () => {
    await push.enablePush(api, 'user1');
    const receive = mocks.sdk.onMessage.mock.calls[0][1];
    const message = { notification: { title: 'Yper', body: 'Lembrete' }, data: { tag: 'weight-day', path: '/measurements' } };
    await receive(message);
    expect(registration.showNotification).toHaveBeenCalledWith('Yper', expect.objectContaining({ tag: 'weight-day', data: { yperLink: '/measurements' } }));
    push.detachPushOnLogout('https://api.example.com', 'bearer');
    await receive(message);
    expect(registration.showNotification).toHaveBeenCalledOnce();
  });
  it('refreshes an opted-in device without asking permission again', async () => {
    localStorage.setItem('yper_push_device', JSON.stringify({ id: 'device1', userId: 'user1' }));
    api.get.mockResolvedValue({ devices: [{ _id: 'device1' }] });
    await push.refreshPush(api, 'user1');
    expect(Notification.requestPermission).not.toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledOnce();
  });
  it('does not re-register a device disabled remotely', async () => {
    localStorage.setItem('yper_push_device', JSON.stringify({ id: 'device1', userId: 'user1' }));
    api.get.mockResolvedValue({ devices: [] });
    await push.refreshPush(api, 'user1');
    expect(api.post).not.toHaveBeenCalled();
    expect(mocks.sdk.deleteToken).toHaveBeenCalledOnce();
    expect(push.deviceFor('user1')).toBeNull();
  });
  it('keeps the device reference when the server cannot disable it, allowing a retry', async () => {
    localStorage.setItem('yper_push_device', JSON.stringify({ id: 'device1', userId: 'user1' }));
    api.del.mockRejectedValue(new Error('offline'));
    await expect(push.disablePush(api, 'user1')).rejects.toThrow('offline');
    expect(push.deviceFor('user1')).not.toBeNull();
  });
  it('clears local registration and sends a keepalive unregister on logout', () => {
    localStorage.setItem('yper_push_device', JSON.stringify({ id: 'device1', userId: 'user1' }));
    push.detachPushOnLogout('https://api.example.com/', 'bearer');
    expect(fetch).toHaveBeenCalledWith('https://api.example.com/yper/notifications/devices/device1', expect.objectContaining({ method: 'DELETE', keepalive: true, headers: { Authorization: 'Bearer bearer' } }));
    expect(push.storedDevice()).toBeNull();
  });
  it('does not restore a device when logout happens during activation', async () => {
    let finish;
    api.post.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const work = push.enablePush(api, 'user1');
    const rejected = expect(work).rejects.toThrow('cancelled');
    await vi.waitFor(() => expect(api.post).toHaveBeenCalled());
    push.detachPushOnLogout('https://api.example.com', 'bearer');
    finish({ device: { _id: 'device1' } });
    await rejected;
    expect(push.storedDevice()).toBeNull();
    expect(mocks.sdk.deleteToken).toHaveBeenCalledOnce();
  });
});
