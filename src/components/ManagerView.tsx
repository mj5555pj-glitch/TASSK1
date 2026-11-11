import React, { useState } from 'react';
import { User, MaintenanceTask } from '../types';
import { 
  formatArabicDateTime, 
  getRetentionCountdown, 
  isTaskOlderThanOneWeek 
} from '../utils/time';
import { getTelUrl, getWhatsAppUrl } from '../utils/whatsapp';
import { WhatsAppPreviewModal } from './WhatsAppPreviewModal';
import { 
  Send, 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Play, 
  Phone, 
  MessageSquare, 
  FileText, 
  Users, 
  Calendar, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Download
} from 'lucide-react';

interface Props {
  manager: User;
  technicians: User[];
  tasks: MaintenanceTask[];
  onAddTask: (data: {
    taskType: string;
    subscriberName: string;
    phone: string;
    notes: string;
    assignedToId: string;
    assignedToName: string;
  }) => void;
  onDeleteTask: (taskId: string) => void;
  onPurgeExpired: () => number;
  onResetDemoData: () => void;
}

// Common ISP task types for quick 1-click selection
const POPULAR_TASK_TYPES = [
  'انقطاع كابل ألياف ضوئية / فايبر',
  'عطل بالراوتر / إعدادات PPPoE',
  'صيانة إشارة نانوستيشن / أنتينا',
  'ضعف سرعة وبطء التصفح',
  'تركيب اشتراك جديد وتمديد',
  'تغيير مكان الراوتر / سلك داخلي',
];

export const ManagerView: React.FC<Props> = ({
  manager,
  technicians,
  tasks,
  onAddTask,
  onDeleteTask,
  onPurgeExpired,
  onResetDemoData,
}) => {
  // Dispatch Task Form State
  const [taskType, setTaskType] = useState(POPULAR_TASK_TYPES[0]);
  const [customTaskType, setCustomTaskType] = useState('');
  const [isCustomType, setIsCustomType] = useState(false);
  const [subscriberName, setSubscriberName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTechId, setSelectedTechId] = useState(technicians[0]?.id || '');
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [techFilter, setTechFilter] = useState<string>('all');
  const [previewWhatsAppTask, setPreviewWhatsAppTask] = useState<MaintenanceTask | null>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const finalType = isCustomType ? customTaskType.trim() : taskType.trim();

    if (!finalType) {
      setFormError('يرجى تحديد نوع المهمة');
      return;
    }
    if (!subscriberName.trim()) {
      setFormError('يرجى إدخال اسم المشترك');
      return;
    }
    if (!phone.trim()) {
      setFormError('يرجى إدخال رقم هاتف المشترك');
      return;
    }

    const assignedTech = technicians.find((t) => t.id === selectedTechId) || technicians[0];

    onAddTask({
      taskType: finalType,
      subscriberName: subscriberName.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      assignedToId: assignedTech.id,
      assignedToName: assignedTech.fullName,
    });

    // Reset form fields
    setSubscriberName('');
    setPhone('');
    setNotes('');
    if (isCustomType) setCustomTaskType('');
    setSuccessToast(`تم إرسال المهمة بنجاح إلى الفني (${assignedTech.fullName}) وتوثيق وقت الإرسال`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // KPI Metrics
  const totalTasks = tasks.length;
  const pendingCount = tasks.filter((t) => !t.acceptedAt && !t.completedAt).length;
  const inProgressCount = tasks.filter((t) => t.acceptedAt && !t.completedAt).length;
  const completedCount = tasks.filter((t) => t.completedAt).length;

  // Filtered tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesQuery =
      task.subscriberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.phone.includes(searchQuery) ||
      task.taskType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.taskNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && !task.acceptedAt && !task.completedAt) ||
      (statusFilter === 'in_progress' && task.acceptedAt && !task.completedAt) ||
      (statusFilter === 'completed' && !!task.completedAt);

    const matchesTech = techFilter === 'all' || task.assignedToId === techFilter;

    return matchesQuery && matchesStatus && matchesTech;
  });

  const handleManualPurge = () => {
    const count = onPurgeExpired();
    if (count > 0) {
      alert(`تم حذف ${count} مهمة تجاوزت مدة الحفظ (أسبوع كامل).`);
    } else {
      alert('لا توجد مهام حالية تجاوزت مدة الـ 7 أيام، كافة المهام الحالية ضمن فترة الأسبوع.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['رقم المهمة', 'نوع المهمة', 'المشترك', 'الهاتف', 'الفني', 'وقت الإرسال', 'وقت القبول', 'وقت الإنجاز', 'الوقت المستغرق', 'ملاحظات'];
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
    link.setAttribute('download', `تقرير_مهام_صيانة_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner & KPI metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">إجمالي المهام الحالية</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1 tabular-nums">{totalTasks}</div>
          <div className="text-[11px] text-slate-500 mt-1">سجل نشط (حفظ أسبوعي)</div>
        </div>

        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-300">بانتظار القبول</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1 tabular-nums">{pendingCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">بانتظار استجابة الفني</div>
        </div>

        <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-300">قيد التنفيذ بالموقع</span>
            <Play className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400 mt-1 tabular-nums">{inProgressCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">جاري العمل عليها حالياً</div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-300">المهام المنجزة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{completedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">موثقة مع المدة المستغرقة</div>
        </div>
      </div>

      {/* Main Grid: Left = Dispatch Form (بطاقة إرسال المهمة), Right = Monitoring Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* بطاقة إرسال المهمة (Dispatch Card) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl sticky top-20">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">بطاقة إرسال المهمة</h2>
                <p className="text-[11px] text-slate-400">توجيه فوري لفني الصيانة وتسجيل وقت الإرسال</p>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">
              تلقائي 7 أيام
            </span>
          </div>

          {successToast && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successToast}</span>
            </div>
          )}

          {formError && (
            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
            {/* نوع المهمة */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200">
                  نوع المهمة <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomType(!isCustomType)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 underline"
                >
                  {isCustomType ? 'اختيار من الأنواع الشائعة' : 'كتابة نوع مخصص'}
                </button>
              </div>

              {!isCustomType ? (
                <div className="space-y-2">
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {POPULAR_TASK_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>

                  {/* Quick Select buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {POPULAR_TASK_TYPES.slice(0, 4).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTaskType(type)}
                        className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                          taskType === type
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={customTaskType}
                  onChange={(e) => setCustomTaskType(e.target.value)}
                  placeholder="مثال: فحص جودة خط الألياف وتبديل المحول..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              )}
            </div>

            {/* اسم المشترك */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                اسم المشترك <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={subscriberName}
                onChange={(e) => setSubscriberName(e.target.value)}
                placeholder="مثال: محمد جاسم العبيدي"
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* رقم الهاتف */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                رقم الهاتف <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: 07701234567 أو 0780XXXXXXX"
                dir="ltr"
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 text-right focus:outline-none focus:border-blue-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                سيظهر للفني أيقونة اتصال مباشر وأيقونة واتساب لإرسال رسالة جاهزة باسمه واسم المشترك
              </span>
            </div>

            {/* توجيه إلى الفني */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                توجيه المهمة إلى الفني <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.specialty || 'فني صيانة'})
                  </option>
                ))}
              </select>
            </div>

            {/* ملاحظات فقط */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                ملاحظات فقط
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="اكتب هنا الملاحظات وتفاصيل العطل أو العنوان الدقيق..."
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>إرسال وتكليف الفني فوراً</span>
            </button>
          </form>

          {/* 7-Day Retention Notice */}
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>الاحتفاظ بالسجلات:</span>
            </span>
            <span className="text-slate-300 font-semibold">تحذف تلقائياً بعد مرور أسبوع (7 أيام)</span>
          </div>
        </div>

        {/* متابعة وسجل المهام (Task Monitoring & Management) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Controls: Search, Filters & Export */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم المشترك، الهاتف، رقم المهمة..."
                  className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Retention purge and Export buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualPurge}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  title="فحص وحذف المهام الأقدم من 7 أيام"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>فحص 7 أيام</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  title="تصدير كملف إكسل / CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تصدير تقرير</span>
                </button>
              </div>
            </div>

            {/* Status & Technician Filter Chips */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  الكل ({tasks.length})
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === 'pending'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  بانتظار القبول ({pendingCount})
                </button>
                <button
                  onClick={() => setStatusFilter('in_progress')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === 'in_progress'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  قيد التنفيذ ({inProgressCount})
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === 'completed'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  مكتملة ({completedCount})
                </button>
              </div>

              {/* Technician dropdown filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">الفني:</span>
                <select
                  value={techFilter}
                  onChange={(e) => setTechFilter(e.target.value)}
                  className="p-1 px-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                >
                  <option value="all">كافة الفنيين</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tasks List */}
          {filteredTasks.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
              <p className="text-sm font-semibold text-slate-400">لا توجد مهام تطابق خيارات البحث الحالية</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setTechFilter('all');
                }}
                className="mt-2 text-xs text-blue-400 hover:underline"
              >
                إعادة ضبط الفلترة
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const isPending = !task.acceptedAt && !task.completedAt;
                const isInProgress = task.acceptedAt && !task.completedAt;
                const isCompleted = !!task.completedAt;

                const retentionNotice = getRetentionCountdown(task.createdAt);

                return (
                  <div
                    key={task.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all shadow-md"
                  >
                    {/* Top Row: Task #, Type, Assigned Tech, Delete */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-400" dir="ltr">
                          {task.taskNumber}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs font-bold text-white">
                          {task.taskType}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-emerald-300 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          الفني: {task.assignedToName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPending && (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/20">
                            بانتظار القبول
                          </span>
                        )}
                        {isInProgress && (
                          <span className="text-[10px] font-bold text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded-md border border-blue-500/20">
                            قيد التنفيذ
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            مكتملة
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف المهمة (${task.taskNumber})؟`)) {
                              onDeleteTask(task.id);
                            }
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="حذف المهمة من السجل"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Subscriber info & Direct Call / WhatsApp */}
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-400">المشترك:</span>
                        <span className="text-slate-100 font-bold">{task.subscriberName}</span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-400">الهاتف:</span>
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
                            onClick={() => setPreviewWhatsAppTask(task)}
                            className="p-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-md transition-colors"
                            title="رسالة واتساب جاهزة"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Notes only */}
                    {task.notes && (
                      <div className="mt-2 p-2 bg-slate-800/40 rounded-xl text-xs text-slate-300">
                        <span className="text-slate-400 font-semibold block mb-0.5">ملاحظات:</span>
                        {task.notes}
                      </div>
                    )}

                    {/* Timestamps recording: وقت الإرسال، وقت القبول، وقت الانتهاء، الوقت المستغرق */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">وقت الإرسال:</span>
                        <span className="text-slate-300 font-medium">{formatArabicDateTime(task.createdAt)}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block">وقت القبول:</span>
                        <span className="text-slate-300 font-medium">
                          {task.acceptedAt ? formatArabicDateTime(task.acceptedAt) : 'لم يتم القبول'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 block">وقت الانتهاء:</span>
                        <span className="text-slate-300 font-medium">
                          {task.completedAt ? formatArabicDateTime(task.completedAt) : 'قيد الانتظار'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 block">الوقت المستغرق:</span>
                        <span className="font-bold text-amber-400">
                          {task.durationFormatted || (isInProgress ? 'جاري العمل...' : '—')}
                        </span>
                      </div>
                    </div>

                    {/* Retention info */}
                    <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
                      <span>حفظ السجل: {retentionNotice}</span>
                      <span>سجل أسبوعي تلقائي</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reset Demo Data button if needed */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                if (confirm('هل تريد إعادة تحميل البيانات الافتراضية التجريبية؟')) {
                  onResetDemoData();
                }
              }}
              className="text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1.5 mx-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط البيانات التجريبية الأصلية</span>
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Modal */}
      {previewWhatsAppTask && (
        <WhatsAppPreviewModal
          task={previewWhatsAppTask}
          technicianName={previewWhatsAppTask.assignedToName}
          onClose={() => setPreviewWhatsAppTask(null)}
        />
      )}
    </div>
  );
};
