import React, { useState, useEffect } from 'react';
import { DeductionRecord, DeductionSettings, User } from '../types';
import { formatDeductionAmount, getDeductionReasonLabel } from '../utils/deductions';
import { formatArabicDateTime } from '../utils/time';
import {
  Wallet,
  Settings,
  X,
  Check,
  RotateCcw,
  Trash2,
  Clock,
  AlertTriangle,
  Users,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

interface Props {
  initialTab?: 'balances' | 'settings';
  technicians: User[];
  deductionSettings: DeductionSettings;
  deductionRecords: DeductionRecord[];
  onSaveSettings: (settings: DeductionSettings) => Promise<void>;
  onWaiveRecord: (record: DeductionRecord) => Promise<void>;
  onResetEmployeeBalance: (userId: string, records: DeductionRecord[]) => Promise<void>;
  onClose: () => void;
}

const PRESET_UNITS = ['د.ع', '%', 'نقطة', '$'];

export const DeductionsModal: React.FC<Props> = ({
  initialTab = 'balances',
  technicians,
  deductionSettings,
  deductionRecords,
  onSaveSettings,
  onWaiveRecord,
  onResetEmployeeBalance,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'balances' | 'settings'>(initialTab);
  const [expandedTechIds, setExpandedTechIds] = useState<Record<string, boolean>>({});
  const [confirmResetTechId, setConfirmResetTechId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Settings form state
  const [enabled, setEnabled] = useState<boolean>(deductionSettings.enabled);
  const [unitLabel, setUnitLabel] = useState<string>(deductionSettings.unitLabel || 'د.ع');
  const [acceptDelayMinutes, setAcceptDelayMinutes] = useState<number>(deductionSettings.acceptDelayMinutes);
  const [acceptDelayDeduction, setAcceptDelayDeduction] = useState<number>(deductionSettings.acceptDelayDeduction);
  const [completionDelayMinutes, setCompletionDelayMinutes] = useState<number>(deductionSettings.completionDelayMinutes);
  const [completionDelayDeduction, setCompletionDelayDeduction] = useState<number>(deductionSettings.completionDelayDeduction);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(deductionSettings.enabled);
    setUnitLabel(deductionSettings.unitLabel || 'د.ع');
    setAcceptDelayMinutes(deductionSettings.acceptDelayMinutes);
    setAcceptDelayDeduction(deductionSettings.acceptDelayDeduction);
    setCompletionDelayMinutes(deductionSettings.completionDelayMinutes);
    setCompletionDelayDeduction(deductionSettings.completionDelayDeduction);
  }, [deductionSettings]);

  const toggleExpand = (techId: string) => {
    setExpandedTechIds((prev) => ({ ...prev, [techId]: !prev[techId] }));
  };

  const totalTeamDeductions = technicians.reduce(
    (sum, t) => sum + (typeof t.deductionBalance === 'number' ? t.deductionBalance : 0),
    0
  );
  const techsWithDeductions = technicians.filter(
    (t) => (typeof t.deductionBalance === 'number' ? t.deductionBalance : 0) > 0
  ).length;

  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (acceptDelayMinutes < 0 || acceptDelayDeduction < 0 || completionDelayMinutes < 0 || completionDelayDeduction < 0) {
      setError('القيم المدخلة يجب أن تكون أرقاماً موجبة أو صفراً.');
      return;
    }

    try {
      setIsSavingSettings(true);
      await onSaveSettings({
        enabled,
        unitLabel: unitLabel.trim() || 'د.ع',
        acceptDelayMinutes: Number(acceptDelayMinutes) || 0,
        acceptDelayDeduction: Number(acceptDelayDeduction) || 0,
        completionDelayMinutes: Number(completionDelayMinutes) || 0,
        completionDelayDeduction: Number(completionDelayDeduction) || 0,
        updatedAt: new Date().toISOString(),
      });
      setToast('تم حفظ إعدادات رصيد الخصومات وتطبيقها بنجاح!');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ الإعدادات في فايبر بيس.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleConfirmReset = async (tech: User, techRecords: DeductionRecord[]) => {
    setError(null);
    try {
      setBusyId(`reset_${tech.id}`);
      await onResetEmployeeBalance(tech.id, techRecords);
      setConfirmResetTechId(null);
      setToast(`تم تصفير رصيد خصومات (${tech.fullName}) بنجاح.`);
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error(err);
      setError(`تعذر تصفير رصيد (${tech.fullName})، يرجى المحاولة مرة أخرى.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleWaive = async (record: DeductionRecord) => {
    setError(null);
    try {
      setBusyId(`waive_${record.id}`);
      await onWaiveRecord(record);
      setToast(`تم حذف الخصم عن المهمة (${record.taskNumber}) وطرحه من رصيد الخصومات بنجاح.`);
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error(err);
      setError(`تعذر حذف الخصم عن المهمة (${record.taskNumber})، يرجى المحاولة مرة أخرى.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-[calc(100vw-1.25rem)] sm:max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 text-slate-100 max-h-[92vh] overflow-y-auto space-y-4"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-white truncate">
                رصيد خصومات الموظفين وإعدادات التأخير
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                رصيد خصومات فقط لكل فني · يُطبق على المهمة الأولى فقط وتُعفى المهام الإضافية
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('balances')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'balances'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>أرصدة الخصومات للموظفين</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>إعدادات نسب ومدد الخصم</span>
          </button>
        </div>

        {toast && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs sm:text-sm text-emerald-300 font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: Employee Deduction Balances */}
        {activeTab === 'balances' && (
          <div className="space-y-4">
            {/* KPI Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-rose-500/30">
                <span className="text-[11px] text-rose-300 font-bold block">إجمالي رصيد الخصومات</span>
                <div className="text-lg sm:text-xl font-black text-rose-400 mt-1 tabular-nums">
                  {formatDeductionAmount(totalTeamDeductions, deductionSettings.unitLabel)}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-bold block">موظفون لديهم خصومات</span>
                <div className="text-lg sm:text-xl font-black text-amber-400 mt-1 tabular-nums">
                  {techsWithDeductions} <span className="text-xs font-normal text-slate-400">من {technicians.length}</span>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-bold block">حالة النظام التلقائي</span>
                <div className={`text-sm font-black mt-1.5 ${deductionSettings.enabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {deductionSettings.enabled ? 'مفعّل تلقائياً' : 'متوقف مؤقتاً'}
                </div>
              </div>
            </div>

            {/* Active Rules Summary Strip */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  تأخير القبول (&gt; <strong className="text-amber-300">{deductionSettings.acceptDelayMinutes} د</strong>):{' '}
                  <strong className="text-rose-400">{formatDeductionAmount(deductionSettings.acceptDelayDeduction, deductionSettings.unitLabel)}</strong>
                </span>
                <span className="text-slate-700">|</span>
                <span>
                  تأخير الإنجاز (&gt; <strong className="text-amber-300">{deductionSettings.completionDelayMinutes} د</strong>):{' '}
                  <strong className="text-rose-400">{formatDeductionAmount(deductionSettings.completionDelayDeduction, deductionSettings.unitLabel)}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="text-amber-400 hover:text-amber-300 font-bold underline"
              >
                تعديل الإعدادات
              </button>
            </div>

            {/* Technician Balance Cards */}
            {technicians.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
                لا يوجد فنيون مسجلون حالياً.
              </div>
            ) : (
              <div className="space-y-3">
                {technicians.map((tech) => {
                  const balance = typeof tech.deductionBalance === 'number' ? tech.deductionBalance : 0;
                  const techRecords = deductionRecords.filter((r) => r.userId === tech.id);
                  const isExpanded = !!expandedTechIds[tech.id];

                  return (
                    <div
                      key={tech.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        balance > 0
                          ? 'bg-slate-950 border-rose-500/35'
                          : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white">{tech.fullName}</span>
                            <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                              {tech.phone}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            إجمالي حركات الخصم المسجلة: <strong className="text-slate-200">{techRecords.length}</strong>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className={`px-3 py-1.5 rounded-xl border text-xs font-black tabular-nums ${
                            balance > 0
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          }`}>
                            رصيد الخصومات: {formatDeductionAmount(balance, deductionSettings.unitLabel)}
                          </div>

                          {(balance > 0 || techRecords.length > 0) && (
                            confirmResetTechId === tech.id ? (
                              <div className="flex items-center gap-1.5 bg-slate-900 border border-rose-500/40 rounded-xl px-2 py-1">
                                <button
                                  type="button"
                                  disabled={busyId === `reset_${tech.id}`}
                                  onClick={() => handleConfirmReset(tech, techRecords)}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                                >
                                  {busyId === `reset_${tech.id}` ? 'جاري التصفير...' : 'تأكيد التصفير'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmResetTechId(null)}
                                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={busyId === `reset_${tech.id}`}
                                onClick={() => setConfirmResetTechId(tech.id)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                                title="تصفير رصيد خصومات الموظف بعد التسوية"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>تصفير الرصيد</span>
                              </button>
                            )
                          )}

                          <button
                            type="button"
                            onClick={() => toggleExpand(tech.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1"
                          >
                            <span>التفاصيل ({techRecords.length})</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                          {techRecords.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-2">
                              لا توجد خصومات مسجلة على هذا الموظف.
                            </p>
                          ) : (
                            techRecords.map((rec) => (
                              <div
                                key={rec.id}
                                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-bold text-blue-400" dir="ltr">{rec.taskNumber}</span>
                                    <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/20 text-[10px] font-bold">
                                      {getDeductionReasonLabel(rec.reason)}
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      تأخير {rec.delayMinutes} د (المسموح {rec.allowedMinutes} د)
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {formatArabicDateTime(rec.createdAt)}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                  <span className="font-black text-rose-400 tabular-nums">
                                    -{formatDeductionAmount(rec.amount, rec.unitLabel)}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={busyId === `waive_${rec.id}`}
                                    onClick={() => handleWaive(rec)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                                    title="حذف هذا الخصم وطرحه من رصيد الخصومات"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{busyId === `waive_${rec.id}` ? 'جاري الحذف...' : 'حذف الخصم'}</span>
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Deduction Rules Settings */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettingsSubmit} className="space-y-4">
            {/* Rule Explanation Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200 leading-relaxed">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-300 mb-0.5">قاعدة المهمة الأولى فقط:</strong>
                عند إرسال أكثر من مهمة لنفس الموظف أثناء وجود مهمة نشطة لم تُنجز بعد، يتم احتساب الخصم على{' '}
                <strong className="text-white">المهمة الأولى فقط</strong> ولا يُطبق أي خصم تأخير على المهام الثانية أو الإضافية.
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs sm:text-sm font-bold text-white">تفعيل احتساب الخصومات التلقائي</div>
                <div className="text-[11px] text-slate-400">
                  عند التفعيل يتم احتساب الخصومات تلقائياً في رصيد كل موظف عند تجاوز المدة المحددة
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                  enabled
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {enabled ? 'مفعّل' : 'متوقف'}
              </button>
            </div>

            {/* Unit Label Selector */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-200">
                وحدة / صيغة الخصم (نسبة مئوية أو مبلغ مالي أو نقاط)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnitLabel(u)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      unitLabel === u
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {u === '%' ? 'نسبة (%)' : u}
                  </button>
                ))}
                <input
                  type="text"
                  value={unitLabel}
                  onChange={(e) => setUnitLabel(e.target.value)}
                  maxLength={20}
                  placeholder="وحدة مخصصة..."
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 w-32 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Two Rules Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Rule 1: Accept Delay */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs sm:text-sm pb-2 border-b border-slate-800">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>1. التأخير في قبول المهمة</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    مدة التأخير المسموحة (بالدقائق)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={acceptDelayMinutes}
                    onChange={(e) => setAcceptDelayMinutes(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    يبدأ الخصم إذا لم يقبل الفني المهمة خلال هذه المدة
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    نسبة / مقدار الخصم ({unitLabel})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={acceptDelayDeduction}
                    onChange={(e) => setAcceptDelayDeduction(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-rose-300 font-mono font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Rule 2: Completion Delay */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-3">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs sm:text-sm pb-2 border-b border-slate-800">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>2. التأخير في إنجاز المهمة</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    مدة التأخير المسموحة للإنجاز (بالدقائق)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={completionDelayMinutes}
                    onChange={(e) => setCompletionDelayMinutes(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    تحسب من وقت العمل الفعلي بعد قبول المهمة (لا تشمل الإيقاف المؤقت)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    نسبة / مقدار الخصم ({unitLabel})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={completionDelayDeduction}
                    onChange={(e) => setCompletionDelayDeduction(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-rose-300 font-mono font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                إغلاق
              </button>
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSavingSettings ? 'جاري الحفظ...' : 'حفظ إعدادات الخصم'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
