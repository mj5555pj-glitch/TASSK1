import React, { useState } from 'react';
import { User } from '../types';
import { 
  Users, 
  UserPlus, 
  Edit3, 
  Trash2, 
  X, 
  KeyRound, 
  Phone, 
  ShieldCheck, 
  Check, 
  Eye, 
  EyeOff, 
  Wrench,
  AlertCircle
} from 'lucide-react';

interface Props {
  technicians: User[];
  onSaveTechnician: (technician: User) => Promise<void>;
  onDeleteTechnician: (technicianId: string) => Promise<void>;
  onClose: () => void;
}

export const TechniciansManagementModal: React.FC<Props> = ({
  technicians,
  onSaveTechnician,
  onDeleteTechnician,
  onClose,
}) => {
  const [editingTech, setEditingTech] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingTech(null);
    setFullName('');
    setUsername('');
    setPassword('');
    setPhone('');
    setSpecialty('صيانة شبكات وإنترنت');
    setError(null);
  };

  const handleStartEdit = (tech: User) => {
    setEditingTech(tech);
    setIsCreating(false);
    setFullName(tech.fullName);
    setUsername(tech.username);
    setPassword(tech.password || '123');
    setPhone(tech.phone);
    setSpecialty(tech.specialty || 'صيانة شبكات وإنترنت');
    setError(null);
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingTech(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('يرجى إدخال اسم الفني الكامل');
      return;
    }
    if (!username.trim()) {
      setError('يرجى إدخال اسم المستخدم لتسجيل الدخول');
      return;
    }
    if (!password.trim()) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }
    if (!phone.trim()) {
      setError('يرجى إدخال رقم الهاتف');
      return;
    }

    // Check duplicate username
    const existing = technicians.find(
      (t) => t.username.toLowerCase() === username.trim().toLowerCase() && t.id !== editingTech?.id
    );
    if (existing) {
      setError('اسم المستخدم هذا مسجل مسبقاً لفني آخر، يرجى اختيار اسم مستخدم فريد');
      return;
    }

    const techToSave: User = {
      id: editingTech ? editingTech.id : `tech_${Date.now()}`,
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      password: password.trim(),
      phone: phone.trim(),
      specialty: specialty.trim() || 'صيانة شبكات وإنترنت',
      role: 'technician',
      status: editingTech ? editingTech.status : 'available',
    };

    try {
      setIsSubmitting(true);
      await onSaveTechnician(techToSave);
      setSuccessToast(editingTech ? 'تم تعديل بيانات وحساب الفني بنجاح!' : 'تم إنشاء حساب الفني الجديد بنجاح!');
      setTimeout(() => setSuccessToast(null), 3000);
      setIsCreating(false);
      setEditingTech(null);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ بيانات الفني في فايبر بيس.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tech: User) => {
    if (confirm(`هل أنت متأكد من إزالة الفني (${tech.fullName}) نهائياً من النظام؟`)) {
      try {
        setIsSubmitting(true);
        await onDeleteTechnician(tech.id);
        setSuccessToast(`تمت إزالة الفني (${tech.fullName}) من النظام.`);
        setTimeout(() => setSuccessToast(null), 3000);
      } catch (err) {
        console.error(err);
        alert('تعذر حذف الفني، يرجى المحاولة مرة أخرى.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div 
        className="relative w-full max-w-[calc(100vw-1.25rem)] sm:max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 text-slate-100 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-600/15 text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-inner shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-white truncate">إدارة وتعديل حسابات الفنيين</h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                إضافة فنيين، تعديل بياناتهم، تغيير اسم المستخدم وكلمة المرور
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successToast && (
          <div className="mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs sm:text-sm text-emerald-300 font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Add / Edit Form Card */}
        {(isCreating || editingTech) ? (
          <div className="mt-6 p-5 sm:p-6 bg-slate-950 border border-blue-500/30 rounded-2xl shadow-lg space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                <span>{editingTech ? `تعديل حساب الفني: ${editingTech.fullName}` : 'إضافة حساب فني جديد'}</span>
              </h3>
              <button
                type="button"
                onClick={handleCancelForm}
                className="text-xs text-slate-400 hover:text-white"
              >
                إلغاء التعديل
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    اسم الفني الكامل <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: عمر الصالح"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    رقم الهاتف <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XXXXXXXXX"
                    dir="ltr"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 text-right font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    اسم المستخدم لتسجيل الدخول <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="مثال: tech1 أو omar"
                      dir="ltr"
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 text-right font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    يستخدمه الفني لتسجيل الدخول في بوابة النظام
                  </span>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    كلمة المرور لتسجيل الدخول <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      dir="ltr"
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 text-right font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    يمكن للمدير تغييرها وإعادة ضبطها في أي وقت
                  </span>
                </div>
              </div>

              {/* Specialty */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  تخصص الفني ومجال عمله
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="مثال: ألياف ضوئية فايبر FTTH، صيانة راوترات، إشارة نانوستيشن"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'جاري الحفظ...' : (editingTech ? 'حفظ التعديلات' : 'إضافة الفني')}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              إجمالي الفنيين المسجلين: <strong className="text-white tabular-nums">{technicians.length}</strong>
            </span>
            <button
              type="button"
              onClick={handleStartCreate}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة فني صيانة جديد</span>
            </button>
          </div>
        )}

        {/* Technicians List Cards */}
        <div className="mt-5 space-y-3">
          {technicians.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800">
              لا يوجد فنيين مسجلين حالياً. اضغط على &quot;إضافة فني صيانة جديد&quot; للبدء.
            </div>
          ) : (
            technicians.map((tech) => {
              const isPasswordVisible = !!showPasswords[tech.id];

              return (
                <div
                  key={tech.id}
                  className="p-4 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">{tech.fullName}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {tech.specialty || 'صيانة شبكات'}
                      </span>
                    </div>

                    {/* Credentials Info: Username & Password */}
                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                        <span>اسم المستخدم:</span>
                        <code className="text-blue-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800" dir="ltr">
                          {tech.username}
                        </code>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span>كلمة المرور:</span>
                        <code className="text-slate-200 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800" dir="ltr">
                          {isPasswordVisible ? (tech.password || '123') : '••••••••'}
                        </code>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(tech.id)}
                          className="p-0.5 text-slate-400 hover:text-white"
                          title={isPasswordVisible ? 'إخفاء' : 'إظهار'}
                        >
                          {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-mono" dir="ltr">{tech.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(tech)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 text-xs font-semibold transition-colors"
                      title="تعديل بيانات الفني واسم المستخدم وكلمة المرور"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(tech)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-semibold transition-colors"
                      title="إزالة الفني من النظام"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>إزالة</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-left">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
