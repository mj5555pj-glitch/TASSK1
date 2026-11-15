export type UserRole = 'manager' | 'technician';

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: UserRole;
  phone: string;
  avatar?: string;
  specialty?: string;
  status: 'available' | 'busy' | 'offline';
  deductionBalance?: number; // Strictly employee deduction balance only
}

// Exactly the 4 required types
export type AllowedTaskType = 'صيانة' | 'تنصيب' | 'ضعف' | 'مشاكل اخرى';

export const TASK_TYPES: { id: AllowedTaskType; label: string; description: string; icon: string }[] = [
  { id: 'صيانة', label: 'صيانة', description: 'إصلاح أعطال الراوتر، انقطاع الإشارة، أو كابلات الشبكة', icon: 'wrench' },
  { id: 'تنصيب', label: 'تنصيب', description: 'تركيب اشتراك جديد، مد كوابل، أو برمجة راوتر جديد', icon: 'plus-circle' },
  { id: 'ضعف', label: 'ضعف', description: 'معالجة بطء التصفح، ضعف الإشارة، وفقدان الحزم (Packet Loss)', icon: 'activity' },
  { id: 'مشاكل اخرى', label: 'مشاكل اخرى', description: 'بلاغات واستفسارات فنية أخرى لم تذكر أعلاه', icon: 'help-circle' },
];

export type TaskStatus = 'pending' | 'in_progress' | 'paused' | 'suspended' | 'completed';

export interface MaintenanceTask {
  id: string;
  taskNumber: string;
  taskType: AllowedTaskType;
  subscriberName: string;
  phone: string;
  notes: string;
  assignedToId: string;
  assignedToName: string;
  createdBy: string;
  createdAt: string; // ISO string
  acceptedAt: string | null; // ISO string
  pausedAt?: string | null; // ISO string when paused
  suspendedAt?: string | null; // ISO string when put on hold
  resumedAt?: string | null; // ISO string when last resumed
  pauseReason?: string; // Reason for pausing the task
  suspendReason?: string; // Reason for suspending/holding the task
  accumulatedSeconds?: number; // Active working seconds accumulated prior to pause/hold
  completedAt: string | null; // ISO string
  durationSeconds: number | null; // Calculated duration in seconds
  durationFormatted: string | null; // e.g. "35 دقيقة"
  completionNotes?: string;
  expiresAt: string; // 7 days from createdAt ISO
  status: TaskStatus;
  lastBroadcastAt?: string;
  resentCount?: number;
  originallyBroadcast?: boolean; // True if task was dispatched to 'all'
  deductionExempt?: boolean; // True if secondary task while an earlier task was active
  deductionExemptReason?: string;
  acceptDeductionApplied?: boolean;
  acceptDeductionAmount?: number;
  completionDeductionApplied?: boolean;
  completionDeductionAmount?: number;
}

export type PageView = 'dispatch' | 'monitoring' | 'technician_queue' | 'archive';

export interface CleanupLog {
  timestamp: string;
  deletedCount: number;
}

export interface WhatsAppTemplateSettings {
  template: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface DeductionSettings {
  enabled: boolean;
  unitLabel: string; // e.g., 'د.ع' | '%' | 'نقطة' | '$'
  acceptDelayMinutes: number; // Allowed minutes before accept delay deduction applies
  acceptDelayDeduction: number; // Deduction amount / percentage for late acceptance
  completionDelayMinutes: number; // Allowed active minutes before completion delay deduction applies
  completionDelayDeduction: number; // Deduction amount / percentage for late completion
  updatedAt?: string;
  updatedBy?: string;
}

export type DeductionReason = 'accept_delay' | 'completion_delay';

export interface DeductionRecord {
  id: string;
  userId: string;
  userName: string;
  taskId: string;
  taskNumber: string;
  reason: DeductionReason;
  delayMinutes: number;
  allowedMinutes: number;
  amount: number;
  unitLabel: string;
  createdAt: string;
  note?: string;
}
