import React, { useState } from 'react';
import { MaintenanceTask } from '../types';
import { formatArabicDateTime, getRetentionCountdown } from '../utils/time';
import { getTelUrl } from '../utils/whatsapp';
import { WhatsAppPreviewModal } from './WhatsAppPreviewModal';
import { 
  CheckCircle2, 
  Calendar, 
  Trash2, 
  Download, 
  Search, 
  Phone, 
  MessageSquare, 
  Clock 
} from 'lucide-react';

interface Props {
  tasks: MaintenanceTask[];
  onDeleteTask: (taskId: string) => Promise<void>;
  onPurgeExpired: () => Promise<number>;
}

export const ArchivePage: React.FC<Props> = ({
  tasks,
  onDeleteTask,
  onPurgeExpired,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWhatsAppTask, setSelectedWhatsAppTask] = useState<MaintenanceTask | null>(null);
  const [isPurging, setIsPurging] = useState(false);

  const completedTasks = tasks.filter((t) => t.status === 'completed' || !!t.completedAt);

  const filteredTasks = completedTasks.filter((t) => {
    return (
      t.subscriberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone.includes(searchQuery) ||
      t.taskNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.taskType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignedToName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handlePurge = async () => {
    try {
      setIsPurging(true);
      const count = await onPurgeExpired();
      if (count > 0) {
        alert(`تم حذف ${count} مهمة منتهية تجاوزت مدة الحفظ (7 أيام).`);
      } else {
        alert('كافة المهام المسجلة حالياً ضمن فترة الأسبوع المسموح بها.');
      }
    } finally {
      setIsPurging(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['رقم المهمة', 'نوع المهمة', 'المشترك', 'الهاتف', 'الفني', 'وقت الإرسال', 'وقت القبول', 'وقت الانتهاء', 'الوقت المستغرق', 'ملاحظات'];
    const rows = filteredTasks.map((t) => [
      t.taskNumber,
      `"${t.taskType}"`,
      `"${t.subscriberName}"`,
      `"${t.phone}"`,
      `"${t.assignedToName}"`,
      `"${t.createdAt}"`,
      `"${t.acceptedAt || ''}"`,
      `"${t.completedAt || ''}"`,
      `"${t.durationFormatted || ''}"`,
      `"${t.notes}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `أرشيف_مهام_الصيانة_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold text-white">سجل وأرشيف المهام المكتملة</h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{completedTasks.length} مهمة منجزة</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            سجل المهام المنفذة مع توثيق الأوقات المستغرقة وسياسة الحفظ الأسبوعية
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            onClick={handlePurge}
            disabled={isPurging}
            className="flex-1 sm:flex-none px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            title="فحص وحذف المهام الأقدم من 7 أيام"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
            <span className="truncate">{isPurging ? 'جاري الفحص...' : 'فحص سجلات 7 أيام'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {/* Retention Policy Banner */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>
            <strong>سياسة الحفظ الأسبوعية:</strong> يتم الاحتفاظ بكافة سجلات المهام لمدة <strong>أسبوع كامل (7 أيام)</strong> ثم يتم حذفها تلقائياً من فايبر بيس.
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث في الأرشيف باسم المشترك، الهاتف، رقم المهمة، أو الفني..."
          className="w-full pr-9 pl-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Tasks Table / Cards */}
      {filteredTasks.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
          لا توجد مهام مكتملة مطابقة للبحث حالياً.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-blue-400" dir="ltr">
                    {task.taskNumber}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-800 text-white">
                    نوع المهمة: {task.taskType}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs text-emerald-300">
                    الفني: {task.assignedToName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>مكتملة</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`حذف المهمة (${task.taskNumber})؟`)) {
                        onDeleteTask(task.id);
                      }
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400"
                    title="حذف من السجل"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Subscriber details & WhatsApp / Phone */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">اسم المشترك:</span>
                  <span className="text-white font-bold">{task.subscriberName}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">رقم الهاتف:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-200" dir="ltr">{task.phone}</span>
                    <a
                      href={getTelUrl(task.phone)}
                      className="p-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-md transition-colors"
                      title="اتصال هاتفي"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setSelectedWhatsAppTask(task)}
                      className="p-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-md transition-colors"
                      title="رسالة واتساب مسبقة الصياغة"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {task.notes && (
                <div className="mt-2.5 p-2 bg-slate-800/40 rounded-xl text-xs text-slate-300">
                  <span className="text-slate-400 font-semibold block mb-0.5">ملاحظات البلاغ:</span>
                  {task.notes}
                </div>
              )}

              {task.completionNotes && (
                <div className="mt-2 p-2 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-xs text-slate-300">
                  <span className="text-emerald-400 font-semibold block mb-0.5">ملاحظات الإنجاز من الفني:</span>
                  {task.completionNotes}
                </div>
              )}

              {/* Timestamps */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">وقت الإرسال:</span>
                  <span className="text-slate-300">{formatArabicDateTime(task.createdAt)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">وقت القبول:</span>
                  <span className="text-slate-300">{formatArabicDateTime(task.acceptedAt)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">وقت الانتهاء:</span>
                  <span className="text-slate-300">{formatArabicDateTime(task.completedAt)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">الوقت المستغرق:</span>
                  <span className="text-emerald-400 font-bold">{task.durationFormatted || '—'}</span>
                </div>
              </div>

              {/* Retention Countdown */}
              <div className="mt-2.5 text-[10px] text-slate-500 flex items-center justify-between">
                <span>صلاحية السجل: {getRetentionCountdown(task.createdAt)}</span>
                <span>محفوظ في فايبر بيس</span>
              </div>
            </div>
          ))}
        </div>
      )}

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
