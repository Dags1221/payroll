// Multi-currency executive converter utility

export type CurrencyCode = 'PHP' | 'USD' | 'EUR' | 'SGD' | 'JPY';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  rate: number; // against PHP baseline
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  PHP: { code: 'PHP', symbol: '₱', rate: 1.0, locale: 'en-PH' },
  USD: { code: 'USD', symbol: '$', rate: 0.0178, locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', rate: 0.0162, locale: 'de-DE' },
  SGD: { code: 'SGD', symbol: 'S$', rate: 0.0232, locale: 'en-SG' },
  JPY: { code: 'JPY', symbol: '¥', rate: 2.68, locale: 'ja-JP' },
};

export function convertAmount(amountInPhp: number, currency: CurrencyCode = 'PHP'): number {
  const config = CURRENCIES[currency] || CURRENCIES.PHP;
  return amountInPhp * config.rate;
}

export function formatCurrency(amountInPhp: number | string | undefined | null, currency: CurrencyCode = 'PHP'): string {
  const val = Number(amountInPhp || 0);
  const config = CURRENCIES[currency] || CURRENCIES.PHP;
  const converted = val * config.rate;

  if (currency === 'JPY') {
    return `${config.symbol}${Math.round(converted).toLocaleString(config.locale)}`;
  }

  return `${config.symbol}${converted.toLocaleString(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
