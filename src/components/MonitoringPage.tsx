import React, { useState, useEffect } from 'react';
import { MaintenanceTask } from '../types';
import { formatArabicDateTime, formatDigitalTimer, getRetentionCountdown } from '../utils/time';
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
  Radio
} from 'lucide-react';

interface Props {
  tasks: MaintenanceTask[];
  onDeleteTask: (taskId: string) => Promise<void>;
  onCompleteTask?: (task: MaintenanceTask, notes?: string) => Promise<void>;
}

export const MonitoringPage: React.FC<Props> = ({
  tasks,
  onDeleteTask,
  onCompleteTask,
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
            متابعة فورية للمهام قيد الانتظار والمهام الجاري العمل عليها مع توثيق الأوقات الحية
          </p>
        </div>

        {/* Counts summary */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-right">
            <span className="text-[11px] text-amber-300 block font-medium">المهام المعلقة</span>
            <span className="text-lg font-bold text-amber-400 tabular-nums">{pendingTasks.length} مهمة</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-right">
            <span className="text-[11px] text-blue-300 block font-medium">المهام الجارية</span>
            <span className="text-lg font-bold text-blue-400 tabular-nums">{inProgressTasks.length} جارية</span>
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
            {filteredPending.map((task) => (
              <div
                key={task.id}
                className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-lg shadow-amber-950/10 flex flex-col justify-between"
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

                    <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-lg text-xs font-bold">
                      بانتظار قبول الفني
                    </span>
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
                      <span className="text-amber-400 font-medium">بانتظار موافقة الفني للبدء</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {getRetentionCountdown(task.createdAt)}
                  </span>
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
            ))}
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
