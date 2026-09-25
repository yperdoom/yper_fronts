export const SHELL_KEY = 'yperShell';

export function createShell({ appName, nav, api, logoUrl = '/logo.png' }) {
  return {
    install(app) {
      app.provide(SHELL_KEY, { appName, nav, api, logoUrl });
    },
  };
}
