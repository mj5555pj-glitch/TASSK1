/**
 * Format and prepare phone numbers and WhatsApp direct action links
 * with intelligent international country code resolution and WhatsApp Calling support
 */

export interface CountryCodeOption {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  example: string;
}

export const COUNTRY_CODES: CountryCodeOption[] = [
  { code: 'IQ', name: 'العراق', flag: '🇮🇶', dialCode: '964', example: '0770XXXXXXX' },
  { code: 'SA', name: 'السعودية', flag: '🇸🇦', dialCode: '966', example: '05XXXXXXXX' },
  { code: 'AE', name: 'الإمارات', flag: '🇦🇪', dialCode: '971', example: '05XXXXXXXX' },
  { code: 'KW', name: 'الكويت', flag: '🇰🇼', dialCode: '965', example: 'XXXX XXXX' },
  { code: 'QA', name: 'قطر', flag: '🇶🇦', dialCode: '974', example: 'XXXX XXXX' },
  { code: 'BH', name: 'البحرين', flag: '🇧🇭', dialCode: '973', example: 'XXXX XXXX' },
  { code: 'OM', name: 'عُمان', flag: '🇴🇲', dialCode: '968', example: '9XXXXXXX' },
  { code: 'JO', name: 'الأردن', flag: '🇯🇴', dialCode: '962', example: '07XXXXXXXX' },
  { code: 'EG', name: 'مصر', flag: '🇪🇬', dialCode: '20', example: '01XXXXXXXXX' },
  { code: 'SY', name: 'سوريا', flag: '🇸🇾', dialCode: '963', example: '09XXXXXXXX' },
  { code: 'LB', name: 'لبنان', flag: '🇱🇧', dialCode: '961', example: '03XXXXXX' },
];

/**
 * Automatically normalizes any input phone number for WhatsApp wa.me links.
 * 1. Converts Eastern Arabic / Persian numerals to ASCII 0-9.
 * 2. Strips all special characters, spaces, and dashes.
 * 3. Removes leading '+' and '00' international prefixes.
 * 4. Detects existing international dial codes (e.g. 964, 966, 962, etc.).
 * 5. If missing country code, strips leading zero and prepends preferred dialCode (default Iraq 964).
 */
export function normalizePhoneForWhatsApp(phone: string, preferredDialCode: string = '964'): string {
  if (!phone) return '';

  // 1. Convert Eastern Arabic & Persian numerals (٠-٩ and ۰-۹) to standard 0-9
  let digits = phone
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[^0-9]/g, '');

  if (!digits) return '';

  // 2. Remove leading '00' international prefix if present
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  // 3. If it already starts with a valid country dialCode (e.g. 964, 966, 962, 971, etc.)
  for (const c of COUNTRY_CODES) {
    if (digits.startsWith(c.dialCode) && digits.length >= c.dialCode.length + 7) {
      return digits;
    }
  }

  // 4. If it's a local number starting with '0' (e.g. 0770..., 050..., 010...)
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // 5. Prepend preferred dial code without plus
  const cleanDial = preferredDialCode.replace(/[^0-9]/g, '') || '964';
  return `${cleanDial}${digits}`;
}

/**
 * Builds the pre-filled WhatsApp message containing technician name, subscriber name, and task details
 */
export function buildWhatsAppMessage(
  subscriberName: string,
  technicianName: string,
  taskType: string,
  notes?: string
): string {
  let msg = `السلام عليكم ورحمة الله أخي ${subscriberName.trim()}،\n`;
  msg += `معك الفني (${technicianName.trim()}) من فريق الدعم الفني وصيانة شبكات الإنترنت.\n\n`;
  msg += `بخصوص طلب الصيانة المسجل لديكم: [${taskType.trim()}].\n`;
  if (notes && notes.trim().length > 0) {
    msg += `ملاحظات البلاغ: ${notes.trim()}\n`;
  }
  msg += `أنا متوجه إليكم حالياً، أرجو تأكيد تواجدكم بالعنوان أو إرسال الموقع الدقيق عبر الواتساب لتسريع الوصول وإنجاز الصيانة. شكراً لكم!`;

  return msg;
}

/**
 * Generates the direct WhatsApp click-to-chat URL with pre-filled message
 */
export function getWhatsAppUrl(
  phone: string,
  subscriberName: string,
  technicianName: string,
  taskType: string,
  notes?: string,
  dialCode: string = '964'
): string {
  const cleanNumber = normalizePhoneForWhatsApp(phone, dialCode);
  const text = buildWhatsAppMessage(subscriberName, technicianName, taskType, notes);
  const encodedText = encodeURIComponent(text);

  if (cleanNumber.length > 0) {
    return `https://wa.me/${cleanNumber}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Generates the direct WhatsApp Call / Contact URL (opens chat directly for voice/video call)
 */
export function getWhatsAppCallUrl(phone: string, dialCode: string = '964'): string {
  const cleanNumber = normalizePhoneForWhatsApp(phone, dialCode);
  if (cleanNumber.length > 0) {
    return `https://wa.me/${cleanNumber}`;
  }
  return `https://wa.me/`;
}

/**
 * Generates direct tel: call link
 */
export function getTelUrl(phone: string): string {
  const digitsOnly = phone.replace(/[^0-9+]/g, '');
  return `tel:${digitsOnly}`;
}
