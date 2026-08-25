import { Alert, Linking } from 'react-native';
import { formatCurrency } from './currency';

/**
 * الرسالة الافتراضية لكشف حساب العميل الكامل
 * المتغيرات: {اسم_العميل}, {تفاصيل_الحساب}, {المجموع_الكلي}, {رسالة_السداد}, {اسم_المتجر}
 */
export const DEFAULT_CUSTOMER_MESSAGE_TEMPLATE = `السلام عليكم ورحمة الله وبركاته \\uD83D\\uDC90
عزيزنا العميل: *{اسم_العميل}*

نود إعلامكم بتفاصيل كشف حسابكم المالي:

{تفاصيل_الحساب}

━━━━━━━━━━━━━━━━
\\uD83D\\uDCB0 *إجمالي المبلغ المتبقي بذمتكم:* {المجموع_الكلي}
━━━━━━━━━━━━━━━━

{رسالة_السداد}

مع تحيات: {اسم_المتجر}`;

/**
 * الرسالة الافتراضية للدين/القسط الفردي
 * المتغيرات: {اسم_العميل}, {عنوان}, {المجموع}, {المسدد}, {المتبقي}, {اسم_المتجر}
 */
export const DEFAULT_DEBT_MESSAGE_TEMPLATE = `مرحبا *{اسم_العميل}* \\uD83D\\uDC4B

تذكير بكشف الحساب:
*{عنوان}*

المجموع: {المجموع}
المسدد: {المسدد}
المتبقي: {المتبقي}

يرجى التفضل بالسداد في أقرب وقت ممكن.
مع تحيات: {اسم_المتجر}`;

/**
 * تنظيف وتنسيق رقم الهاتف العراقي لواتساب
 */
export function formatIraqiPhone(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('00964')) {
    clean = clean.substring(2);
  } else if (clean.startsWith('0')) {
    clean = '964' + clean.substring(1);
  } else if (!clean.startsWith('964')) {
    clean = '964' + clean;
  }
  return clean;
}

export interface CustomerMessageOptions {
  customer: { id?: string; name?: string; phone?: string | null };
  records: any[];
  storeName?: string;
  customTemplate?: string;
}

/**
 * توليد رسالة واتساب ذكية لكشف حساب العميل (ديون + أقساط)
 */
export function generateCustomerFinancialMessage({
  customer,
  records,
  storeName,
  customTemplate,
}: CustomerMessageOptions): string {
  const custName = customer?.name || 'عزيزنا العميل';
  const storeSignature = storeName || 'الرافدين المالي';

  const activeRecords = (records || []).filter((r: any) => !r.deleted_at);
  const debts = activeRecords.filter((r: any) => r.type !== 'installment');
  const installments = activeRecords.filter((r: any) => r.type === 'installment');

  const calcRemaining = (d: any) => {
    const total = Number(d.total_amount) || 0;
    const paid = Number(d.paid_amount) || 0;
    return d.remaining_amount !== undefined ? Number(d.remaining_amount) : Math.max(0, total - paid);
  };

  const totalDebt = debts.reduce((s: number, d: any) => s + (Number(d.total_amount) || 0), 0);
  const paidDebt = debts.reduce((s: number, d: any) => s + (Number(d.paid_amount) || 0), 0);
  const remDebt = debts.reduce((s: number, d: any) => s + calcRemaining(d), 0);

  const totalInst = installments.reduce((s: number, d: any) => s + (Number(d.total_amount) || 0), 0);
  const paidInst = installments.reduce((s: number, d: any) => s + (Number(d.paid_amount) || 0), 0);
  const remInst = installments.reduce((s: number, d: any) => s + calcRemaining(d), 0);

  const totalRemaining = remDebt + remInst;
  const hasDebts = debts.length > 0;
  const hasInst = installments.length > 0;

  const paymentMsg =
    totalRemaining > 0
      ? 'يرجى التفضل بالسداد في أقرب وقت ممكن. شاكرين حسن تعاونكم معنا.'
      : 'حسابكم مسدد بالكامل ✅ شاكرين التزامكم الدائم.';

  // القالب المخصص
  if (customTemplate && customTemplate.trim()) {
    let details = '';
    if (hasDebts && hasInst) {
      details =
        `📋 *الديون:*\n• الاجمالي: ${formatCurrency(totalDebt)} | المسدد: ${formatCurrency(paidDebt)} | المتبقي: ${formatCurrency(remDebt)}\n\n` +
        `💳 *الاقساط:*\n• الاجمالي: ${formatCurrency(totalInst)} | المسدد: ${formatCurrency(paidInst)} | المتبقي: ${formatCurrency(remInst)}`;
    } else if (hasDebts) {
      details = `📋 *الديون:*\n• الاجمالي: ${formatCurrency(totalDebt)} | المسدد: ${formatCurrency(paidDebt)} | المتبقي: ${formatCurrency(remDebt)}`;
    } else if (hasInst) {
      details = `💳 *الاقساط:*\n• الاجمالي: ${formatCurrency(totalInst)} | المسدد: ${formatCurrency(paidInst)} | المتبقي: ${formatCurrency(remInst)}`;
    }
    return customTemplate
      .replace(/{اسم_العميل}/g, custName)
      .replace(/{تفاصيل_الحساب}/g, details)
      .replace(/{متبقي_الديون}/g, formatCurrency(remDebt))
      .replace(/{متبقي_الأقساط}/g, formatCurrency(remInst))
      .replace(/{المجموع_الكلي}/g, formatCurrency(totalRemaining))
      .replace(/{رسالة_السداد}/g, paymentMsg)
      .replace(/{اسم_المتجر}/g, storeSignature);
  }

  // --- الرسائل الذكية الافتراضية ---

  if (!hasDebts && !hasInst) {
    return `السلام عليكم ورحمة الله وبركاته\nعزيزنا العميل: *${custName}*\n\nلا توجد ديون او أقساط مسجلة بذمتكم حالياً (الحساب مسدد بالكامل ✅).\n\nشاكرين حسن تعاملكم.\n\nمع تحيات: ${storeSignature}`;
  }

  if (hasDebts && hasInst) {
    return (
      `السلام عليكم ورحمة الله وبركاته\nعزيزنا العميل: *${custName}*\n\n` +
      `نود إعلامكم بتفاصيل كشف الحساب:\n\n` +
      `📋 *الديون:*\n• الاجمالي: ${formatCurrency(totalDebt)}\n• المسدد: ${formatCurrency(paidDebt)}\n• المتبقي: ${formatCurrency(remDebt)}\n\n` +
      `💳 *الاقساط:*\n• الاجمالي: ${formatCurrency(totalInst)}\n• المسدد: ${formatCurrency(paidInst)}\n• المتبقي: ${formatCurrency(remInst)}\n\n` +
      `━━━━━━━━━━━━━━━━\n💰 *المبلغ الكلي المتبقي:* ${formatCurrency(totalRemaining)}\n━━━━━━━━━━━━━━━━\n\n${paymentMsg}\n\nمع تحيات: ${storeSignature}`
    );
  }

  if (hasDebts) {
    return (
      `السلام عليكم ورحمة الله وبركاته\nعزيزنا العميل: *${custName}*\n\n` +
      `📋 *تفاصيل الدين:*\n• الاجمالي: ${formatCurrency(totalDebt)}\n• المسدد: ${formatCurrency(paidDebt)}\n• المتبقي: ${formatCurrency(remDebt)}\n\n` +
      `━━━━━━━━━━━━━━━━\n💰 *المتبقي بذمتكم:* ${formatCurrency(remDebt)}\n━━━━━━━━━━━━━━━━\n\n${paymentMsg}\n\nمع تحيات: ${storeSignature}`
    );
  }

  return (
    `السلام عليكم ورحمة الله وبركاته\nعزيزنا العميل: *${custName}*\n\n` +
    `💳 *تفاصيل الاقساط:*\n• الاجمالي: ${formatCurrency(totalInst)}\n• المسدد: ${formatCurrency(paidInst)}\n• المتبقي: ${formatCurrency(remInst)}\n\n` +
    `━━━━━━━━━━━━━━━━\n💰 *المتبقي بذمتكم:* ${formatCurrency(remInst)}\n━━━━━━━━━━━━━━━━\n\n${paymentMsg}\n\nمع تحيات: ${storeSignature}`
  );
}

/**
 * فتح واتساب برسالة كشف حساب العميل
 */
export async function openCustomerWhatsApp(
  customer: any,
  records: any[],
  storeName?: string,
  customTemplate?: string
): Promise<void> {
  const phone = customer?.phone;
  if (!phone || !phone.trim()) {
    Alert.alert('تنبيه', 'لا يوجد رقم هاتف مسجل لهذا العميل');
    return;
  }
  const cleanPhone = formatIraqiPhone(phone);
  const text = generateCustomerFinancialMessage({ customer, records, storeName, customTemplate });
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('خطأ', 'تعذر فتح تطبيق واتساب. يرجى التأكد من تثبيت التطبيق.');
  }
}

/**
 * توليد رسالة الدين/القسط الفردي من صفحة الديون
 */
export function generateDebtMessage(
  item: any,
  storeName?: string,
  customTemplate?: string
): string {
  const custName = item.customerName || 'عزيزنا العميل';
  const storeSignature = storeName || 'الرافدين المالي';
  const totalAmount = Number(item.total_amount) || Number(item.totalAmount) || 0;
  const paidAmount = Number(item.paid_amount) || Number(item.paidAmount) || 0;
  const remaining =
    item.remaining_amount !== undefined
      ? Number(item.remaining_amount)
      : Math.max(0, totalAmount - paidAmount);
  const isInstallment = item.type === 'installment';
  const title = item.title || (isInstallment ? 'قسط' : 'دين');
  const typeEmoji = isInstallment ? '💳' : '📋';

  if (customTemplate && customTemplate.trim()) {
    return customTemplate
      .replace(/{اسم_العميل}/g, custName)
      .replace(/{عنوان}/g, title)
      .replace(/{المجموع}/g, formatCurrency(totalAmount))
      .replace(/{المسدد}/g, formatCurrency(paidAmount))
      .replace(/{المتبقي}/g, formatCurrency(remaining))
      .replace(/{اسم_المتجر}/g, storeSignature);
  }

  return (
    `مرحبا *${custName}*\n\n` +
    `${typeEmoji} تذكير بكشف ${isInstallment ? 'القسط' : 'الدين'}:\n*${title}*\n\n` +
    `المجموع: ${formatCurrency(totalAmount)}\n` +
    `المسدد: ${formatCurrency(paidAmount)}\n` +
    `المتبقي: ${formatCurrency(remaining)}\n\n` +
    `يرجى التفضل بالسداد في أقرب وقت ممكن.\n\nمع تحيات: ${storeSignature}`
  );
}
