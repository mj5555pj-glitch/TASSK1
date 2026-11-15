import React, { useState, useEffect } from 'react';
import { User, DeductionSettings } from '../types';
import { 
  Shield, 
  User as UserIcon, 
  KeyRound, 
  Phone, 
  Briefcase, 
  Check, 
  X, 
  Eye, 
  EyeOff,
  AlertCircle,
  Wallet,
  Clock,
  ShieldAlert,
  Info
} from 'lucide-react';

interface Props {
  manager: User;
  allUsers: User[];
  deductionSettings: DeductionSettings;
  onSave: (updatedManager: User) => Promise<void>;
  onSaveDeductionSettings: (settings: DeductionSettings) => Promise<void>;
  onOpenDeductionBalances?: () => void;
  onClose: () => void;
}

const PRESET_UNITS = ['د.ع', '%', 'نقطة', '$'];

export const ManagerAccountModal: React.FC<Props> = ({
  manager,
  allUsers,
  deductionSettings,
  onSave,
  onSaveDeductionSettings,
  onOpenDeductionBalances,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'account' | 'deductions'>('account');

  // Account fields
  const [fullName, setFullName] = useState(manager.fullName || '');
  const [username, setUsername] = useState(manager.username || '');
  const [password, setPassword] = useState(manager.password || '');
  const [phone, setPhone] = useState(manager.phone || '');
  const [specialty, setSpecialty] = useState(manager.specialty || 'إدارة العمليات وتوجيه الفنيين');
  const [showPassword, setShowPassword] = useState(false);

  // Deduction settings fields (configured directly in Manager Account)
  const [dedEnabled, setDedEnabled] = useState<boolean>(deductionSettings.enabled);
  const [unitLabel, setUnitLabel] = useState<string>(deductionSettings.unitLabel || 'د.ع');
  const [acceptDelayMinutes, setAcceptDelayMinutes] = useState<number>(deductionSettings.acceptDelayMinutes);
  const [acceptDelayDeduction, setAcceptDelayDeduction] = useState<number>(deductionSettings.acceptDelayDeduction);
  const [completionDelayMinutes, setCompletionDelayMinutes] = useState<number>(deductionSettings.completionDelayMinutes);
  const [completionDelayDeduction, setCompletionDelayDeduction] = useState<number>(deductionSettings.completionDelayDeduction);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    setDedEnabled(deductionSettings.enabled);
    setUnitLabel(deductionSettings.unitLabel || 'د.ع');
    setAcceptDelayMinutes(deductionSettings.acceptDelayMinutes);
    setAcceptDelayDeduction(deductionSettings.acceptDelayDeduction);
    setCompletionDelayMinutes(deductionSettings.completionDelayMinutes);
    setCompletionDelayDeduction(deductionSettings.completionDelayDeduction);
  }, [deductionSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = fullName.trim();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setError('يرجى إدخال الاسم الكامل للمدير');
      return;
    }

    if (!cleanUser) {
      setError('يرجى إدخال اسم المستخدم لتسجيل الدخول');
      return;
    }

    if (!cleanPass) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    if (!cleanPhone) {
      setError('يرجى إدخال رقم الهاتف');
      return;
    }

    // Check duplicate username with other users (except this manager)
    const duplicate = allUsers.find(
      (u) => u.username.toLowerCase() === cleanUser && u.id !== manager.id
    );
    if (duplicate) {
      setError(`اسم المستخدم (${cleanUser}) مسجل مسبقاً لمستخدم آخر. يرجى اختيار اسم مستخدم فريد.`);
      return;
    }

    const updatedUser: User = {
      ...manager,
      fullName: cleanName,
      username: cleanUser,
      password: cleanPass,
      phone: cleanPhone,
      specialty: specialty.trim() || 'إدارة العمليات وتوجيه الفنيين',
    };

    try {
      setIsSubmitting(true);
      await onSave(updatedUser);
      setSuccessToast('تم حفظ وتحديث بيانات حساب المدير بنجاح في فايبر بيس!');
      setTimeout(() => {
        setSuccessToast(null);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ التعديلات في فايبر بيس. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDeductionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      acceptDelayMinutes < 0 ||
      acceptDelayDeduction < 0 ||
      completionDelayMinutes < 0 ||
      completionDelayDeduction < 0
    ) {
      setError('يجب أن تكون المدد ومقادير الخصم أرقاماً موجبة أو صفراً.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSaveDeductionSettings({
        enabled: dedEnabled,
        unitLabel: unitLabel.trim() || 'د.ع',
        acceptDelayMinutes: Number(acceptDelayMinutes) || 0,
        acceptDelayDeduction: Number(acceptDelayDeduction) || 0,
        completionDelayMinutes: Number(completionDelayMinutes) || 0,
        completionDelayDeduction: Number(completionDelayDeduction) || 0,
        updatedAt: new Date().toISOString(),
        updatedBy: manager.fullName,
      });
      setSuccessToast('تم حفظ إعدادات رصيد الخصومات وتطبيقها في النظام!');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ إعدادات الخصم في فايبر بيس.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-[calc(100vw-1.25rem)] sm:max-w-xl bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 text-slate-100 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200 space-y-4"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">
                حساب المدير وإعدادات الخصومات
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                تعديل بيانات الحساب وضبط نسب ومدد خصومات التأخير للموظفين
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('account');
              setError(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'account'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>بيانات حساب المدير</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('deductions');
              setError(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'deductions'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>إعدادات رصيد الخصومات</span>
          </button>
        </div>

        {/* Success Alert */}
        {successToast && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs sm:text-sm text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'account' ? (
          /* Edit Account Form */
          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                الاسم الكامل للمدير <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="المهندس أحمد العلي"
                  className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                اسم المستخدم لتسجيل الدخول <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  dir="ltr"
                  className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 text-right font-mono placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                اسم المستخدم الذي يتم إدخاله في شاشة تسجيل الدخول
              </span>
            </div>

            {/* Password with Show/Hide Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                كلمة المرور الجديدة <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full pr-3 pl-10 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-white"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                رقم الهاتف <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07701234567"
                  dir="ltr"
                  className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 text-right font-mono focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            {/* Specialty */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                المسمى الوظيفي / الاختصاص
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                  <Briefcase className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="إدارة العمليات وتوجيه الفنيين"
                  className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                إغلاق
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:from-amber-700 active:to-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات في فايبر بيس'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Deduction Settings inside Manager Account */
          <form onSubmit={handleSaveDeductionSubmit} className="space-y-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-200 leading-relaxed">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                يُحتسب رصيد خصومات فقط لكل موظف عند التأخير في قبول المهمة أو إنجازها،{' '}
                <strong className="text-white">ويُطبق على المهمة الأولى فقط</strong> ولا يُطبق على المهام الثانية عند إرسال أكثر من مهمة لنفس الموظف.
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white">تفعيل نظام الخصم التلقائي</span>
              <button
                type="button"
                onClick={() => setDedEnabled(!dedEnabled)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  dedEnabled
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {dedEnabled ? 'مفعّل' : 'متوقف'}
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-200">وحدة الخصم</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {PRESET_UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnitLabel(u)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      unitLabel === u
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-slate-900 text-slate-300 border-slate-700'
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
                  className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 w-24 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Accept Delay */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>التأخير في قبول المهمة</span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">مدة التأخير (دقيقة)</label>
                  <input
                    type="number"
                    min={0}
                    value={acceptDelayMinutes}
                    onChange={(e) => setAcceptDelayMinutes(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">نسبة / مقدار الخصم ({unitLabel})</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={acceptDelayDeduction}
                    onChange={(e) => setAcceptDelayDeduction(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-rose-300 font-mono font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Completion Delay */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>التأخير في إنجاز المهمة</span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">مدة التأخير (دقيقة)</label>
                  <input
                    type="number"
                    min={0}
                    value={completionDelayMinutes}
                    onChange={(e) => setCompletionDelayMinutes(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">نسبة / مقدار الخصم ({unitLabel})</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={completionDelayDeduction}
                    onChange={(e) => setCompletionDelayDeduction(Number(e.target.value))}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-rose-300 font-mono font-bold focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
              {onOpenDeductionBalances && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDeductionBalances();
                  }}
                  className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>عرض أرصدة خصومات الموظفين</span>
                </button>
              )}

              <div className="flex items-center gap-2 mr-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  إغلاق
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ إعدادات الخصم'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
