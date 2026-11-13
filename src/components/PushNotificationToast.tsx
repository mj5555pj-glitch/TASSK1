import React from 'react';
import { MaintenanceTask } from '../types';
import { Bell, Play, X, Lock } from 'lucide-react';

interface Props {
  task: MaintenanceTask;
  onAccept: (taskId: string) => void;
  onDismiss: () => void;
}

export const PushNotificationToast: React.FC<Props> = ({
  task,
  onAccept,
  onDismiss,
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

        {/* Hidden Details Notice until Accepted */}
        <div className="mt-3 p-3 rounded-xl bg-slate-950/90 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div className="leading-relaxed">
            <span className="font-bold block text-amber-300">تفاصيل المشترك مخفية قبل القبول</span>
            <span className="text-[11px] text-slate-400">
              اضغط على زر قبول المهمة لإظهار اسم المشترك والهاتف والملاحظات فوراً.
            </span>
          </div>
        </div>

        {/* Interactive Quick Action */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onAccept(task.id);
              onDismiss();
            }}
            className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>قبول المهمة والبدء وإظهار التفاصيل</span>
          </button>
        </div>
      </div>
    </div>
  );
};
