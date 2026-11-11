/**
 * Time calculation and Arabic date formatting utilities
 */

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Format ISO date string into readable Arabic time & date
 */
export function formatArabicDateTime(isoString: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    // Arabic time format: 04:30 م
    const timeStr = d.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    if (isToday) {
      return `اليوم، ${timeStr}`;
    }

    const dateStr = d.toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'short',
    });

    return `${dateStr}، ${timeStr}`;
  } catch {
    return '—';
  }
}

/**
 * Calculates duration in seconds between two ISO date strings
 */
export function calculateDurationSeconds(startIso: string | null, endIso: string | null): number {
  if (!startIso || !endIso) return 0;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  return Math.floor((end - start) / 1000);
}

/**
 * Formats duration in seconds into a friendly Arabic string
 */
export function formatDurationArabic(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'أقل من دقيقة';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    if (hours === 1) parts.push('ساعة واحدة');
    else if (hours === 2) parts.push('ساعتان');
    else if (hours >= 3 && hours <= 10) parts.push(`${hours} ساعات`);
    else parts.push(`${hours} ساعة`);
  }

  if (minutes > 0) {
    if (minutes === 1) parts.push('دقيقة واحدة');
    else if (minutes === 2) parts.push('دقيقتان');
    else if (minutes >= 3 && minutes <= 10) parts.push(`${minutes} دقائق`);
    else parts.push(`${minutes} دقيقة`);
  }

  if (hours === 0 && seconds > 0) {
    if (seconds === 1) parts.push('ثانية');
    else if (seconds === 2) parts.push('ثانيتان');
    else parts.push(`${seconds} ثانية`);
  }

  return parts.length > 0 ? parts.join(' و ') : 'أقل من دقيقة';
}

/**
 * Formats seconds into digital timer display 00:00:00
 */
export function formatDigitalTimer(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Checks if a task is older than 7 days based on createdAt
 */
export function isTaskOlderThanOneWeek(createdAtIso: string, referenceTime: number = Date.now()): boolean {
  try {
    const created = new Date(createdAtIso).getTime();
    if (isNaN(created)) return false;
    return referenceTime - created >= SEVEN_DAYS_MS;
  } catch {
    return false;
  }
}

/**
 * Returns remaining days/hours until 7-day retention expiration
 */
export function getRetentionCountdown(createdAtIso: string): string {
  try {
    const created = new Date(createdAtIso).getTime();
    const expiry = created + SEVEN_DAYS_MS;
    const diffMs = expiry - Date.now();

    if (diffMs <= 0) {
      return 'انتهت مدة الحفظ (مستحق الحذف)';
    }

    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (days > 0) {
      return `متبقي ${days} يوم في السجل`;
    }
    return `متبقي ${hours} ساعة في السجل`;
  } catch {
    return 'سجل أسبوعي';
  }
}
