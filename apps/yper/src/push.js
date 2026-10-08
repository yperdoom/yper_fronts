import { firebaseConfig, firebaseConfigured, vapidKey } from './firebaseConfig.js';

const STORAGE_KEY = 'yper_push_device';
let messaging;
let registration;
let stopMessages;
let generation = 0;

export function storedDevice() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

export function deviceFor(userId) {
  const device = storedDevice();
  return userId && device?.userId === userId ? device : null;
}

export function pushAvailability() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !navigator.standalone && !window.matchMedia('(display-mode: standalone)').matches) return 'install';
  if (!window.isSecureContext || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
  if (!firebaseConfigured) return 'unconfigured';
  if (Notification.permission === 'denied') return 'denied';
  return 'ready';
}

async function getClient() {
  const [{ initializeApp, getApps }, sdk] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
  if (!await sdk.isSupported()) throw new Error('unsupported');
  if (!messaging) messaging = sdk.getMessaging(getApps()[0] || initializeApp(firebaseConfig));
  if (!registration) {
    registration = await navigator.serviceWorker.register(import.meta.env.DEV ? '/src/push-sw.js' : '/push-sw.js', { type: 'module', scope: '/' });
    registration = await navigator.serviceWorker.ready;
  }
  return { sdk, messaging, registration };
}

export async function enablePush(api, userId, { requestPermission = true } = {}) {
  const started = generation;
  // This must execute before the first await, directly inside the user's click.
  const permission = requestPermission ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') throw new Error(permission === 'denied' ? 'denied' : 'dismissed');
  if (started !== generation) throw new Error('cancelled');
  const client = await getClient();
  if (started !== generation) throw new Error('cancelled');
  const token = await client.sdk.getToken(client.messaging, { vapidKey, serviceWorkerRegistration: client.registration });
  if (started !== generation) { await client.sdk.deleteToken(client.messaging); throw new Error('cancelled'); }
  const { device } = await api.post('/notifications/devices', { token });
  if (started !== generation) { await client.sdk.deleteToken(client.messaging); throw new Error('cancelled'); }
  const saved = { id: device._id, userId };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  stopMessages?.();
  stopMessages = client.sdk.onMessage(client.messaging, async payload => {
    if (!deviceFor(userId)) return;
    // Keep foreground and background behavior consistent, without duplicating the SDK's background display.
    try {
      await client.registration.showNotification(payload.notification?.title || 'Yper', {
        body: payload.notification?.body || '', icon: '/apple-touch-icon.png',
        tag: payload.data?.tag || payload.messageId || 'yper',
        data: { yperLink: payload.data?.path || payload.fcmOptions?.link || '/notifications' },
      });
    } catch { /* Device permissions can change while the page is open. */ }
  });
  return saved;
}

export async function refreshPush(api, userId) {
  const started = generation;
  const local = deviceFor(userId);
  if (!local) return;
  const { devices } = await api.get('/notifications');
  if (started !== generation) return;
  // A remotely revoked device must not silently register itself again.
  if (!devices.some(device => device._id === local.id)) return disablePush(api, userId);
  return enablePush(api, userId, { requestPermission: false });
}

export async function disablePush(api, userId) {
  generation++;
  const device = deviceFor(userId);
  if (device) await api.del(`/notifications/devices/${device.id}`);
  localStorage.removeItem(STORAGE_KEY);
  stopMessages?.();
  if (firebaseConfigured && 'Notification' in window && Notification.permission === 'granted') {
    const client = await getClient();
    await client.sdk.deleteToken(client.messaging);
  }
}

export function detachPushOnLogout(baseUrl, bearer) {
  generation++;
  const device = storedDevice();
  localStorage.removeItem(STORAGE_KEY);
  stopMessages?.();
  if (device && bearer) {
    // Capture the bearer before logout clears it; keepalive survives navigation.
    fetch(`${(baseUrl || '').replace(/\/$/, '')}/yper/notifications/devices/${device.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${bearer}` }, keepalive: true,
    }).catch(() => {});
  }
  if (device) navigator.serviceWorker?.ready.then(reg => reg.pushManager.getSubscription()).then(sub => sub?.unsubscribe()).catch(() => {});
}
