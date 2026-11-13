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
  RotateCw,
  Filter,
  X
} from 'lucide-react';

type MonitoringStatusFilter = 'all' | 'in_progress' | 'suspended' | 'paused' | 'pending';

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
  const [statusFilter, setStatusFilter] = useState<MonitoringStatusFilter>('all');
  const [selectedWhatsAppTask, setSelectedWhatsAppTask] = useState<MaintenanceTask | null>(null);
  const [editingTaskState, setEditingTaskState] = useState<{ task: MaintenanceTask; mode: TaskModalMode } | null>(null);

  const toggleStatusFilter = (target: Exclude<MonitoringStatusFilter, 'all'>) => {
    setStatusFilter((prev) => (prev === target ? 'all' : target));
  };

  // Live timer update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pendingTasks = tasks.filter(
    (t) => t.status === 'pending' || (!t.acceptedAt && !t.completedAt && t.status !== 'paused' && t.status !== 'suspended')
  );
  const inProgressTasks = tasks.filter(
    (t) => t.status !== 'paused' && t.status !== 'suspended' && !t.completedAt && (t.status === 'in_progress' || !!t.acceptedAt)
  );
  const pausedTasks = tasks.filter((t) => t.status === 'paused' && !t.completedAt);
  const suspendedTasks = tasks.filter((t) => t.status === 'suspended' && !t.completedAt);

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
  const filteredSuspended = filterTasks(suspendedTasks);

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

      {/* بطاقات الإحصائيات المطلوبة: بانتظار القبول، الجارية، المتوقفة مؤقتاً، المهام المعلقة، إنجاز اليوم (قابلة للضغط للفرز السريع) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* بطاقة الطلبات بانتظار القبول */}
        <button
          type="button"
          onClick={() => toggleStatusFilter('pending')}
          className={`text-right bg-slate-900 rounded-2xl p-3.5 sm:p-4 shadow-lg flex items-center justify-between gap-2 transition-all cursor-pointer ${
            statusFilter === 'pending'
              ? 'border-2 border-amber-400 ring-2 ring-amber-500/30 shadow-amber-950/30 bg-amber-950/20'
              : 'border border-amber-500/30 shadow-amber-950/10 hover:border-amber-400/60'
          }`}
        >
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-amber-300 block mb-0.5 truncate">بانتظار القبول</span>
            <div className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
              {pendingTasks.length} <span className="text-[11px] sm:text-xs font-normal text-slate-400">طلب</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 block truncate">
              {statusFilter === 'pending' ? 'مفعّل — اضغط لإظهار الكل' : 'اضغط لعرضها فقط'}
            </span>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </button>

        {/* بطاقة الطلبات الجارية */}
        <button
          type="button"
          onClick={() => toggleStatusFilter('in_progress')}
          className={`text-right bg-slate-900 rounded-2xl p-3.5 sm:p-4 shadow-lg flex items-center justify-between gap-2 transition-all cursor-pointer ${
            statusFilter === 'in_progress'
              ? 'border-2 border-blue-400 ring-2 ring-blue-500/30 shadow-blue-950/30 bg-blue-950/20'
              : 'border border-blue-500/30 shadow-blue-950/10 hover:border-blue-400/60'
          }`}
        >
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-blue-300 block mb-0.5 truncate">المهام الجارية</span>
            <div className="text-xl sm:text-2xl font-black text-blue-400 tabular-nums">
              {inProgressTasks.length} <span className="text-[11px] sm:text-xs font-normal text-slate-400">مهمة</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 block truncate">
              {statusFilter === 'in_progress' ? 'مفعّل — اضغط لإظهار الكل' : 'اضغط لعرضها فقط'}
            </span>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Play className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </button>

        {/* بطاقة المهام المتوقفة مؤقتاً */}
        <button
          type="button"
          onClick={() => toggleStatusFilter('paused')}
          className={`text-right bg-slate-900 rounded-2xl p-3.5 sm:p-4 shadow-lg flex items-center justify-between gap-2 transition-all cursor-pointer ${
            statusFilter === 'paused'
              ? 'border-2 border-yellow-400 ring-2 ring-yellow-500/30 shadow-yellow-950/30 bg-yellow-950/20'
              : 'border border-yellow-500/30 shadow-yellow-950/10 hover:border-yellow-400/60'
          }`}
        >
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-yellow-300 block mb-0.5 truncate">الموقوفة مؤقتاً</span>
            <div className="text-xl sm:text-2xl font-black text-yellow-400 tabular-nums">
              {pausedTasks.length} <span className="text-[11px] sm:text-xs font-normal text-slate-400">مهمة</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 block truncate">
              {statusFilter === 'paused' ? 'مفعّل — اضغط لإظهار الكل' : 'اضغط لعرضها فقط'}
            </span>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </button>

        {/* بطاقة المهام المعلقة من قبل الفني */}
        <button
          type="button"
          onClick={() => toggleStatusFilter('suspended')}
          className={`text-right bg-slate-900 rounded-2xl p-3.5 sm:p-4 shadow-lg flex items-center justify-between gap-2 transition-all cursor-pointer ${
            statusFilter === 'suspended'
              ? 'border-2 border-orange-400 ring-2 ring-orange-500/30 shadow-orange-950/30 bg-orange-950/20'
              : 'border border-orange-500/30 shadow-orange-950/10 hover:border-orange-400/60'
          }`}
        >
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-orange-300 block mb-0.5 truncate">المهام المعلقة</span>
            <div className="text-xl sm:text-2xl font-black text-orange-400 tabular-nums">
              {suspendedTasks.length} <span className="text-[11px] sm:text-xs font-normal text-slate-400">مهمة</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 block truncate">
              {statusFilter === 'suspended' ? 'مفعّل — اضغط لإظهار الكل' : 'اضغط لعرضها فقط'}
            </span>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0">
            <PauseCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </button>

        {/* بطاقة إنجاز اليوم */}
        <div className="col-span-2 sm:col-span-1 bg-slate-900 border border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 shadow-lg shadow-emerald-950/10 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-300 block mb-0.5 truncate">إنجاز اليوم</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums">
              {todayCompletedCount} <span className="text-[11px] sm:text-xs font-normal text-slate-400">منجزة</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 block truncate">تم إتمامها اليوم</span>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
            <span className="text-xs text-slate-400 shrink-0">نوع المهمة:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none flex-1 sm:flex-initial"
            >
              <option value="all">كافة الأنواع</option>
              <option value="صيانة">صيانة</option>
              <option value="تنصيب">تنصيب</option>
              <option value="ضعف">ضعف</option>
              <option value="مشاكل اخرى">مشاكل اخرى</option>
            </select>
          </div>
        </div>

        {/* شريط فرز المهام حسب الحالة */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold ml-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>فرز حسب الحالة:</span>
          </div>

          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-slate-100 text-slate-950 border-white shadow-sm'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
            }`}
          >
            <span>جميع المهام</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${
              statusFilter === 'all' ? 'bg-slate-900/15 text-slate-900' : 'bg-slate-800 text-slate-400'
            }`}>
              {filteredInProgress.length + filteredSuspended.length + filteredPaused.length + filteredPending.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              statusFilter === 'in_progress'
                ? 'bg-blue-600 text-white border-blue-400 shadow-sm shadow-blue-950/40'
                : 'bg-slate-950 text-blue-300 border-blue-500/25 hover:border-blue-400/50'
            }`}
          >
            <Play className="w-3 h-3" />
            <span>المهام الجارية</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${
              statusFilter === 'in_progress' ? 'bg-blue-700 text-white' : 'bg-blue-500/15 text-blue-300'
            }`}>
              {filteredInProgress.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('suspended')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              statusFilter === 'suspended'
                ? 'bg-orange-600 text-white border-orange-400 shadow-sm shadow-orange-950/40'
                : 'bg-slate-950 text-orange-300 border-orange-500/25 hover:border-orange-400/50'
            }`}
          >
            <PauseCircle className="w-3 h-3" />
            <span>المهام المعلقة</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${
              statusFilter === 'suspended' ? 'bg-orange-700 text-white' : 'bg-orange-500/15 text-orange-300'
            }`}>
              {filteredSuspended.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('paused')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              statusFilter === 'paused'
                ? 'bg-yellow-600 text-white border-yellow-400 shadow-sm shadow-yellow-950/40'
                : 'bg-slate-950 text-yellow-300 border-yellow-500/25 hover:border-yellow-400/50'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>الموقوفة مؤقتاً</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${
              statusFilter === 'paused' ? 'bg-yellow-700 text-white' : 'bg-yellow-500/15 text-yellow-300'
            }`}>
              {filteredPaused.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-950/40'
                : 'bg-slate-950 text-amber-300 border-amber-500/25 hover:border-amber-400/50'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>بانتظار القبول</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${
              statusFilter === 'pending' ? 'bg-amber-700 text-white' : 'bg-amber-500/15 text-amber-300'
            }`}>
              {filteredPending.length}
            </span>
          </button>

          {statusFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className="mr-auto text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>إلغاء الفرز</span>
            </button>
          )}
        </div>
      </div>

      {/* Section 1: المهام الجارية (In Progress) */}
      {(statusFilter === 'all' || statusFilter === 'in_progress') && (
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
      )}

      {/* Section 1.5: المهام المعلقة من قبل الفني (Suspended / On Hold) */}
      {(statusFilter === 'suspended' || (statusFilter === 'all' && filteredSuspended.length > 0)) && (
        <div className={`space-y-3 ${statusFilter === 'all' ? 'pt-4' : ''}`}>
          <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
            <PauseCircle className="w-4 h-4" />
            <span>المهام المعلقة من قبل الفني ({filteredSuspended.length})</span>
          </div>

          {filteredSuspended.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
              لا توجد مهام معلقة حالياً.
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSuspended.map((task) => (
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

                  {task.suspendReason && (
                    <div className="mt-2.5 p-2.5 bg-orange-950/40 border border-orange-500/30 rounded-xl text-xs text-orange-200">
                      <span className="text-orange-400 font-semibold block mb-0.5">سبب تعليق المهمة:</span>
                      {task.suspendReason}
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
                      <span className="text-orange-300 font-medium">{formatArabicDateTime(task.suspendedAt ?? null)}</span>
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
          )}
        </div>
      )}

      {/* Section 1.6: المهام المتوقفة مؤقتاً (Paused) */}
      {(statusFilter === 'paused' || (statusFilter === 'all' && filteredPaused.length > 0)) && (
        <div className={`space-y-3 ${statusFilter === 'all' ? 'pt-4' : ''}`}>
          <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
            <Clock className="w-4 h-4" />
            <span>المهام المتوقفة مؤقتاً ({filteredPaused.length})</span>
          </div>

          {filteredPaused.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
              لا توجد مهام موقوفة مؤقتاً حالياً.
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPaused.map((task) => (
              <div
                key={task.id}
                className="bg-slate-900 border border-yellow-500/40 rounded-2xl p-4 sm:p-5 shadow-lg shadow-yellow-950/15 flex flex-col justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-yellow-400" dir="ltr">
                        {task.taskNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getTaskTypeBadge(task.taskType)}`}>
                        نوع المهمة: {task.taskType}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0">
                      <Clock className="w-3.5 h-3.5 text-yellow-400" />
                      <span>متوقفة مؤقتاً</span>
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
                    <div className="mt-2.5 p-2.5 bg-yellow-950/40 border border-yellow-500/30 rounded-xl text-xs text-yellow-200">
                      <span className="text-yellow-400 font-semibold block mb-0.5">سبب الإيقاف المؤقت:</span>
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
                      <span className="text-slate-500 block">وقت الإيقاف:</span>
                      <span className="text-yellow-300 font-medium">{formatArabicDateTime(task.pausedAt ?? null)}</span>
                    </div>
                    <div className="xs:col-span-2 sm:col-span-1">
                      <span className="text-slate-500 block">الوقت المنقضي المحفوظ:</span>
                      <span className="text-yellow-400 font-mono font-bold" dir="ltr">
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
                      title="إعادة إرسال المهمة المتوقفة للفني أو للكل"
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
          )}
        </div>
      )}

      {/* Section 2: المهام المعلقة بانتظار القبول (Pending) */}
      {(statusFilter === 'all' || statusFilter === 'pending') && (
      <div className={`space-y-3 ${statusFilter === 'all' ? 'pt-4' : ''}`}>
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
          <Clock className="w-4 h-4" />
          <span>المهام بانتظار قبول الفني ({filteredPending.length})</span>
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
      )}

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
