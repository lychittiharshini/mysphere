export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD';

export interface CurrencyOption {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-IE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
];

export function getCurrencyOption(rawCode?: string): CurrencyOption {
  const upper = (rawCode || 'USD').toUpperCase();
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === upper) ||
    SUPPORTED_CURRENCIES[1] // USD default fallback
  );
}

export function formatMoney(amount: number, rawCode?: string): string {
  const opt = getCurrencyOption(rawCode);
  return new Intl.NumberFormat(opt.locale, {
    style: 'currency',
    currency: opt.code,
    maximumFractionDigits: opt.code === 'JPY' ? 0 : 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}
