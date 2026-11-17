import React, { useState, useEffect } from 'react';
import { User, MaintenanceTask, DeductionSettings, DeductionRecord } from '../types';
import { 
  formatArabicDateTime, 
  formatDigitalTimer, 
  getRetentionCountdown 
} from '../utils/time';
import { getTelUrl } from '../utils/whatsapp';
import { 
  DEFAULT_DEDUCTION_SETTINGS, 
  formatDeductionAmount, 
  getDeductionReasonLabel, 
  isTaskSecondaryOrExempt 
} from '../utils/deductions';
import { WhatsAppPreviewModal } from './WhatsAppPreviewModal';
import { NotificationSettingsBanner } from './NotificationSettingsBanner';
import { 
  Phone, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  Play, 
  FileText, 
  User as UserIcon, 
  ShieldCheck, 
  Calendar, 
  Check, 
  Radio,
  Zap,
  Users,
  PauseCircle,
  Pause,
  PlayCircle,
  Lock,
  Wallet,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Props {
  technician: User;
  tasks: MaintenanceTask[];
  whatsappTemplate?: string;
  deductionSettings?: DeductionSettings;
  deductionRecords?: DeductionRecord[];
  onAcceptTask: (taskId: string) => Promise<void>;
  onPauseTask: (task: MaintenanceTask, pauseReason?: string) => Promise<void>;
  onSuspendTask: (task: MaintenanceTask, suspendReason?: string) => Promise<void>;
  onResumeTask: (taskId: string) => Promise<void>;
  onCompleteTask: (task: MaintenanceTask, notes?: string) => Promise<void>;
}

export const TechnicianView: React.FC<Props> = ({
  technician,
  tasks,
  whatsappTemplate,
  deductionSettings = DEFAULT_DEDUCTION_SETTINGS,
  deductionRecords = [],
  onAcceptTask,
  onPauseTask,
  onSuspendTask,
  onResumeTask,
  onCompleteTask,
}) => {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'pending' | 'in_progress' | 'paused' | 'suspended' | 'completed' | 'all'>('broadcast');
  const [deductionListCollapsed, setDeductionListCollapsed] = useState(false);
  const [selectedTaskForWhatsApp, setSelectedTaskForWhatsApp] = useState<MaintenanceTask | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [pausingTaskId, setPausingTaskId] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [suspendingTaskId, setSuspendingTaskId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [actionLoading, setActionLoading] = useState(false);

  // Live stopwatch update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Tasks broadcast to ALL technicians (unclaimed)
  const broadcastTasks = tasks.filter(
    (t) =>
      (t.assignedToId === 'all' || !t.assignedToId) &&
      (t.status === 'pending' || (!t.acceptedAt && !t.completedAt && t.status !== 'paused' && t.status !== 'suspended'))
  );

  // 2. Tasks assigned directly to this technician and pending acceptance
  const directPendingTasks = tasks.filter(
    (t) =>
      t.assignedToId === technician.id &&
      (t.status === 'pending' || (!t.acceptedAt && !t.completedAt && t.status !== 'paused' && t.status !== 'suspended'))
  );

  // 3. Tasks currently in-progress by this technician
  const inProgressTasks = tasks.filter(
    (t) =>
      t.assignedToId === technician.id &&
      t.status !== 'paused' &&
      t.status !== 'suspended' &&
      (t.status === 'in_progress' || (!!t.acceptedAt && !t.completedAt))
  );

  // 4. Tasks temporarily paused by this technician
  const pausedTasks = tasks.filter(
    (t) => t.assignedToId === technician.id && t.status === 'paused' && !t.completedAt
  );

  // 5. Tasks suspended / put on hold ("المهام المعلقة")
  const suspendedTasks = tasks.filter(
    (t) => t.assignedToId === technician.id && t.status === 'suspended' && !t.completedAt
  );

  // 6. Tasks completed by this technician
  const completedTasks = tasks.filter(
    (t) => t.assignedToId === technician.id && (t.status === 'completed' || !!t.completedAt)
  );

  // 7. All tasks relevant to this technician
  const myAllTasks = tasks.filter(
    (t) => t.assignedToId === technician.id || ((t.assignedToId === 'all' || !t.assignedToId) && (t.status === 'pending' || !t.acceptedAt))
  );

  const displayedTasks = (() => {
    switch (activeTab) {
      case 'broadcast':
        return broadcastTasks;
      case 'pending':
        return directPendingTasks;
      case 'in_progress':
        return inProgressTasks;
      case 'paused':
        return pausedTasks;
      case 'suspended':
        return suspendedTasks;
      case 'completed':
        return completedTasks;
      case 'all':
      default:
        return myAllTasks;
    }
  })();

  const handleStartComplete = (taskId: string) => {
    setCompletingTaskId(taskId);
    setPausingTaskId(null);
    setSuspendingTaskId(null);
    setCompletionNotes('');
  };

  const handleConfirmComplete = async (task: MaintenanceTask) => {
    try {
      setActionLoading(true);
      await onCompleteTask(task, completionNotes);
      setCompletingTaskId(null);
      setCompletionNotes('');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartPause = (taskId: string) => {
    setPausingTaskId(taskId);
    setCompletingTaskId(null);
    setSuspendingTaskId(null);
    setPauseReason('');
  };

  const handleConfirmPause = async (task: MaintenanceTask) => {
    try {
      setActionLoading(true);
      await onPauseTask(task, pauseReason);
      setPausingTaskId(null);
      setPauseReason('');
      setActiveTab('paused');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartSuspend = (taskId: string) => {
    setSuspendingTaskId(taskId);
    setCompletingTaskId(null);
    setPausingTaskId(null);
    setSuspendReason('');
  };

  const handleConfirmSuspend = async (task: MaintenanceTask) => {
    try {
      setActionLoading(true);
      await onSuspendTask(task, suspendReason);
      setSuspendingTaskId(null);
      setSuspendReason('');
      setActiveTab('suspended');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async (taskId: string) => {
    try {
      setActionLoading(true);
      await onResumeTask(taskId);
      setActiveTab('in_progress');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async (taskId: string) => {
    try {
      setActionLoading(true);
      await onAcceptTask(taskId);
      setActiveTab('in_progress');
    } finally {
      setActionLoading(false);
    }
  };

  const getTaskTypeBadge = (type: string) => {
    switch (type) {
      case 'صيانة':
        return 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
      case 'تنصيب':
        return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
      case 'ضعف':
        return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
      case 'مشاكل اخرى':
      default:
        return 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20';
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm dark:shadow-xl transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-lg sm:text-xl shadow-inner shrink-0">
              {technician.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                  أهلاً بك، الفني {technician.fullName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>فني صيانة معتمد</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-1 flex-wrap">
                <span>{technician.specialty || 'صيانة شبكات الإنترنت'}</span>
                <span>·</span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>فايبر بيس متصل</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Counter Badges - 6 responsive columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2 w-full lg:w-auto">
            <div className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-center sm:text-right">
              <div className="text-[10px] sm:text-[11px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center sm:justify-start gap-1">
                <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>مرسلة للكل</span>
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 tabular-nums">{broadcastTasks.length} متاحة</div>
            </div>
            <div className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-center sm:text-right">
              <div className="text-[10px] sm:text-[11px] text-amber-800 dark:text-amber-300 font-medium">بانتظار قبولي</div>
              <div className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-400 tabular-nums">{directPendingTasks.length} طلب</div>
            </div>
            <div className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-center sm:text-right">
              <div className="text-[10px] sm:text-[11px] text-blue-800 dark:text-blue-300 font-medium">قيد التنفيذ</div>
              <div className="text-base sm:text-lg font-black text-blue-700 dark:text-blue-400 tabular-nums">{inProgressTasks.length} مهمة</div>
            </div>
            <div className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-300 dark:border-yellow-500/30 text-center sm:text-right">
              <div className="text-[10px] sm:text-[11px] text-yellow-800 dark:text-yellow-300 font-medium">متوقفة مؤقتاً</div>
              <div className="text-base sm:text-lg font-black text-yellow-700 dark:text-yellow-400 tabular-nums">{pausedTasks.length} مهمة</div>
            </div>
            <div className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-center sm:text-right">
              <div className="text-[10px] sm:text-[11px] text-orange-800 dark:text-orange-300 font-medium">المهام المعلقة</div>
              <div className="text-base sm:text-lg font-black text-orange-700 dark:text-orange-400 tabular-nums">{suspendedTasks.length} مهمة</div>
            </div>
            <div className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-center sm:text-right">
              <div className="text-[10px] sm:text-[11px] text-teal-800 dark:text-teal-300 font-medium">المنجزة</div>
              <div className="text-base sm:text-lg font-black text-teal-700 dark:text-teal-400 tabular-nums">{completedTasks.length} مهمة</div>
            </div>
          </div>
        </div>
      </div>

      {/* Push Notification Setup & Test Banner */}
      <NotificationSettingsBanner />

      {/* رصيد الخصومات ونسب الخصم وتفاصيل أسباب الخصم الخاص بالموظف */}
      {(() => {
        const myBalance = typeof technician.deductionBalance === 'number' ? technician.deductionBalance : 0;
        const myDeductions = deductionRecords.filter((r) => r.userId === technician.id);
        const acceptDeductionsTotal = myDeductions
          .filter((r) => r.reason === 'accept_delay')
          .reduce((sum, r) => sum + (r.amount || 0), 0);
        const completionDeductionsTotal = myDeductions
          .filter((r) => r.reason === 'completion_delay')
          .reduce((sum, r) => sum + (r.amount || 0), 0);
        const isDetailsVisible = !deductionListCollapsed;

        return (
          <div className={`rounded-2xl border p-4 sm:p-5 shadow-sm dark:shadow-lg transition-all space-y-3.5 ${
            myBalance > 0
              ? 'bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-500/40'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}>
            {/* Header Row: Title + Total Deduction Balance */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center shrink-0 ${
                  myBalance > 0
                    ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}>
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">رصيد الخصومات ونسبة الخصم</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      رصيد خصومات فقط
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    يوضح رصيد الخصومات المترتب عليك، نسبة/مقدار الخصم المعتمد، وسبب كل خصم تم تسجيله
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <div className={`px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-black tabular-nums ${
                  myBalance > 0
                    ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/35 text-rose-700 dark:text-rose-300'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                }`}>
                  الرصيد: {formatDeductionAmount(myBalance, deductionSettings.unitLabel)}
                </div>

                <button
                  type="button"
                  onClick={() => setDeductionListCollapsed(!deductionListCollapsed)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <span>{isDetailsVisible ? 'إخفاء التفاصيل' : `عرض التفاصيل (${myDeductions.length})`}</span>
                  {isDetailsVisible ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* نسب ومقادير الخصم المعتمدة من المدير (تظهر دائماً للموظف) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-amber-200 dark:border-amber-500/25 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block">نسبة / مقدار خصم التأخير في قبول المهمة</span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400">
                    {deductionSettings.enabled
                      ? `يُخصم عند التأخير أكثر من ${deductionSettings.acceptDelayMinutes} دقيقة (على المهمة الأولى فقط)`
                      : 'متوقف حالياً من إعدادات المدير'}
                  </span>
                  {acceptDeductionsTotal > 0 && (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mt-0.5">
                      مجموع خصم تأخير القبول عليك: -{formatDeductionAmount(acceptDeductionsTotal, deductionSettings.unitLabel)}
                    </span>
                  )}
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 font-black tabular-nums shrink-0">
                  {formatDeductionAmount(deductionSettings.acceptDelayDeduction, deductionSettings.unitLabel)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-rose-200 dark:border-rose-500/25 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 block">نسبة / مقدار خصم التأخير في إنجاز المهمة</span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400">
                    {deductionSettings.enabled
                      ? `يُخصم عند تجاوز ${deductionSettings.completionDelayMinutes} دقيقة عمل فعلي (على المهمة الأولى فقط)`
                      : 'متوقف حالياً من إعدادات المدير'}
                  </span>
                  {completionDeductionsTotal > 0 && (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mt-0.5">
                      مجموع خصم تأخير الإنجاز عليك: -{formatDeductionAmount(completionDeductionsTotal, deductionSettings.unitLabel)}
                    </span>
                  )}
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 font-black tabular-nums shrink-0">
                  {formatDeductionAmount(deductionSettings.completionDelayDeduction, deductionSettings.unitLabel)}
                </span>
              </div>
            </div>

            {/* سجل الخصومات التفصيلي (لماذا تم خصمه وكم مقدار الخصم) */}
            {isDetailsVisible && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    سجل وأسباب الخصومات المطبقة عليك ({myDeductions.length})
                  </span>
                  <span className="text-[10px] text-slate-500">
                    المهام الثانية والإضافية معفاة تلقائياً
                  </span>
                </div>

                {myDeductions.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 text-center">
                    لا توجد أي خصومات مسجلة عليك حالياً.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myDeductions.map((rec) => {
                      const relatedTask = tasks.find((t) => t.id === rec.taskId);
                      const isAcceptedRelated = !!relatedTask?.acceptedAt;

                      return (
                        <div
                          key={rec.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-rose-200 dark:border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400" dir="ltr">{rec.taskNumber}</span>
                              <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/25 text-[10px] font-bold">
                                سبب الخصم: {getDeductionReasonLabel(rec.reason)}
                              </span>
                              {isAcceptedRelated && relatedTask?.subscriberName && (
                                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                                  ({relatedTask.subscriberName})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400">
                              {rec.reason === 'accept_delay'
                                ? `تأخرت في قبول المهمة (${rec.delayMinutes} دقيقة) بينما المدة المسموحة للقبول (${rec.allowedMinutes} دقيقة).`
                                : `تجاوزت مدة إنجاز المهمة (${rec.delayMinutes} دقيقة عمل) بينما المدة المسموحة للإنجاز (${rec.allowedMinutes} دقيقة).`}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              وقت تسجيل الخصم: {formatArabicDateTime(rec.createdAt)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 font-black text-rose-700 dark:text-rose-300 tabular-nums">
                              مقدار الخصم: -{formatDeductionAmount(rec.amount, rec.unitLabel)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* بطاقة جديدة في حساب الفني للمهام المرسلة للكل */}
      <div className="bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>بطاقة المهام العامة المرسلة للكل</span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-normal">(متاحة لأي فني)</span>
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  broadcastTasks.length > 0
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {broadcastTasks.length} {broadcastTasks.length === 1 ? 'مهمة متاحة' : 'مهام متاحة للجميع'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                مهام عامة أرسلها المدير لكافة الفنيين، يمكن لأي فني أخذ المهمة ونسبها لنفسه فوراً والبدء بها.
              </p>
            </div>
          </div>
        </div>

        {broadcastTasks.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-center text-xs text-slate-500 dark:text-slate-400">
            لا توجد مهام عامة مرسلة للكل حالياً. عندما يرسل المدير مهمة للكل ستظهر هنا فوراً لأي فني يرغب بأخذها.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {broadcastTasks.map((task) => (
              <div
                key={task.id}
                className="bg-slate-50 dark:bg-slate-950 border border-emerald-200 dark:border-emerald-500/40 hover:border-emerald-400 dark:hover:border-emerald-500/70 rounded-xl p-4 shadow-xs dark:shadow-md space-y-3 transition-all"
              >
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400" dir="ltr">
                      {task.taskNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getTaskTypeBadge(task.taskType)}`}>
                      نوع المهمة: {task.taskType}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                    📢 مرسلة للكل
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-amber-200 dark:border-amber-500/25 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>معلومات المهمة مخفية قبل القبول</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    يظهر اسم المشترك ورقم الهاتف وأزرار الاتصال والواتساب والملاحظات فور ضغطك على زر أخذ المهمة بالأسفل.
                  </p>
                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800/70 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>وقت الإرسال:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{formatArabicDateTime(task.createdAt)}</span>
                  </div>
                </div>

                {/* زر أخذ المهمة ونسبها لنفسي */}
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAccept(task.id)}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ring-1 ring-emerald-400/40 disabled:opacity-50 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>⚡ أخذ المهمة ونسبها لنفسي والبدء بها فوراً</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs Navigation - 7 tabs cleanly wrapped on mobile (2 cols) and desktop (7 cols) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2 pb-1 border-b border-slate-200 dark:border-slate-800 w-full">
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:px-2.5 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'broadcast'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 ring-1 ring-emerald-400/40'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">المرسلة للكل</span>
          {broadcastTasks.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-black shrink-0 ${
              activeTab === 'broadcast' ? 'bg-white text-emerald-700 dark:bg-slate-950 dark:text-emerald-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
            }`}>
              {broadcastTasks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:px-2.5 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">الموجهة لي</span>
          {directPendingTasks.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-black shrink-0 ${
              activeTab === 'pending' ? 'bg-slate-950 text-amber-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
            }`}>
              {directPendingTasks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('in_progress')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:px-2.5 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'in_progress'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Play className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">الجارية</span>
          {inProgressTasks.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-black shrink-0 ${
              activeTab === 'in_progress' ? 'bg-white text-blue-600' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
            }`}>
              {inProgressTasks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('paused')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:px-2.5 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'paused'
              ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Pause className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">المتوقفة مؤقتاً</span>
          {pausedTasks.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-black shrink-0 ${
              activeTab === 'paused' ? 'bg-slate-950 text-yellow-400' : 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300'
            }`}>
              {pausedTasks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('suspended')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:px-2.5 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'suspended'
              ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <PauseCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">المهام المعلقة</span>
          {suspendedTasks.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-black shrink-0 ${
              activeTab === 'suspended' ? 'bg-slate-950 text-orange-400' : 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300'
            }`}>
              {suspendedTasks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:px-2.5 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'completed'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">المنجزة</span>
          <span className="text-[10px] tabular-nums opacity-70">({completedTasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 py-2 px-2 sm:px-2.5 sm:py-2.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'all'
              ? 'bg-slate-800 dark:bg-slate-700 text-white'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
          }`}
        >
          <span className="truncate">كافة مهامي ({myAllTasks.length})</span>
        </button>
      </div>

      {/* Task Cards Grid */}
      {displayedTasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
            {activeTab === 'broadcast'
              ? 'لا توجد مهام عامة مرسلة للكل حالياً'
              : activeTab === 'pending'
              ? 'لا توجد طلبات صيانة خاصة موجهة لك بانتظار القبول حالياً'
              : activeTab === 'in_progress'
              ? 'لا توجد مهام جارية قيد التنفيذ حالياً'
              : activeTab === 'paused'
              ? 'لا توجد مهام متوقفة مؤقتاً حالياً'
              : activeTab === 'suspended'
              ? 'لا توجد مهام معلقة حالياً'
              : activeTab === 'completed'
              ? 'لا توجد مهام منجزة بعد'
              : 'لا توجد مهام مسجلة'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto mt-1">
            {activeTab === 'broadcast'
              ? 'عندما يقوم المدير بإرسال مهمة للكل ستظهر في بطاقة المهام العامة ويمكن لأي فني أخذها.'
              : activeTab === 'paused'
              ? 'عند الضغط على إيقاف مؤقت لأي مهمة جارية ستظهر هنا ويمكنك استئنافها في أي وقت.'
              : activeTab === 'suspended'
              ? 'عند الضغط على تعليق المهمة بعد قبولها ستتم إضافتها هنا في المهام المعلقة.'
              : 'عندما يقوم المدير بإرسال مهمة جديدة ستظهر في بطاقة انتظار الطلبات مباشرة عبر فايبر بيس.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedTasks.map((task) => {
            const isCompleted = task.status === 'completed' || !!task.completedAt;
            const isPaused = !isCompleted && task.status === 'paused';
            const isSuspended = !isCompleted && task.status === 'suspended';
            const isInProgress = !isCompleted && !isPaused && !isSuspended && (task.status === 'in_progress' || !!task.acceptedAt);
            const isPending = !isCompleted && !isPaused && !isSuspended && !isInProgress;

            const activeStartIso = task.resumedAt || task.acceptedAt;
            const currentSegmentSecs = isInProgress && activeStartIso
              ? Math.max(0, Math.floor((currentTime - new Date(activeStartIso).getTime()) / 1000))
              : 0;
            const liveSeconds = (task.accumulatedSeconds || 0) + currentSegmentSecs;

            const retentionNotice = getRetentionCountdown(task.createdAt);

            return (
              <div
                key={task.id}
                className={`rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-sm dark:shadow-lg ${
                  isPending
                    ? 'bg-white dark:bg-slate-900/95 border-amber-300 dark:border-amber-500/40'
                    : isPaused
                    ? 'bg-white dark:bg-slate-900/95 border-yellow-400 dark:border-yellow-500/50'
                    : isSuspended
                    ? 'bg-white dark:bg-slate-900/95 border-orange-300 dark:border-orange-500/50'
                    : isInProgress
                    ? 'bg-white dark:bg-slate-900/95 border-blue-300 dark:border-blue-500/40'
                    : 'bg-white/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 opacity-95'
                }`}
              >
                <div>
                  {/* Card Header: Task # & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400" dir="ltr">
                        {task.taskNumber}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        مرسلة من: {task.createdBy}
                      </span>
                    </div>

                    {isPending && (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                        بانتظار القبول
                      </span>
                    )}
                    {isInProgress && (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" />
                        <span>قيد التنفيذ بالموقع</span>
                      </span>
                    )}
                    {isPaused && (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-yellow-50 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-500/30 flex items-center gap-1.5">
                        <Pause className="w-3.5 h-3.5 text-yellow-700 dark:text-yellow-400" />
                        <span>متوقفة مؤقتاً</span>
                      </span>
                    )}
                    {isSuspended && (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30 flex items-center gap-1.5">
                        <PauseCircle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                        <span>مهمة معلقة</span>
                      </span>
                    )}
                    {isCompleted && (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>مكتملة</span>
                      </span>
                    )}
                  </div>

                  {/* نوع المهمة (صيانة / تنصيب / ضعف / مشاكل اخرى) */}
                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border ${getTaskTypeBadge(task.taskType)}`}>
                      نوع المهمة: {task.taskType}
                    </span>

                    {isTaskSecondaryOrExempt(task, tasks) && (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/25">
                        مهمة إضافية — معفاة من الخصم
                      </span>
                    )}

                    {(task.acceptDeductionAmount || 0) > 0 && (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                        خصم تأخير قبول: -{formatDeductionAmount(task.acceptDeductionAmount || 0, deductionSettings.unitLabel)}
                      </span>
                    )}

                    {(task.completionDeductionAmount || 0) > 0 && (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                        خصم تأخير إنجاز: -{formatDeductionAmount(task.completionDeductionAmount || 0, deductionSettings.unitLabel)}
                      </span>
                    )}
                  </div>

                  {isPending ? (
                    <div className="mt-2.5 p-3.5 sm:p-4 rounded-xl bg-amber-50/70 dark:bg-slate-950/80 border border-amber-200 dark:border-amber-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/25 flex items-center justify-center shrink-0">
                          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span>معلومات المهمة مخفية حالياً</span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        تم إخفاء اسم المشترك ورقم الهاتف وأزرار الاتصال والواتساب والملاحظات. ستظهر كافة التفاصيل فور قبولك للمهمة بالأسفل.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* اسم المشترك ورقم الهاتف مع أيقونة الاتصال وأيقونة الواتساب */}
                      <div className="mt-2.5 p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <UserIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            <span>اسم المشترك:</span>
                          </span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[170px] sm:max-w-none">
                            {task.subscriberName}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            <span>رقم الهاتف:</span>
                          </span>

                          {/* مقابل رقم الهاتف: أيقونة الاتصال وأيقونة الواتساب */}
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="font-mono text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200" dir="ltr">
                              {task.phone}
                            </span>

                            {/* أيقونة الاتصال */}
                            <a
                              href={getTelUrl(task.phone)}
                              className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white border border-blue-200 dark:border-blue-500/30 transition-all shrink-0"
                              title={`اتصال هاتفي مباشر بالرقم ${task.phone}`}
                            >
                              <Phone className="w-4 h-4" />
                            </a>

                            {/* أيقونة الواتساب (خيارات إرسال رسالة أو الاتصال عبر الواتساب) */}
                            <button
                              type="button"
                              onClick={() => setSelectedTaskForWhatsApp(task)}
                              className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 hover:text-white border border-emerald-200 dark:border-emerald-500/30 transition-all shadow-sm shrink-0"
                              title="خيارات الواتساب: إرسال رسالة جاهزة أو الاتصال عبر الواتساب"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ملاحظات فقط */}
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>ملاحظات المهمة:</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                          {task.notes && task.notes.trim().length > 0 ? task.notes : 'لا توجد ملاحظات إضافية'}
                        </p>
                      </div>
                    </>
                  )}

                  {/* سبب الإيقاف المؤقت إن وجد */}
                  {isPaused && (
                    <div className="mt-2 p-2.5 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 dark:border-yellow-500/30 text-xs">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-yellow-800 dark:text-yellow-300 flex items-center gap-1.5">
                          <Pause className="w-3.5 h-3.5 text-yellow-700 dark:text-yellow-400" />
                          <span>تم إيقاف المهمة مؤقتاً</span>
                        </span>
                        {task.pausedAt && (
                          <span className="text-[10px] text-yellow-700 dark:text-yellow-300/80">
                            {formatArabicDateTime(task.pausedAt)}
                          </span>
                        )}
                      </div>
                      <span className="text-yellow-900 dark:text-slate-300 block">
                        السبب: {task.pauseReason && task.pauseReason.trim().length > 0 ? task.pauseReason : 'لم يُذكر سبب محدد'}
                      </span>
                    </div>
                  )}

                  {/* سبب تعليق المهمة إن وجد */}
                  {isSuspended && (
                    <div className="mt-2 p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-500/30 text-xs">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-orange-800 dark:text-orange-300 flex items-center gap-1.5">
                          <PauseCircle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                          <span>تم تعليق المهمة</span>
                        </span>
                        {task.suspendedAt && (
                          <span className="text-[10px] text-orange-700 dark:text-orange-300/80">
                            {formatArabicDateTime(task.suspendedAt)}
                          </span>
                        )}
                      </div>
                      <span className="text-orange-900 dark:text-slate-300 block">
                        السبب: {task.suspendReason && task.suspendReason.trim().length > 0 ? task.suspendReason : 'لم يُذكر سبب محدد'}
                      </span>
                    </div>
                  )}

                  {/* ملاحظات الإنجاز إن وجدت */}
                  {task.completionNotes && (
                    <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 block mb-0.5">ملاحظات الإنجاز:</span>
                      <span className="text-slate-700 dark:text-slate-300">{task.completionNotes}</span>
                    </div>
                  )}

                  {/* توثيق الأوقات: وقت الإرسال، وقت القبول، وقت الانتهاء، والوقت المستغرق */}
                  <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">وقت الإرسال:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{formatArabicDateTime(task.createdAt)}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">وقت القبول:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {task.acceptedAt ? formatArabicDateTime(task.acceptedAt) : 'بانتظار القبول'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">وقت الانتهاء:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {task.completedAt
                          ? formatArabicDateTime(task.completedAt)
                          : isPaused
                          ? 'متوقفة مؤقتاً'
                          : isSuspended
                          ? 'مهمة معلقة'
                          : 'قيد الانتظار'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">الوقت المستغرق بالمهمة:</span>
                      {isCompleted ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">{task.durationFormatted || '—'}</span>
                      ) : isPaused ? (
                        <span className="text-yellow-700 dark:text-yellow-400 font-mono font-bold" dir="ltr">
                          ⏸ {formatDigitalTimer(liveSeconds)}
                        </span>
                      ) : isSuspended ? (
                        <span className="text-orange-600 dark:text-orange-400 font-mono font-bold" dir="ltr">
                          ⏸ {formatDigitalTimer(liveSeconds)}
                        </span>
                      ) : isInProgress ? (
                        <span className="text-blue-600 dark:text-blue-400 font-mono font-bold" dir="ltr">
                          ⏱ {formatDigitalTimer(liveSeconds)}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </div>
                  </div>

                  {/* حفظ السجل لمدة أسبوع */}
                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800/40">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>الحفظ الأسبوعي:</span>
                    </div>
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{retentionNotice}</span>
                  </div>
                </div>

                {/* الأزرار التفاعلية للفني */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                  {isPending && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleAccept(task.id)}
                      className={`w-full py-2.5 px-4 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                        task.assignedToId === 'all'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20 ring-1 ring-emerald-400/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      }`}
                    >
                      {task.assignedToId === 'all' || !task.assignedToId ? (
                        <>
                          <Zap className="w-4 h-4 text-amber-300" />
                          <span>⚡ أخذ المهمة ونسبها لنفسي والبدء بها فوراً</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>قبول المهمة وبدء التحرك الآن</span>
                        </>
                      )}
                    </button>
                  )}

                  {(isInProgress || isPaused || isSuspended) && (
                    <>
                      {completingTaskId === task.id ? (
                        <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            ملاحظة إنجاز الصيانة (اختياري):
                          </label>
                          <textarea
                            value={completionNotes}
                            onChange={(e) => setCompletionNotes(e.target.value)}
                            rows={2}
                            placeholder="مثال: تم فحص الإشارة وضبط الراوتر والتأكد من السرعة..."
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleConfirmComplete(task)}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>تأكيد إتمام المهمة وتوثيق الوقت</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setCompletingTaskId(null)}
                              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : pausingTaskId === task.id ? (
                        <div className="space-y-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-300 dark:border-yellow-500/40 rounded-xl">
                          <label className="block text-xs font-semibold text-yellow-800 dark:text-yellow-300">
                            سبب الإيقاف المؤقت (اختياري):
                          </label>
                          <textarea
                            value={pauseReason}
                            onChange={(e) => setPauseReason(e.target.value)}
                            rows={2}
                            placeholder="مثال: استراحة قصيرة أو انتظار عودة الكهرباء..."
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-yellow-300 dark:border-yellow-500/30 rounded-lg text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-yellow-500"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleConfirmPause(task)}
                              className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              <span>تأكيد الإيقاف المؤقت</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPausingTaskId(null)}
                              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : suspendingTaskId === task.id ? (
                        <div className="space-y-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-500/40 rounded-xl">
                          <label className="block text-xs font-semibold text-orange-800 dark:text-orange-300">
                            سبب تعليق المهمة (اختياري):
                          </label>
                          <textarea
                            value={suspendReason}
                            onChange={(e) => setSuspendReason(e.target.value)}
                            rows={2}
                            placeholder="مثال: المشترك غير متواجد حالياً، أو بانتظار قطعة غيار / كابل..."
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-500/30 rounded-lg text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-orange-500"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleConfirmSuspend(task)}
                              className="flex-1 py-2 bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                              <span>تأكيد تعليق المهمة ونقلها للمعلقة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSuspendingTaskId(null)}
                              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (isPaused || isSuspended) ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleResume(task.id)}
                            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                          >
                            <PlayCircle className="w-4 h-4" />
                            <span>استئناف العمل على المهمة</span>
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleStartComplete(task.id)}
                            className="py-2.5 px-3 bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-600 text-blue-700 dark:text-blue-300 hover:text-white border border-blue-200 dark:border-blue-500/30 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>إتمام المهمة</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleStartComplete(task.id)}
                            className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>إتمام المهمة</span>
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleStartPause(task.id)}
                            className="py-2.5 px-3 bg-yellow-50 dark:bg-yellow-500/15 hover:bg-yellow-500 text-yellow-800 dark:text-yellow-300 hover:text-slate-950 border border-yellow-300 dark:border-yellow-500/30 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            title="إيقاف المهمة مؤقتاً مع حفظ الوقت"
                          >
                            <Pause className="w-4 h-4 shrink-0" />
                            <span>إيقاف مؤقت</span>
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleStartSuspend(task.id)}
                            className="py-2.5 px-3 bg-orange-50 dark:bg-orange-500/15 hover:bg-orange-500 text-orange-700 dark:text-orange-300 hover:text-slate-950 border border-orange-200 dark:border-orange-500/30 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            title="تعليق المهمة ونقلها إلى قائمة المهام المعلقة"
                          >
                            <PauseCircle className="w-4 h-4 shrink-0" />
                            <span>تعليق المهمة</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {isCompleted && (
                    <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تمت المهمة وتوثيق الوقت</span>
                      </span>
                      <span className="text-slate-600 dark:text-slate-300 text-[11px] font-normal">
                        الوقت المستغرق: {task.durationFormatted}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WhatsApp Modal */}
      {selectedTaskForWhatsApp && (
        <WhatsAppPreviewModal
          task={selectedTaskForWhatsApp}
          technicianName={technician.fullName}
          customTemplate={whatsappTemplate}
          onClose={() => setSelectedTaskForWhatsApp(null)}
        />
      )}
    </div>
  );
};
