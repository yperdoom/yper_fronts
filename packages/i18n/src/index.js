import { createI18n } from 'vue-i18n';
import ptBR from './locales/pt-BR.json' with { type: 'json' };
import enUS from './locales/en-US.json' with { type: 'json' };
import { setActiveI18n } from './format.js';

const commonMessages = { 'pt-BR': ptBR, 'en-US': enUS };

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    result[key] = isPlainObject(override[key]) && isPlainObject(result[key])
      ? deepMerge(result[key], override[key])
      : override[key];
  }
  return result;
}

export function createAppI18n({ messages = {}, locale = 'pt-BR' } = {}) {
  const locales = new Set([...Object.keys(commonMessages), ...Object.keys(messages)]);
  const mergedMessages = {};
  for (const loc of locales) {
    mergedMessages[loc] = deepMerge(commonMessages[loc] || {}, messages[loc] || {});
  }

  const i18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'pt-BR',
    messages: mergedMessages,
  });

  setActiveI18n(i18n);
  return i18n;
}

export { currency, number, date, dateTime, toDateInput } from './format.js';

export function errorMessage(t, err) {
  if (err?.code === 'NETWORK' || err?.code === 'UNAUTHORIZED') {
    return t(`errors.${err.code}`);
  }
  return err?.message;
}
