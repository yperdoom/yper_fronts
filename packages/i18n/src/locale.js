export const SUPPORTED_LOCALES = Object.freeze(['pt-BR', 'en-US']);
export const DEFAULT_LOCALE = 'pt-BR';

function storageKey(app) {
  return `${app}_locale`;
}

export function setDocumentLang(locale) {
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
}

/** Idioma salvo do app; sem valor valido, pt-BR. */
export function loadLocale(app, storage = globalThis.localStorage) {
  const stored = storage?.getItem(storageKey(app));
  return SUPPORTED_LOCALES.includes(stored) ? stored : DEFAULT_LOCALE;
}

/** Persiste o idioma do app e atualiza <html lang>. */
export function saveLocale(app, locale, storage = globalThis.localStorage) {
  storage?.setItem(storageKey(app), locale);
  setDocumentLang(locale);
}
