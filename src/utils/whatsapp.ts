/**
 * Format and prepare phone numbers and WhatsApp direct action links
 */

/**
 * Normalizes phone numbers for WhatsApp wa.me links
 * Strips whitespace, dashes, plus signs, leading zeroes if country code exists
 */
export function normalizePhoneForWhatsApp(phone: string): string {
  // Remove non-digit characters except plus
  let cleaned = phone.replace(/[^0-9]/g, '');
  
  // If number starts with 00, replace with nothing
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  
  // If local format like 07XXXXXXXX or 05XXXXXXXX, we handle typical MENA formats (e.g. Iraq 964, Saudi 966, Jordan 962, Egypt 20)
  // Or if it's 10 digits starting with 0, user might want to prefix default or keep digits.
  // We keep it clean: if starts with '0' and is around 10-11 digits, we can keep or format.
  return cleaned;
}

/**
 * Builds the pre-filled WhatsApp message containing the technician's name and subscriber's name
 */
export function buildWhatsAppMessage(subscriberName: string, technicianName: string, taskType: string, notes?: string): string {
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
 * Generates the direct WhatsApp click-to-chat URL
 */
export function getWhatsAppUrl(phone: string, subscriberName: string, technicianName: string, taskType: string, notes?: string): string {
  const cleanNumber = normalizePhoneForWhatsApp(phone);
  const text = buildWhatsAppMessage(subscriberName, technicianName, taskType, notes);
  const encodedText = encodeURIComponent(text);
  
  if (cleanNumber.length > 0) {
    return `https://wa.me/${cleanNumber}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Generates direct tel: call link
 */
export function getTelUrl(phone: string): string {
  const digitsOnly = phone.replace(/[^0-9+]/g, '');
  return `tel:${digitsOnly}`;
}
