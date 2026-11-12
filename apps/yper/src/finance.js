export function moneyToCents(value) {
  const input = String(value).trim().replace(',', '.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(input)) throw new Error('Invalid money');
  const [whole, decimal = ''] = input.replace('-', '').split('.');
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || Math.abs(cents) > 1e9) throw new Error('Invalid money');
  return input.startsWith('-') ? -cents : cents;
}
export const centsInput = value => value == null ? '' : (value / 100).toFixed(2);
const monthIndex = month => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7));
export function activeIn(entry, month) {
  if (!month) return true;
  const start = entry.date.slice(0, 7);
  if (month < start) return false;
  if (entry.repeat === 'once') return month === start;
  if (entry.repeat === 'installments') return monthIndex(month) - monthIndex(start) <= entry.totalInstallments - entry.installment;
  return !entry.endDate || month <= entry.endDate.slice(0, 7);
}
