let activeI18n = null;

/** Guarda a instancia criada por createAppI18n para os formatters lerem o locale ativo. */
export function setActiveI18n(i18n) {
  activeI18n = i18n;
}

function activeLocale() {
  return activeI18n?.global?.locale?.value || 'pt-BR';
}

export function currency(value) {
  return (value || 0).toLocaleString(activeLocale(), { style: 'currency', currency: 'BRL' });
}

export function date(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(activeLocale());
}

export function dateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(activeLocale(), {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export function number(value, digits = 0) {
  return (value || 0).toLocaleString(activeLocale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Converte uma data qualquer para o formato aceito por <input type="date">. */
export function toDateInput(value) {
  const d = value ? new Date(value) : new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}
