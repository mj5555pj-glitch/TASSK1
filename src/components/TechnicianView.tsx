import React, { useState, useEffect } from 'react';
import { User, MaintenanceTask } from '../types';
import { 
  formatArabicDateTime, 
  formatDigitalTimer, 
  getRetentionCountdown 
} from '../utils/time';
import { getTelUrl } from '../utils/whatsapp';
import { WhatsAppPreviewModal } from './WhatsAppPreviewModal';
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
  Radio
} from 'lucide-react';

interface Props {
  technician: User;
  tasks: MaintenanceTask[];
  onAcceptTask: (taskId: string) => Promise<void>;
  onCompleteTask: (task: MaintenanceTask, notes?: string) => Promise<void>;
}

export const TechnicianView: React.FC<Props> = ({
  technician,
  tasks,
  onAcceptTask,
  onCompleteTask,
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'completed' | 'all'>('pending');
  const [selectedTaskForWhatsApp, setSelectedTaskForWhatsApp] = useState<MaintenanceTask | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [actionLoading, setActionLoading] = useState(false);

  // Live stopwatch update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter tasks assigned to this technician or open tasks
  const myTasks = tasks.filter(
    (t) => t.assignedToId === technician.id || t.assignedToId === 'all' || !t.assignedToId
  );

  const pendingTasks = myTasks.filter((t) => t.status === 'pending' || (!t.acceptedAt && !t.completedAt));
  const inProgressTasks = myTasks.filter((t) => t.status === 'in_progress' || (t.acceptedAt && !t.completedAt));
  const completedTasks = myTasks.filter((t) => t.status === 'completed' || !!t.completedAt);

  const displayedTasks = (() => {
    switch (activeTab) {
      case 'pending':
        return pendingTasks;
      case 'in_progress':
        return inProgressTasks;
      case 'completed':
        return completedTasks;
      case 'all':
      default:
        return myTasks;
    }
  })();

  const handleStartComplete = (taskId: string) => {
    setCompletingTaskId(taskId);
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

  const handleAccept = async (taskId: string) => {
    try {
      setActionLoading(true);
      await onAcceptTask(taskId);
    } finally {
      setActionLoading(false);
    }
  };

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
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl shadow-inner">
              {technician.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  أهلاً بك، الفني {technician.fullName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>فني صيانة معتمد</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <span>{technician.specialty || 'صيانة شبكات الإنترنت'}</span>
                <span>·</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>قاعدة بيانات فايبر بيس متصلة</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Counter Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-right">
              <div className="text-[11px] text-amber-300 font-medium">بانتظار القبول</div>
              <div className="text-lg font-black text-amber-400 tabular-nums">{pendingTasks.length} طلب</div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-right">
              <div className="text-[11px] text-blue-300 font-medium">قيد التنفيذ</div>
              <div className="text-lg font-black text-blue-400 tabular-nums">{inProgressTasks.length} مهمة</div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-right">
              <div className="text-[11px] text-emerald-300 font-medium">المهام المنجزة</div>
              <div className="text-lg font-black text-emerald-400 tabular-nums">{completedTasks.length} مهمة</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>بطاقة انتظار الطلبات (المعلقة)</span>
          {pendingTasks.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] tabular-nums font-black ${
              activeTab === 'pending' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {pendingTasks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('in_progress')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'in_progress'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>المهام الجارية بالموقع</span>
          {inProgressTasks.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] tabular-nums font-black ${
              activeTab === 'in_progress' ? 'bg-white text-blue-600' : 'bg-blue-500/20 text-blue-300'
            }`}>
              {inProgressTasks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'completed'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>المهام المنجزة</span>
          <span className="text-[11px] tabular-nums opacity-70">({completedTasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-slate-700 text-white'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <span>كافة مهامي ({myTasks.length})</span>
        </button>
      </div>

      {/* Task Cards Grid */}
      {displayedTasks.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-200">
            {activeTab === 'pending'
              ? 'لا توجد طلبات صيانة بانتظار القبول حالياً'
              : activeTab === 'in_progress'
              ? 'لا توجد مهام جارية حالياً'
              : 'لا توجد مهام في هذا القسم'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            عندما يقوم المدير بإرسال مهمة جديدة ستظهر في بطاقة انتظار الطلبات مباشرة عبر فايبر بيس.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedTasks.map((task) => {
            const isPending = task.status === 'pending' || (!task.acceptedAt && !task.completedAt);
            const isInProgress = task.status === 'in_progress' || (task.acceptedAt && !task.completedAt);
            const isCompleted = task.status === 'completed' || !!task.completedAt;

            const liveSeconds = isInProgress && task.acceptedAt
              ? Math.max(0, Math.floor((currentTime - new Date(task.acceptedAt).getTime()) / 1000))
              : 0;

            const retentionNotice = getRetentionCountdown(task.createdAt);

            return (
              <div
                key={task.id}
                className={`rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                  isPending
                    ? 'bg-slate-900/95 border-amber-500/40 shadow-lg shadow-amber-950/15'
                    : isInProgress
                    ? 'bg-slate-900/95 border-blue-500/40 shadow-lg shadow-blue-950/15'
                    : 'bg-slate-900/70 border-slate-800 opacity-90'
                }`}
              >
                <div>
                  {/* Card Header: Task # & Status */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400" dir="ltr">
                        {task.taskNumber}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs text-slate-400">
                        مرسلة من: {task.createdBy}
                      </span>
                    </div>

                    {isPending && (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        بانتظار القبول
                      </span>
                    )}
                    {isInProgress && (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        <span>قيد التنفيذ بالموقع</span>
                      </span>
                    )}
                    {isCompleted && (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>مكتملة</span>
                      </span>
                    )}
                  </div>

                  {/* نوع المهمة (صيانة / تنصيب / ضعف / مشاكل اخرى) */}
                  <div className="mt-3.5">
                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border ${getTaskTypeBadge(task.taskType)}`}>
                      نوع المهمة: {task.taskType}
                    </span>
                  </div>

                  {/* اسم المشترك ورقم الهاتف مع أيقونة الاتصال وأيقونة الواتساب */}
                  <div className="mt-2.5 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>اسم المشترك:</span>
                      </span>
                      <span className="text-sm font-bold text-white">
                        {task.subscriberName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>رقم الهاتف:</span>
                      </span>

                      {/* مقابل رقم الهاتف: أيقونة الاتصال وأيقونة الواتساب */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-slate-200" dir="ltr">
                          {task.phone}
                        </span>

                        {/* أيقونة الاتصال */}
                        <a
                          href={getTelUrl(task.phone)}
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition-all"
                          title={`اتصال هاتفي مباشر بالرقم ${task.phone}`}
                        >
                          <Phone className="w-4 h-4" />
                        </a>

                        {/* أيقونة الواتساب (تحويل مباشر مع رسالة جاهزة باسم الفني والمشترك) */}
                        <button
                          type="button"
                          onClick={() => setSelectedTaskForWhatsApp(task)}
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition-all shadow-sm"
                          title="إرسال رسالة واتساب جاهزة باسمك واسم المشترك"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ملاحظات فقط */}
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-1">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>ملاحظات المهمة:</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {task.notes && task.notes.trim().length > 0 ? task.notes : 'لا توجد ملاحظات إضافية'}
                    </p>
                  </div>

                  {/* ملاحظات الإنجاز إن وجدت */}
                  {task.completionNotes && (
                    <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs">
                      <span className="font-semibold text-emerald-400 block mb-0.5">ملاحظات الإنجاز:</span>
                      <span className="text-slate-300">{task.completionNotes}</span>
                    </div>
                  )}

                  {/* توثيق الأوقات: وقت الإرسال، وقت القبول، وقت الانتهاء، والوقت المستغرق */}
                  <div className="mt-3.5 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">وقت الإرسال:</span>
                      <span className="text-slate-300 font-medium">{formatArabicDateTime(task.createdAt)}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">وقت القبول:</span>
                      <span className="text-slate-300 font-medium">
                        {task.acceptedAt ? formatArabicDateTime(task.acceptedAt) : 'بانتظار القبول'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">وقت الانتهاء:</span>
                      <span className="text-slate-300 font-medium">
                        {task.completedAt ? formatArabicDateTime(task.completedAt) : 'قيد الانتظار'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">الوقت المستغرق بالمهمة:</span>
                      {isCompleted ? (
                        <span className="text-emerald-400 font-bold">{task.durationFormatted || '—'}</span>
                      ) : isInProgress ? (
                        <span className="text-blue-400 font-mono font-bold" dir="ltr">
                          ⏱ {formatDigitalTimer(liveSeconds)}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </div>
                  </div>

                  {/* حفظ السجل لمدة أسبوع */}
                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/40">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>الحفظ الأسبوعي:</span>
                    </div>
                    <span className="text-slate-400 font-medium">{retentionNotice}</span>
                  </div>
                </div>

                {/* الأزرار التفاعلية للفني */}
                <div className="mt-4 pt-3 border-t border-slate-800">
                  {isPending && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleAccept(task.id)}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/30 disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      <span>قبول المهمة والبدء الآن</span>
                    </button>
                  )}

                  {isInProgress && (
                    <>
                      {completingTaskId === task.id ? (
                        <div className="space-y-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                          <label className="block text-xs font-semibold text-slate-300">
                            ملاحظة إنجاز الصيانة (اختياري):
                          </label>
                          <textarea
                            value={completionNotes}
                            onChange={(e) => setCompletionNotes(e.target.value)}
                            rows={2}
                            placeholder="مثال: تم فحص الإشارة وضبط الراوتر والتأكد من السرعة..."
                            className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleConfirmComplete(task)}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>تأكيد إنهاء المهمة وتوثيق الوقت</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setCompletingTaskId(null)}
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleStartComplete(task.id)}
                          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-950/30 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>إتمام المهمة وتسجيل وقت الانتهاء</span>
                        </button>
                      )}
                    </>
                  )}

                  {isCompleted && (
                    <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تمت المهمة وتوثيق الوقت</span>
                      </span>
                      <span className="text-slate-300 text-[11px] font-normal">
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
          onClose={() => setSelectedTaskForWhatsApp(null)}
        />
      )}
    </div>
  );
};
