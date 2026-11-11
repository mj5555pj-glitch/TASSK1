import React, { useState, useEffect } from 'react';
import { MaintenanceTask } from '../types';
import { 
  formatArabicDateTime, 
  formatDigitalTimer, 
  getRetentionCountdown, 
  isTaskUnacceptedOverdue, 
  getElapsedMinutes 
} from '../utils/time';
import { getTelUrl } from '../utils/whatsapp';
import { WhatsAppPreviewModal } from './WhatsAppPreviewModal';
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
  Users
} from 'lucide-react';

interface Props {
  tasks: MaintenanceTask[];
  onDeleteTask: (taskId: string) => Promise<void>;
  onCompleteTask?: (task: MaintenanceTask, notes?: string) => Promise<void>;
  onReassignToAll?: (taskId: string) => Promise<void>;
}

export const MonitoringPage: React.FC<Props> = ({
  tasks,
  onDeleteTask,
  onCompleteTask,
  onReassignToAll,
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedWhatsAppTask, setSelectedWhatsAppTask] = useState<MaintenanceTask | null>(null);

  // Live timer update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pendingTasks = tasks.filter((t) => t.status === 'pending' || (!t.acceptedAt && !t.completedAt));
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress' || (t.acceptedAt && !t.completedAt));

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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white">صفحة متابعة المهام الجارية والمعلقة</h1>
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
        <div className="bg-rose-950/40 border-2 border-rose-500/60 rounded-2xl p-4 sm:p-5 shadow-xl shadow-rose-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
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

      {/* بطاقات الإحصائيات المطلوبة: عدد الطلبات المعلقة، الطلبات الجارية، إنجاز اليوم */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* بطاقة الطلبات المعلقة */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-lg shadow-amber-950/10 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-300 block mb-1">عدد الطلبات المعلقة</span>
            <div className="text-3xl font-black text-amber-400 tabular-nums">
              {pendingTasks.length} <span className="text-xs font-normal text-slate-400">طلب</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">بانتظار قبول الفني للبدء</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* بطاقة الطلبات الجارية */}
        <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-5 shadow-lg shadow-blue-950/10 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-300 block mb-1">الطلبات الجارية</span>
            <div className="text-3xl font-black text-blue-400 tabular-nums">
              {inProgressTasks.length} <span className="text-xs font-normal text-slate-400">مهمة</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">قيد التنفيذ والمباشرة بالموقع</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Play className="w-6 h-6" />
          </div>
        </div>

        {/* بطاقة إنجاز اليوم */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-lg shadow-emerald-950/10 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-300 block mb-1">إنجاز اليوم</span>
            <div className="text-3xl font-black text-emerald-400 tabular-nums">
              {todayCompletedCount} <span className="text-xs font-normal text-slate-400">مهمة منجزة</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">تم إتمامها وتوثيق وقتها اليوم</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
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
              const liveSecs = task.acceptedAt
                ? Math.max(0, Math.floor((currentTime - new Date(task.acceptedAt).getTime()) / 1000))
                : 0;

              return (
                <div
                  key={task.id}
                  className="bg-slate-900 border border-blue-500/40 rounded-2xl p-5 shadow-lg shadow-blue-950/15 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Task #, Type, Tech */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-400" dir="ltr">
                          {task.taskNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getTaskTypeBadge(task.taskType)}`}>
                          نوع المهمة: {task.taskType}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-lg text-xs font-bold">
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

                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/80">
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
                            title="إرسال رسالة واتساب جاهزة باسم الفني والمشترك"
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

                    {/* Timestamps & Live Duration */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">وقت الإرسال:</span>
                        <span className="text-slate-300 font-medium">{formatArabicDateTime(task.createdAt)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">وقت القبول:</span>
                        <span className="text-slate-300 font-medium">{formatArabicDateTime(task.acceptedAt)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">الوقت المستغرق حتى الآن:</span>
                        <span className="text-blue-400 font-mono font-bold" dir="ltr">
                          ⏱ {formatDigitalTimer(liveSecs)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {getRetentionCountdown(task.createdAt)}
                    </span>
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
              );
            })}
          </div>
        )}
      </div>

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
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-300" dir="ltr">
                          {task.taskNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getTaskTypeBadge(task.taskType)}`}>
                          نوع المهمة: {task.taskType}
                        </span>
                      </div>

                      {isOverdue ? (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-lg text-xs font-bold animate-pulse flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>متأخرة ({elapsedMins} دقيقة دون قبول)</span>
                        </span>
                      ) : (
                        <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-lg text-xs font-bold">
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

                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/80">
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
                            title="إرسال رسالة واتساب جاهزة باسم الفني والمشترك"
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
                    <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
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
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {getRetentionCountdown(task.createdAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      {isOverdue && task.assignedToId !== 'all' && onReassignToAll && (
                        <button
                          type="button"
                          onClick={() => onReassignToAll(task.id)}
                          className="text-xs bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                          title="إعادة توجيه المهمة وإرسالها لكافة الفنيين المتاحين فوراً"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>📢 تحويل للكل</span>
                        </button>
                      )}
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
                        <span>حذف المهمة</span>
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
          onClose={() => setSelectedWhatsAppTask(null)}
        />
      )}
    </div>
  );
};
