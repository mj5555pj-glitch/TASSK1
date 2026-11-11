import React, { useState } from 'react';
import { User, AllowedTaskType, TASK_TYPES } from '../types';
import { 
  Send, 
  Wrench, 
  PlusCircle, 
  Activity, 
  HelpCircle, 
  CheckCircle2, 
  Database, 
  User as UserIcon, 
  Phone, 
  FileText, 
  Calendar 
} from 'lucide-react';

interface Props {
  manager: User;
  technicians: User[];
  onAddTask: (data: {
    taskType: AllowedTaskType;
    subscriberName: string;
    phone: string;
    notes: string;
    assignedToId: string;
    assignedToName: string;
  }) => Promise<void>;
}

export const DispatchPage: React.FC<Props> = ({
  technicians,
  onAddTask,
}) => {
  const [selectedTaskType, setSelectedTaskType] = useState<AllowedTaskType>('صيانة');
  const [subscriberName, setSubscriberName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTechId, setAssignedTechId] = useState(technicians[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subscriberName.trim()) {
      setError('يرجى إدخال اسم المشترك');
      return;
    }

    if (!phone.trim()) {
      setError('يرجى إدخال رقم هاتف المشترك');
      return;
    }

    const assignedTech = technicians.find((t) => t.id === assignedTechId) || technicians[0];

    try {
      setIsSubmitting(true);
      await onAddTask({
        taskType: selectedTaskType,
        subscriberName: subscriberName.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        assignedToId: assignedTech.id,
        assignedToName: assignedTech.fullName,
      });

      setSubscriberName('');
      setPhone('');
      setNotes('');
      setSuccessToast(`تم إرسال المهمة وحفظها في قاعدة بيانات فايبر بيس وتكليف الفني (${assignedTech.fullName}) بنجاح!`);
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err) {
      setError('حدث خطأ أثناء حفظ المهمة في فايبر بيس، يرجى المحاولة مرة أخرى.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTaskIcon = (type: AllowedTaskType) => {
    switch (type) {
      case 'صيانة':
        return <Wrench className="w-5 h-5 text-blue-400" />;
      case 'تنصيب':
        return <PlusCircle className="w-5 h-5 text-emerald-400" />;
      case 'ضعف':
        return <Activity className="w-5 h-5 text-amber-400" />;
      case 'مشاكل اخرى':
        return <HelpCircle className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white">صفحة إرسال المهام</h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-3.5 h-3.5" />
              <span>فايبر بيس (Firebase Firestore)</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            تعبئة بطاقة إرسال المهمة وتوجيهها للفني مع تسجيل وقت الإرسال تلقائياً
          </p>
        </div>

        <div className="text-xs text-slate-400 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>مدة الاحتفاظ بالسجل: <strong>أسبوع كامل (7 أيام)</strong></span>
        </div>
      </div>

      {/* Main Dispatch Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        {successToast && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs sm:text-sm text-emerald-300 font-bold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs sm:text-sm text-rose-300 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* بطاقة ارسال المهمه: نوع المهمه فقط صيانة او تنصيب او ضعف او مشاكل اخرى */}
          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2">
              نوع المهمة <span className="text-red-400">*</span>
              <span className="text-xs font-normal text-slate-400 mr-2">
                (اختر واحداً من الأنواع الأربعة المعتمدة):
              </span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TASK_TYPES.map((t) => {
                const isSelected = selectedTaskType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTaskType(t.id)}
                    className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-900/30 ring-2 ring-blue-500/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        {getTaskIcon(t.id)}
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-blue-400 bg-blue-500' : 'border-slate-600'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-sm">{t.label}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                        {t.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* اسم المشترك */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                اسم المشترك <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={subscriberName}
                  onChange={(e) => setSubscriberName(e.target.value)}
                  placeholder="مثال: حيدر كريم الأسدي"
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* رقم الهاتف */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                رقم الهاتف <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XXXXXXXXX"
                  dir="ltr"
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 text-right font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* توجيه إلى الفني */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              توجيه المهمة إلى الفني المكلف <span className="text-red-400">*</span>
            </label>
            <select
              value={assignedTechId}
              onChange={(e) => setAssignedTechId(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName} — {t.specialty || 'فني صيانة شبكات'} (هاتف: {t.phone})
                </option>
              ))}
            </select>
          </div>

          {/* ملاحظات فقط */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              ملاحظات فقط
            </label>
            <div className="relative">
              <div className="absolute top-3 right-3 text-slate-500">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="اكتب هنا تفاصيل العطل أو العنوان الدقيق أو أي ملاحظة خاصة بالمشترك..."
                className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الإرسال والحفظ في فايبر بيس...' : 'إرسال المهمة وتكليف الفني الآن'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
