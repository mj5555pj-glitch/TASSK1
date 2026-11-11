import React from 'react';
import { MaintenanceTask } from '../types';
import { formatArabicDateTime, getElapsedMinutes } from '../utils/time';
import { getTelUrl } from '../utils/whatsapp';
import { 
  AlertTriangle, 
  Clock, 
  Phone, 
  MessageSquare, 
  Radio, 
  X, 
  ChevronRight,
  Send,
  Users
} from 'lucide-react';

interface Props {
  overdueTasks: MaintenanceTask[];
  onReassignToAll: (taskId: string) => Promise<void>;
  onOpenWhatsApp: (task: MaintenanceTask) => void;
  onDismiss: () => void;
}

export const ManagerOverdueModal: React.FC<Props> = ({
  overdueTasks,
  onReassignToAll,
  onOpenWhatsApp,
  onDismiss,
}) => {
  if (overdueTasks.length === 0) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 p-4 pointer-events-none flex justify-center" dir="rtl">
      <div className="w-full max-w-4xl bg-slate-900/95 border-2 border-rose-500/70 rounded-2xl shadow-2xl shadow-rose-950/60 backdrop-blur-md pointer-events-auto overflow-hidden animate-in slide-in-from-top-4 duration-300">
        {/* Header with pulsating alert warning */}
        <div className="bg-gradient-to-r from-rose-950/90 via-rose-900/70 to-slate-900 p-4 border-b border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0 animate-pulse">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-rose-200">
                  تنبيه عاجل للمدير: طلبات لم تُقبل منذ 15 دقيقة!
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse">
                  {overdueTasks.length} {overdueTasks.length === 1 ? 'مهمة متأخرة' : 'مهام متأخرة'}
                </span>
              </div>
              <p className="text-xs text-rose-300/80 mt-0.5">
                مضى أكثر من 15 دقيقة على إرسال المهام التالية دون أن يقوم أي فني بقبولها للبدء بالصيانة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="إخفاء التنبيه مؤقتاً"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Cards List */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
          {overdueTasks.map((task) => {
            const elapsedMins = getElapsedMinutes(task.createdAt);

            return (
              <div
                key={task.id}
                className="bg-slate-950 border border-rose-500/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-rose-500/70 transition-colors"
              >
                {/* Details */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-300" dir="ltr">
                      {task.taskNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      نوع المهمة: {task.taskType}
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>مضى {elapsedMins} دقيقة دون قبول!</span>
                    </span>
                  </div>

                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>المشترك: {task.subscriberName}</span>
                    <span className="text-xs font-mono text-slate-400" dir="ltr">({task.phone})</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>وقت الإرسال: <strong className="text-slate-300">{formatArabicDateTime(task.createdAt)}</strong></span>
                    <span>التوجيه الحالي: <strong className="text-emerald-400">{task.assignedToName}</strong></span>
                  </div>

                  {task.notes && (
                    <p className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      {task.notes}
                    </p>
                  )}
                </div>

                {/* Instant Actions for Manager */}
                <div className="flex flex-wrap md:flex-nowrap items-center gap-2 shrink-0 w-full md:w-auto">
                  {/* Reassign to all technicians immediately */}
                  {task.assignedToId !== 'all' && (
                    <button
                      type="button"
                      onClick={() => onReassignToAll(task.id)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all"
                      title="إعادة توجيه المهمة وإرسالها لكافة الفنيين فوراً"
                    >
                      <Users className="w-4 h-4" />
                      <span>📢 إرسال للكل فوراً</span>
                    </button>
                  )}

                  {/* Direct Phone Call */}
                  <a
                    href={getTelUrl(task.phone)}
                    className="p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl border border-blue-500/30 transition-colors flex items-center justify-center"
                    title="اتصال هاتفي بالمشترك"
                  >
                    <Phone className="w-4 h-4" />
                  </a>

                  {/* WhatsApp Message */}
                  <button
                    type="button"
                    onClick={() => onOpenWhatsApp(task)}
                    className="p-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl border border-emerald-500/30 transition-colors flex items-center justify-center"
                    title="مراسلة عبر واتساب"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info banner */}
        <div className="bg-slate-950 p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>يتم فحص المهام غير المقبولة تلقائياً كل دقيقة وتنبيه الإدارة صوتياً ورقمياً</span>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
          >
            إغلاق التنبيه
          </button>
        </div>
      </div>
    </div>
  );
};
