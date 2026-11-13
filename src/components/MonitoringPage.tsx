import React, { useState, useEffect } from 'react';
import { MaintenanceTask, User } from '../types';
import { 
  formatArabicDateTime, 
  formatDigitalTimer, 
  getRetentionCountdown, 
  isTaskUnacceptedOverdue, 
  getElapsedMinutes 
} from '../utils/time';
import { getTelUrl } from '../utils/whatsapp';
import { WhatsAppPreviewModal } from './WhatsAppPreviewModal';
import { TaskEditModal, TaskModalMode, TaskEditPayload } from './TaskEditModal';
import { 
  Clock, 
  Play, 
  Phone, 
  MessageSquare, 
  User as UserIcon, 
  FileText, 
  Trash2, 
  Search, 
  CheckCircle2, 
  Database,
  Radio,
  AlertTriangle,
  Users,
  PauseCircle,
  Edit3,
  RotateCw
} from 'lucide-react';

interface Props {
  tasks: MaintenanceTask[];
  technicians: User[];
  whatsappTemplate?: string;
  onOpenWhatsAppTemplate?: () => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<MaintenanceTask>) => Promise<void>;
  onResendExistingTask: (task: MaintenanceTask, overrides: TaskEditPayload) => Promise<void>;
  onCompleteTask?: (task: MaintenanceTask, notes?: string) => Promise<void>;
  onReassignToAll?: (taskId: string) => Promise<void>;
}

export const MonitoringPage: React.FC<Props> = ({
  tasks,
  technicians,
  whatsappTemplate,
  onOpenWhatsAppTemplate,
  onDeleteTask,
  onUpdateTask,
  onResendExistingTask,
  onCompleteTask,
  onReassignToAll,
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedWhatsAppTask, setSelectedWhatsAppTask] = useState<MaintenanceTask | null>(null);
  const [editingTaskState, setEditingTaskState] = useState<{ task: MaintenanceTask; mode: TaskModalMode } | null>(null);

  // Live timer update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pendingTasks = tasks.filter(
    (t) => t.status === 'pending' || (!t.acceptedAt && !t.completedAt && t.status !== 'paused')
  );
  const inProgressTasks = tasks.filter(
    (t) => t.status !== 'paused' && !t.completedAt && (t.status === 'in_progress' || !!t.acceptedAt)
  );
  const pausedTasks = tasks.filter((t) => t.status === 'paused' && !t.completedAt);

  const filterTasks = (taskList: MaintenanceTask[]) => {
    return taskList.filter((t) => {
      const matchSearch =
        t.subscriberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.phone.includes(searchQuery) ||
        t.taskNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.assignedToName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === 'all' || t.taskType === filterType;
      return matchSearch && matchType;
    });
  };

  const filteredPending = filterTasks(pendingTasks);
  const filteredInProgress = filterTasks(inProgressTasks);
  const filteredPaused = filterTasks(pausedTasks);

  const getTaskTypeBadge = (type: string) => {
    switch (type) {
      case 'صيانة':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'تنصيب':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'ضعف':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'مشاكل اخرى':
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
  };

  const todayStr = new Date().toDateString();
  const todayCompletedCount = tasks.filter((t) => {
    if (!t.completedAt) return false;
    try {
      return new Date(t.completedAt).toDateString() === todayStr;
    } catch {
      return false;
    }
  }).length;

  const overdueTasks = pendingTasks.filter((t) => isTaskUnacceptedOverdue(t.createdAt, 15, currentTime));

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold text-white">صفحة متابعة المهام الجارية والمعلقة</h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>مزامنة فايبر بيس حية</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            متابعة فورية للمهام قيد الانتظار والمهام الجاري العمل عليها مع توثيق الأوقات الحية وتنبيهات التأخير
          </p>
        </div>
      </div>

      {/* تنبيه تلقائي عاجل للمدير عند وجود طلبات لم تقبل بعد 15 دقيقة */}
      {overdueTasks.length > 0 && (
        <div className="bg-rose-950/40 border-2 border-rose-500/60 rounded-2xl p-3.5 sm:p-5 shadow-xl shadow-rose-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-bold text-rose-200">
                  تنبيه المدير: يوجد ({overdueTasks.length}) طلبات معلقة تجاوزت 15 دقيقة دون أن يقبلها أي فني!
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse">
                  متأخرة
                </span>
              </div>
              <p className="text-xs text-rose-300/80 mt-0.5">
                مضى أكثر من 15 دقيقة على الإرسال دون قبول. يمكنك الاتصال المباشر بالمشترك أو إعادة إرسال المهمة للكل فوراً.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* بطاقات الإحصائيات المطلوبة: بانتظار القبول، الجارية، المتوقفة مؤقتاً، إنجاز اليوم */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* بطاقة الطلبات بانتظار القبول */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-3.5 sm:p-5 shadow-lg shadow-amber-950/10 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-amber-300 block mb-0.5 truncate">بانتظار القبول</span>
            <div className="text-xl sm:text-3xl font-black text-amber-400 tabular-nums">
              {pendingTasks.length} <span className="text-[11px] sm:text-xs font-normal text-slate-400">طلب</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 block truncate">بانتظار قبول الفني للبدء</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* بطاقة الطلبات الجارية */}
        <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-3.5 sm:p-5 shadow-lg shadow-blue-950/10 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-blue-300 block mb-0.5 truncate">الطلبات الجارية</span>
            <div className="text-xl sm:text-3xl font-black text-blue-400 tabular-nums">
              {inProgressTasks.length} <span className="text-[11px] sm:text-xs font-normal text-slate-400">مهمة</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 block truncate">قيد التنفيذ بالموقع</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Play className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* بطاقة المهام المعلقة من قبل الفني */}
        <div className="bg-slate-900 border border-orange-500/30 rounded-2xl p-3.5 sm:p-5 shadow-lg shadow-orange-950/10 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-orange-300 block mb-0.5 truncate">المهام المعلقة</span>
            <div className="text-xl sm:text-3xl font-black text-orange-400 tabular-nums">
              {pausedTasks.length} <span className="text-[11px] sm:text-xs font-normal text-slate-400">مهمة</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 block truncate">معلقة لحين الاستئناف</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-500/15 text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0">
            <PauseCircle className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* بطاقة إنجاز اليوم */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-3.5 sm:p-5 shadow-lg shadow-emerald-950/10 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-300 block mb-0.5 truncate">إنجاز اليوم</span>
            <div className="text-xl sm:text-3xl font-black text-emerald-400 tabular-nums">
              {todayCompletedCount} <span className="text-[11px] sm:text-xs font-normal text-slate-400">منجزة</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 block truncate">تم إتمامها اليوم</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المشترك، الهاتف، رقم المهمة، أو الفني..."
            className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">نوع المهمة:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">كافة الأنواع</option>
            <option value="صيانة">صيانة</option>
            <option value="تنصيب">تنصيب</option>
            <option value="ضعف">ضعف</option>
            <option value="مشاكل اخرى">مشاكل اخرى</option>
          </select>
        </div>
      </div>

      {/* Section 1: المهام الجارية (In Progress) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
          <Play className="w-4 h-4" />
          <span>المهام الجارية قيد التنفيذ بالموقع ({filteredInProgress.length})</span>
        </div>

        {filteredInProgress.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
            لا توجد مهام جارية قيد التنفيذ حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInProgress.map((task) => {
              const activeStartStr = task.resumedAt || task.acceptedAt;
              const liveSegmentSecs = activeStartStr
                ? Math.max(0, Math.floor((currentTime - new Date(activeStartStr).getTime()) / 1000))
                : 0;
              const liveSecs = (task.accumulatedSeconds || 0) + liveSegmentSecs;

              return (
                <div
                  key={task.id}
                  className="bg-slate-900 border border-blue-500/40 rounded-2xl p-5 shadow-lg shadow-blue-950/15 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Task #, Type, Tech */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-400" dir="ltr">
                          {task.taskNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getTaskTypeBadge(task.taskType)}`}>
                          نوع المهمة: {task.taskType}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        <span>قيد التنفيذ بالموقع</span>
                      </div>
                    </div>

                    {/* Subscriber Box with Phone Actions */}
                    <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">المشترك:</span>
                        <span className="text-white font-bold">{task.subscriberName}</span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs pt-1.5 border-t border-slate-800/80">
                        <span className="text-slate-400">رقم الهاتف:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-200" dir="ltr">{task.phone}</span>
                          <a
                            href={getTelUrl(task.phone)}
                            className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition-colors"
                            title="اتصال هاتفي بالمشترك"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setSelectedWhatsAppTask(task)}
                            className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-colors"
                            title="خيارات الواتساب (إرسال رسالة أو الاتصال عبر الواتساب)"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/80">
                        <span className="text-slate-400">الفني المكلف:</span>
                        <span className="text-emerald-400 font-semibold">{task.assignedToName}</span>
                      </div>
                    </div>

                    {/* Notes only */}
                    {task.notes && (
                      <div className="mt-2.5 p-2.5 bg-slate-800/50 rounded-xl text-xs text-slate-300">
                        <span className="text-slate-400 font-semibold block mb-0.5">ملاحظات:</span>
                        {task.notes}
                      </div>
                    )}

                    {/* Timestamps & Live Duration - mobile responsive grid */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">وقت الإرسال:</span>
                        <span className="text-slate-300 font-medium">{formatArabicDateTime(task.createdAt)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">وقت القبول:</span>
                        <span className="text-slate-300 font-medium">{formatArabicDateTime(task.acceptedAt)}</span>
                      </div>
                      <div className="xs:col-span-2 sm:col-span-1">
                        <span className="text-slate-500 block">الوقت المستغرق حتى الآن:</span>
                        <span className="text-blue-400 font-mono font-bold" dir="ltr">
                          ⏱ {formatDigitalTimer(liveSecs)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">
                      {getRetentionCountdown(task.createdAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingTaskState({ task, mode: 'edit' })}
                        className="text-xs bg-blue-600/15 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                        title="تعديل بيانات المهمة أو تبديل الفني"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل / تبديل الفني</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف المهمة (${task.taskNumber})؟`)) {
                            onDeleteTask(task.id);
                          }
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 1.5: المهام المعلقة من قبل الفني */}
      {filteredPaused.length > 0 && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
            <PauseCircle className="w-4 h-4" />
            <span>المهام المعلقة من قبل الفني ({filteredPaused.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPaused.map((task) => (
              <div
                key={task.id}
                className="bg-slate-900 border border-orange-500/40 rounded-2xl p-4 sm:p-5 shadow-lg shadow-orange-950/15 flex flex-col justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-orange-400" dir="ltr">
                        {task.taskNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getTaskTypeBadge(task.taskType)}`}>
                        نوع المهمة: {task.taskType}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-orange-500/15 text-orange-300 border border-orange-500/30 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0">
                      <PauseCircle className="w-3.5 h-3.5 text-orange-400" />
                      <span>مهمة معلقة</span>
                    </div>
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">المشترك:</span>
                      <span className="text-white font-bold">{task.subscriberName}</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs pt-1.5 border-t border-slate-800/80">
                      <span className="text-slate-400">رقم الهاتف:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-200" dir="ltr">{task.phone}</span>
                        <a
                          href={getTelUrl(task.phone)}
                          className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition-colors"
                          title="اتصال هاتفي بالمشترك"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => setSelectedWhatsAppTask(task)}
                          className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-colors"
                          title="خيارات الواتساب (إرسال رسالة أو الاتصال عبر الواتساب)"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/80">
                      <span className="text-slate-400">الفني المكلف:</span>
                      <span className="text-emerald-400 font-semibold">{task.assignedToName}</span>
                    </div>
                  </div>

                  {task.pauseReason && (
                    <div className="mt-2.5 p-2.5 bg-orange-950/40 border border-orange-500/30 rounded-xl text-xs text-orange-200">
                      <span className="text-orange-400 font-semibold block mb-0.5">سبب تعليق المهمة:</span>
                      {task.pauseReason}
                    </div>
                  )}

                  {task.notes && (
                    <div className="mt-2.5 p-2.5 bg-slate-800/50 rounded-xl text-xs text-slate-300">
                      <span className="text-slate-400 font-semibold block mb-0.5">ملاحظات:</span>
                      {task.notes}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">وقت الإرسال:</span>
                      <span className="text-slate-300 font-medium">{formatArabicDateTime(task.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">وقت التعليق:</span>
                      <span className="text-orange-300 font-medium">{formatArabicDateTime(task.pausedAt ?? null)}</span>
                    </div>
                    <div className="xs:col-span-2 sm:col-span-1">
                      <span className="text-slate-500 block">الوقت المنقضي المحفوظ:</span>
                      <span className="text-orange-400 font-mono font-bold" dir="ltr">
                        ⏸ {formatDigitalTimer(task.accumulatedSeconds || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">
                    {getRetentionCountdown(task.createdAt)}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingTaskState({ task, mode: 'resend_existing' })}
                      className="text-xs bg-emerald-600/15 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                      title="إعادة إرسال المهمة المعلقة للفني أو للكل"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>إعادة إرسال</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTaskState({ task, mode: 'edit' })}
                      className="text-xs bg-blue-600/15 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                      title="تعديل بيانات المهمة أو تبديل الفني"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`هل أنت متأكد من حذف المهمة (${task.taskNumber})؟`)) {
                          onDeleteTask(task.id);
                        }
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: المهام المعلقة (Pending) */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
          <Clock className="w-4 h-4" />
          <span>المهام المعلقة بانتظار قبول الفني ({filteredPending.length})</span>
        </div>

        {filteredPending.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
            لا توجد طلبات معلقة بانتظار القبول حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPending.map((task) => {
              const isOverdue = isTaskUnacceptedOverdue(task.createdAt, 15, currentTime);
              const elapsedMins = getElapsedMinutes(task.createdAt, currentTime);

              return (
                <div
                  key={task.id}
                  className={`rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all ${
                    isOverdue
                      ? 'bg-slate-900 border-2 border-rose-500/80 shadow-rose-950/30 ring-1 ring-rose-500/30'
                      : 'bg-slate-900 border border-amber-500/30 shadow-amber-950/10'
                  }`}
                >
                  <div>
                    {/* Header: Task #, Type, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-300" dir="ltr">
                          {task.taskNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getTaskTypeBadge(task.taskType)}`}>
                          نوع المهمة: {task.taskType}
                        </span>
                      </div>

                      {isOverdue ? (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-lg text-xs font-bold animate-pulse flex items-center gap-1.5 shrink-0">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>متأخرة ({elapsedMins} دقيقة دون قبول)</span>
                        </span>
                      ) : (
                        <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0">
                          بانتظار قبول الفني
                        </span>
                      )}
                    </div>

                    {/* Subscriber Box with Phone Actions */}
                    <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">المشترك:</span>
                        <span className="text-white font-bold">{task.subscriberName}</span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs pt-1.5 border-t border-slate-800/80">
                        <span className="text-slate-400">رقم الهاتف:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-200" dir="ltr">{task.phone}</span>
                          <a
                            href={getTelUrl(task.phone)}
                            className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition-colors"
                            title="اتصال هاتفي بالمشترك"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setSelectedWhatsAppTask(task)}
                            className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-colors"
                            title="خيارات الواتساب (إرسال رسالة أو الاتصال عبر الواتساب)"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/80">
                        <span className="text-slate-400">الفني الموجه إليه:</span>
                        <span className="text-amber-300 font-semibold">{task.assignedToName}</span>
                      </div>
                    </div>

                    {/* Notes only */}
                    {task.notes && (
                      <div className="mt-2.5 p-2.5 bg-slate-800/50 rounded-xl text-xs text-slate-300">
                        <span className="text-slate-400 font-semibold block mb-0.5">ملاحظات:</span>
                        {task.notes}
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">وقت الإرسال:</span>
                        <span className="text-slate-300 font-medium">{formatArabicDateTime(task.createdAt)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">حالة القبول:</span>
                        {isOverdue ? (
                          <span className="text-rose-400 font-bold">تجاوزت 15 دقيقة دون استجابة</span>
                        ) : (
                          <span className="text-amber-400 font-medium">بانتظار موافقة الفني للبدء</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">
                      {getRetentionCountdown(task.createdAt)}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isOverdue && task.assignedToId !== 'all' && onReassignToAll && (
                        <button
                          type="button"
                          onClick={() => onReassignToAll(task.id)}
                          className="text-xs bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1 transition-all"
                          title="إعادة توجيه المهمة وإرسالها لكافة الفنيين المتاحين فوراً"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>تحويل للكل</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingTaskState({ task, mode: 'resend_existing' })}
                        className="text-xs bg-emerald-600/15 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                        title="إعادة إرسال المهمة المعلقة وتحديث إشعارها"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>إعادة إرسال</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTaskState({ task, mode: 'edit' })}
                        className="text-xs bg-blue-600/15 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                        title="تعديل بيانات المهمة أو تبديل الفني"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`هل تريد إلغاء وحذف المهمة (${task.taskNumber})؟`)) {
                            onDeleteTask(task.id);
                          }
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WhatsApp Modal */}
      {selectedWhatsAppTask && (
        <WhatsAppPreviewModal
          task={selectedWhatsAppTask}
          technicianName={selectedWhatsAppTask.assignedToName}
          customTemplate={whatsappTemplate}
          onEditGlobalTemplate={onOpenWhatsAppTemplate}
          onClose={() => setSelectedWhatsAppTask(null)}
        />
      )}

      {/* Task Edit / Resend Modal */}
      {editingTaskState && (
        <TaskEditModal
          task={editingTaskState.task}
          mode={editingTaskState.mode}
          technicians={technicians}
          onSaveEdit={onUpdateTask}
          onResendExisting={onResendExistingTask}
          onClose={() => setEditingTaskState(null)}
        />
      )}
    </div>
  );
};
