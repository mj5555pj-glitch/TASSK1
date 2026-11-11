import React from 'react';
import { MaintenanceTask } from '../types';
import { Bell, Play, MessageSquare, X, Phone, User as UserIcon } from 'lucide-react';
import { getTelUrl, getWhatsAppUrl } from '../utils/whatsapp';

interface Props {
  task: MaintenanceTask;
  technicianName: string;
  onAccept: (taskId: string) => void;
  onDismiss: () => void;
  onOpenWhatsApp: (task: MaintenanceTask) => void;
}

export const PushNotificationToast: React.FC<Props> = ({
  task,
  technicianName,
  onAccept,
  onDismiss,
  onOpenWhatsApp,
}) => {
  return (
    <div 
      className="fixed top-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-[420px] z-50 animate-in slide-in-from-top-6 fade-in duration-300"
      dir="rtl"
    >
      <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl shadow-2xl shadow-emerald-950/40 p-4 text-slate-100 backdrop-blur-md relative overflow-hidden">
        {/* Glow effect bar */}
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 animate-pulse" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  إشعار فوري: مهمة صيانة جديدة!
                </span>
                <span className="font-mono text-[11px] text-slate-400" dir="ltr">
                  {task.taskNumber}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5">
                نوع المهمة: <span className="text-emerald-300">{task.taskType}</span>
              </h4>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Details Info */}
        <div className="mt-3 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <UserIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>المشترك:</span>
            </span>
            <span className="font-bold text-white">{task.subscriberName}</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>الهاتف:</span>
            </span>
            <span className="font-mono font-semibold text-slate-200" dir="ltr">{task.phone}</span>
          </div>

          {task.notes && (
            <div className="pt-1 border-t border-slate-800/80 text-[11px] text-slate-300">
              <span className="text-slate-400 font-medium">ملاحظات: </span>
              <span>{task.notes}</span>
            </div>
          )}
        </div>

        {/* Interactive Quick Actions */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onAccept(task.id);
              onDismiss();
            }}
            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>قبول المهمة والبدء</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenWhatsApp(task)}
            className="p-2 bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl border border-slate-700 hover:border-emerald-500 transition-colors"
            title="فتح رسالة الواتساب الجاهزة"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <a
            href={getTelUrl(task.phone)}
            className="p-2 bg-slate-800 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl border border-slate-700 hover:border-blue-500 transition-colors"
            title="اتصال هاتفي مباشر"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
