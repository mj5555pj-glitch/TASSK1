import React, { useState } from 'react';
import {
  MaintenanceTask,
  User,
  AllowedTaskType,
  TASK_TYPES,
} from '../types';
import {
  X,
  Save,
  Send,
  RotateCw,
  User as UserIcon,
  Phone,
  FileText,
  Wrench,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export type TaskModalMode = 'edit' | 'resend_existing' | 'resend_completed';

export interface TaskEditPayload {
  taskType: AllowedTaskType;
  subscriberName: string;
  phone: string;
  notes: string;
  assignedToId: string;
  assignedToName: string;
}

interface Props {
  task: MaintenanceTask;
  mode: TaskModalMode;
  technicians: User[];
  onSaveEdit?: (
    taskId: string,
    updates: Partial<MaintenanceTask>
  ) => Promise<void>;
  onResendExisting?: (
    task: MaintenanceTask,
    overrides: TaskEditPayload
  ) => Promise<void>;
  onResendAsNew?: (data: TaskEditPayload) => Promise<void>;
  onClose: () => void;
}

export const TaskEditModal: React.FC<Props> = ({
  task,
  mode,
  technicians,
  onSaveEdit,
  onResendExisting,
  onResendAsNew,
  onClose,
}) => {
  const [taskType, setTaskType] = useState<AllowedTaskType>(task.taskType);
  const [subscriberName, setSubscriberName] = useState(task.subscriberName);
  const [phone, setPhone] = useState(task.phone);
  const [notes, setNotes] = useState(task.notes || '');

  const initialIsAll = task.assignedToId === 'all' || !task.assignedToId;
  const [dispatchTarget, setDispatchTarget] = useState<'all' | 'specific'>(
    initialIsAll ? 'all' : 'specific'
  );
  const [selectedTechId, setSelectedTechId] = useState<string>(
    !initialIsAll && technicians.some((t) => t.id === task.assignedToId)
      ? task.assignedToId
      : technicians[0]?.id || ''
  );

  // When editing an active/paused task and switching technician, reset to pending by default
  const [resetToPendingOnTechChange, setResetToPendingOnTechChange] =
    useState<boolean>(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resolveAssignee = (): { id: string; name: string } | null => {
    if (dispatchTarget === 'all') {
      return {
        id: 'all',
        name: 'متاحة للكل (يمكن لأي فني نسبها لنفسه)',
      };
    }
    const tech =
      technicians.find((t) => t.id === selectedTechId) || technicians[0];
    if (!tech) return null;
    return {
      id: tech.id,
      name: tech.fullName,
    };
  };

  const targetAssignee = resolveAssignee();
  const technicianChanged =
    targetAssignee !== null && targetAssignee.id !== task.assignedToId;
  const canPromptStatusReset =
    mode === 'edit' &&
    technicianChanged &&
    (task.status === 'in_progress' || task.status === 'paused');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subscriberName.trim()) {
      setError('يرجى إدخال اسم المشترك.');
      return;
    }

    if (!phone.trim()) {
      setError('يرجى إدخال رقم هاتف المشترك.');
      return;
    }

    const assignee = resolveAssignee();
    if (!assignee) {
      setError('يرجى إضافة فني واحد على الأقل أو اختيار الإرسال للكل.');
      return;
    }

    const payload: TaskEditPayload = {
      taskType,
      subscriberName: subscriberName.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      assignedToId: assignee.id,
      assignedToName: assignee.name,
    };

    try {
      setSubmitting(true);

      if (mode === 'edit' && onSaveEdit) {
        const updates: Partial<MaintenanceTask> = {
          ...payload,
        };

        if (canPromptStatusReset && resetToPendingOnTechChange) {
          const nowIso = new Date().toISOString();
          updates.status = 'pending';
          updates.acceptedAt = null;
          updates.pausedAt = null;
          updates.resumedAt = null;
          updates.pauseReason = '';
          updates.accumulatedSeconds = 0;
          updates.lastBroadcastAt = nowIso;
        } else if (
          technicianChanged &&
          task.status === 'pending'
        ) {
          updates.lastBroadcastAt = new Date().toISOString();
        }

        await onSaveEdit(task.id, updates);
        setSuccessMsg('تم حفظ تعديلات المهمة بنجاح!');
      } else if (mode === 'resend_existing' && onResendExisting) {
        await onResendExisting(task, payload);
        setSuccessMsg('تمت إعادة إرسال المهمة وتوجيه الإشعار بنجاح!');
      } else if (mode === 'resend_completed' && onResendAsNew) {
        await onResendAsNew(payload);
        setSuccessMsg('تم إرسال نسخة جديدة من المهمة بنجاح!');
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('TaskEditModal error:', err);
      setError('حدث خطأ أثناء حفظ البيانات في قاعدة البيانات، يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle =
    mode === 'edit'
      ? `تعديل بيانات المهمة وتبديل الفني (${task.taskNumber})`
      : mode === 'resend_existing'
      ? `إعادة إرسال المهمة المعلقة (${task.taskNumber})`
      : `إعادة إرسال مهمة منجزة (${task.taskNumber})`;

  const modalSubtitle =
    mode === 'edit'
      ? 'يمكنك تعديل اسم المشترك، الهاتف، نوع المهمة، الملاحظات، أو تبديل الفني المكلف.'
      : mode === 'resend_existing'
      ? 'سيتم إعادة إرسال المهمة كطلب جديد بانتظار القبول وإشعار الفني المحدد أو كافة الفنيين فوراً.'
      : 'سيتم إنشاء وإرسال مهمة صيانة جديدة بهذه البيانات مع بقاء السجل السابق محفوظاً في الأرشيف.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-[calc(100vw-1.25rem)] sm:max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 sm:p-6 text-slate-100 animate-in zoom-in-95 duration-200 space-y-4 max-h-[92vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                mode === 'edit'
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {mode === 'edit' ? (
                <Wrench className="w-5 h-5" />
              ) : (
                <RotateCw className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                {modalTitle}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                {modalSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Type */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              نوع المهمة:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TASK_TYPES.map((t) => {
                const selected = taskType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTaskType(t.id)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                      selected
                        ? 'bg-blue-600/25 border-blue-500 text-white ring-1 ring-blue-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subscriber Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                اسم المشترك <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute right-3 top-2.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={subscriberName}
                  onChange={(e) => setSubscriberName(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="اسم المشترك"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                رقم الهاتف <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute right-3 top-2.5 text-slate-500 pointer-events-none" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white text-right font-mono focus:outline-none focus:border-blue-500"
                  placeholder="07XXXXXXXXX"
                />
              </div>
            </div>
          </div>

          {/* Assign / Switch Technician */}
          <div className="space-y-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <label className="block text-xs font-bold text-slate-200">
              توجيه وتبديل الفني المكلف:
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDispatchTarget('all')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  dispatchTarget === 'all'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>الكل (أي فني)</span>
              </button>

              <button
                type="button"
                onClick={() => setDispatchTarget('specific')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  dispatchTarget === 'specific'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>فني محدد</span>
              </button>
            </div>

            {dispatchTarget === 'specific' && (
              <div>
                <select
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {technicians.length === 0 ? (
                    <option value="">لا يوجد فنيون مسجلون</option>
                  ) : (
                    technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        الفني: {t.fullName} — {t.specialty || 'صيانة شبكات'} ({t.phone})
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {canPromptStatusReset && (
              <label className="flex items-start gap-2 pt-1.5 border-t border-slate-800/80 cursor-pointer text-xs text-amber-300">
                <input
                  type="checkbox"
                  checked={resetToPendingOnTechChange}
                  onChange={(e) => setResetToPendingOnTechChange(e.target.checked)}
                  className="mt-0.5 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                />
                <span>
                  إرجاع المهمة إلى حالة <strong>(بانتظار القبول)</strong> لإرسال تنبيه فوري للفني الجديد وإخفاء المعلومات حتى يقبلها
                </span>
              </label>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              ملاحظات المهمة:
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute right-3 top-3 text-slate-500 pointer-events-none" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full pr-9 pl-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
                placeholder="تفاصيل العطل أو العنوان أو الملاحظات..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-lg disabled:opacity-50 ${
                mode === 'edit'
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-950/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
              }`}
            >
              {mode === 'edit' ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>{submitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'جاري إعادة الإرسال...'
                      : mode === 'resend_completed'
                      ? 'إعادة إرسال كمهمة جديدة الآن'
                      : 'إعادة إرسال المهمة وتوجيه الإشعار'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
