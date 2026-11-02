export function moneyToCents(value) {
  const input = String(value).trim().replace(',', '.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(input)) throw new Error('Invalid money');
  const [whole, decimal = ''] = input.replace('-', '').split('.');
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || Math.abs(cents) > 1e9) throw new Error('Invalid money');
  return input.startsWith('-') ? -cents : cents;
}
export const centsInput = value => value == null ? '' : (value / 100).toFixed(2);
