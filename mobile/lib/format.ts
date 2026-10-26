const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Formats a USD amount: 1250 → "$1,250.00". */
export function formatMoney(amount: number): string {
  return usd.format(Number.isFinite(amount) ? amount : 0);
}

/** Formats a signed amount for activity lists: +$300.00 / −$120.00 (true minus sign). */
export function formatSignedMoney(amount: number, direction: 'in' | 'out'): string {
  return `${direction === 'in' ? '+' : '−'}${formatMoney(Math.abs(amount))}`;
}
