import { DeductionSettings, MaintenanceTask } from '../types';

export const DEFAULT_DEDUCTION_SETTINGS: DeductionSettings = {
  enabled: true,
  unitLabel: 'د.ع',
  acceptDelayMinutes: 15,
  acceptDelayDeduction: 5000,
  completionDelayMinutes: 60,
  completionDelayDeduction: 10000,
};

export function formatDeductionAmount(amount: number, unitLabel: string = 'د.ع'): string {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const formattedNumber = safeAmount.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  });
  if (unitLabel === '%') {
    return `${formattedNumber}%`;
  }
  return `${formattedNumber} ${unitLabel}`;
}

/**
 * Determines whether a task is secondary/exempt from delay deductions because
 * the same employee already had an earlier active (non-completed) task when this
 * task was assigned/dispatched to them ("يُطبق على المهمة الأولى فقط ولا يطبق على المهام الثانية").
 */
export function isTaskSecondaryOrExempt(
  task: MaintenanceTask,
  allTasks: MaintenanceTask[]
): boolean {
  if (task.deductionExempt) return true;
  if (!task.assignedToId || task.assignedToId === 'all') return false;

  const taskCreatedMs = new Date(task.createdAt).getTime();
  if (isNaN(taskCreatedMs)) return false;

  return allTasks.some((other) => {
    if (other.id === task.id) return false;
    if (other.assignedToId !== task.assignedToId) return false;

    const otherCreatedMs = new Date(other.createdAt).getTime();
    if (isNaN(otherCreatedMs)) return false;

    // Earlier task (or same timestamp with lexicographically smaller ID)
    const isEarlier =
      otherCreatedMs < taskCreatedMs ||
      (otherCreatedMs === taskCreatedMs && other.id < task.id);

    if (!isEarlier) return false;

    // Was the earlier task still NOT completed when this task was created?
    if (!other.completedAt) return true;
    const otherCompletedMs = new Date(other.completedAt).getTime();
    return !isNaN(otherCompletedMs) && otherCompletedMs > taskCreatedMs;
  });
}

/**
 * Calculates total active working seconds (excluding paused & suspended periods).
 */
export function getActiveTaskWorkingSeconds(
  task: MaintenanceTask,
  referenceTimeMs: number = Date.now()
): number {
  if (task.status === 'completed' && typeof task.durationSeconds === 'number') {
    return Math.max(0, task.durationSeconds);
  }
  if (!task.acceptedAt) return 0;

  if (task.status === 'paused' || task.status === 'suspended') {
    return Math.max(0, task.accumulatedSeconds || 0);
  }

  const activeStartIso = task.resumedAt || task.acceptedAt;
  const startMs = new Date(activeStartIso).getTime();
  const segmentSeconds = isNaN(startMs)
    ? 0
    : Math.max(0, Math.floor((referenceTimeMs - startMs) / 1000));

  return Math.max(0, (task.accumulatedSeconds || 0) + segmentSeconds);
}

export function getDeductionReasonLabel(reason: 'accept_delay' | 'completion_delay'): string {
  return reason === 'accept_delay' ? 'تأخير قبول المهمة' : 'تأخير إنجاز المهمة';
}
