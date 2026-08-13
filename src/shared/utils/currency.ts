/**
 * أداة تنسيق العملة - الدينار العراقي (IQD)
 * استخدم هذه الدالة في جميع أنحاء التطبيق بدلاً من تنسيق الأرقام يدوياً
 *
 * أمثلة:
 *   formatCurrency(1000)      → "1,000 د.ع"
 *   formatCurrency(10000)     → "10,000 د.ع"
 *   formatCurrency(1500000)   → "1,500,000 د.ع"
 *   formatCurrency(12500000)  → "12,500,000 د.ع"
 *   formatCurrency(0)         → "0 د.ع"
 */

const IQD_SYMBOL = 'د.ع';

/**
 * تنسيق الرقم كعملة عراقية مع الفواصل
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `0 ${IQD_SYMBOL}`;
  }

  const formatted = Math.abs(amount)
    .toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  if (amount < 0) {
    return `-${formatted} ${IQD_SYMBOL}`;
  }

  return `${formatted} ${IQD_SYMBOL}`;
}

/**
 * تنسيق مختصر للأرقام الكبيرة
 * مثال: 1500000 → "1.5 م د.ع"
 */
export function formatCurrencyShort(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `0 ${IQD_SYMBOL}`;
  }

  const abs = Math.abs(amount);
  let result: string;

  if (abs >= 1_000_000) {
    result = `${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)} م`;
  } else if (abs >= 1_000) {
    result = `${(abs / 1_000).toFixed(abs % 1_000 === 0 ? 0 : 1)} ألف`;
  } else {
    result = abs.toString();
  }

  return amount < 0 ? `-${result} ${IQD_SYMBOL}` : `${result} ${IQD_SYMBOL}`;
}

/**
 * تنسيق بدون رمز العملة (للاستخدام الداخلي)
 */
export function formatNumber(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0';
  return Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * تنسيق قيمة حقل السعر أثناء الكتابة (مثال: 10000 → "10,000")
 */
export function formatPriceInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const digitsOnly = value.toString().replace(/[^0-9]/g, '');
  if (!digitsOnly) return '';
  const num = parseInt(digitsOnly, 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US');
}

/**
 * تحويل السعر المنسق (مثل "10,000") إلى نص رقمي مجرد ("10000")
 */
export function parsePriceInput(value: string | null | undefined): string {
  if (!value) return '';
  return value.toString().replace(/[^0-9]/g, '');
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function formatDateOnly(isoString: string | null | undefined): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export const CURRENCY_SYMBOL = IQD_SYMBOL;


