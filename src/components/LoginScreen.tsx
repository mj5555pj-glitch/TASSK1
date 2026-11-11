import React, { useState } from 'react';
import { User } from '../types';
import { Wifi, Lock, User as UserIcon, Shield, Wrench, ArrowLeft, Clock, PhoneCall, Calendar } from 'lucide-react';

interface Props {
  users: User[];
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<Props> = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('يرجى إدخال اسم المستخدم');
      return;
    }

    const found = users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!found) {
      setError('اسم المستخدم غير مسجل في النظام');
      return;
    }

    if (found.password && found.password !== password.trim()) {
      setError('كلمة المرور غير صحيحة (جرّب 123)');
      return;
    }

    onLogin(found);
  };

  const handleQuickLogin = (user: User) => {
    setUsername(user.username);
    setPassword(user.password || '123');
    onLogin(user);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden" dir="rtl">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/20 mb-4 ring-4 ring-blue-500/10">
            <Wifi className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
            منظومة مهام صيانة الإنترنت
          </h1>
          <p className="text-sm text-slate-400">
            بوابة تسجيل الدخول الموحدة للمديرين وفنيي الصيانة الميدانيين
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                اسم المستخدم
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: admin أو tech1"
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/25"
            >
              <span>تسجيل الدخول</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Login Testing Shortcuts */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="text-center mb-3">
              <span className="text-xs font-semibold text-slate-400">
                تجربة سريعة بضغطة زر واحدة (حسابات جاهزة):
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {users.map((u) => {
                const isMgr = u.role === 'manager';
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickLogin(u)}
                    className="p-2.5 text-right rounded-xl border border-slate-700/80 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600 transition-all text-xs flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className={`p-1.5 rounded-lg shrink-0 ${isMgr ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {isMgr ? <Shield className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-slate-200 group-hover:text-white truncate">
                          {u.fullName}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {isMgr ? 'لوحة إرسال المهام' : 'بطاقة انتظار الطلبات'}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Feature Highlights Pills-Free */}
        <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-400">
          <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <Clock className="w-4 h-4 mx-auto mb-1 text-blue-400" />
            <span>تسجيل وقت الإرسال والقبول والإنجاز</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <PhoneCall className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
            <span>اتصال ورسائل واتساب مسبقة الصياغة</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <Calendar className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
            <span>حفظ السجلات لأسبوع وحذف تلقائي</span>
          </div>
        </div>
      </div>
    </div>
  );
};
