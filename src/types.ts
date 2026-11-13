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

