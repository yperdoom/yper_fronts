// O script inline de cada index.html repete loadTheme + applyTheme para aplicar o tema antes do app montar.
const THEMES = Object.freeze(['light', 'dark']);
const DARK_QUERY = '(prefers-color-scheme: dark)';

function storageKey(app) {
  return `${app}_theme`;
}

/** Tema salvo do app; sem valor valido, segue prefers-color-scheme. */
export function loadTheme(app, { storage = globalThis.localStorage, matchMedia = globalThis.matchMedia } = {}) {
  const stored = storage?.getItem(storageKey(app));
  if (THEMES.includes(stored)) return stored;
  return typeof matchMedia === 'function' && matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

/** Alterna o tema, aplica no <html> e persiste. Retorna o novo tema. */
export function toggleTheme(app, current, storage = globalThis.localStorage) {
  const next = current === 'dark' ? 'light' : 'dark';
  storage?.setItem(storageKey(app), next);
  applyTheme(next);
  return next;
}
