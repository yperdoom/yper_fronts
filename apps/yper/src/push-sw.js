import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { firebaseConfig, firebaseConfigured } from './firebaseConfig.js';

// FCM displays notification payloads and handles their same-origin click links.
// No cache: authenticated API responses must never be retained by this worker.
self.addEventListener('notificationclick', event => {
  const path = event.notification.data?.yperLink;
  if (!path) return;
  event.stopImmediatePropagation();
  event.notification.close();
  const url = new URL(path, self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil(self.clients.openWindow(url.href));
});
if (firebaseConfigured) {
  onBackgroundMessage(getMessaging(initializeApp(firebaseConfig)), () => {});
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
