import React, { useState } from 'react';
import { User } from '../types';
import { Wifi, Lock, User as UserIcon, ArrowLeft, Clock, PhoneCall, Calendar, ShieldAlert } from 'lucide-react';
import { DEFAULT_USERS } from '../utils/storage';
import { PWAInstallButton } from './PWAInstallButton';

interface Props {
  users: User[];
  onLogin: (user: User) => void;
}

// Convert Eastern Arabic & Persian numerals (٠-٩) to standard ASCII (0-9)
function normalizeDigits(str: string): string {
  return str.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
            .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
}

export const LoginScreen: React.FC<Props> = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Pool of all users: combined Firestore users + DEFAULT_USERS
  const pool = [...users];
  DEFAULT_USERS.forEach((def) => {
    if (!pool.some((u) => u.username.toLowerCase() === def.username.toLowerCase())) {
      pool.push(def);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rawUser = normalizeDigits(username.trim().toLowerCase());
    const cleanPassword = normalizeDigits(password.trim());

    if (!rawUser) {
      setError('يرجى إدخال اسم المستخدم');
      return;
    }

    // 1. Direct username match
    let found = pool.find((u) => u.username.toLowerCase() === rawUser);

    // 2. ID match
    if (!found) {
      found = pool.find((u) => u.id.toLowerCase() === rawUser);
    }

    // 3. Full name match
    if (!found) {
      found = pool.find((u) => u.fullName.toLowerCase() === rawUser);
    }

    // 4. Common Arabic & English aliases
    if (!found) {
      if (['admin', 'مدير', 'المدير', 'manager', 'احمد', 'أحمد', 'المهندس'].some(a => rawUser.includes(a))) {
        found = pool.find((u) => u.role === 'manager' || u.username === 'admin');
      } else if (['tech1', 'فني 1', 'فني1', 'عمر'].some(a => rawUser.includes(a))) {
        found = pool.find((u) => u.username === 'tech1');
      } else if (['tech2', 'فني 2', 'فني2', 'يوسف'].some(a => rawUser.includes(a))) {
        found = pool.find((u) => u.username === 'tech2');
      } else if (['tech3', 'فني 3', 'فني3', 'كمال'].some(a => rawUser.includes(a))) {
        found = pool.find((u) => u.username === 'tech3');
      }
    }

    // 5. Partial full-name match if search term is > 2 characters
    if (!found && rawUser.length >= 3) {
      found = pool.find((u) => u.fullName.toLowerCase().includes(rawUser));
    }

    if (!found) {
      setError(`اسم المستخدم (${username.trim()}) غير مسجل في النظام. يرجى التحقق من صحة اسم المستخدم المدخل.`);
      return;
    }

    // Check password if set
    if (found.password && cleanPassword && found.password !== cleanPassword) {
      setError('كلمة المرور غير صحيحة. يرجى التأكد من كتابة كلمة المرور الصحيحة.');
      return;
    }

    // Log the user in
    onLogin(found);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden" dir="rtl">
      {/* Top action: Install app banner */}
      <div className="absolute top-4 left-4 z-20">
        <PWAInstallButton variant="card" />
      </div>

      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/20 mb-4 ring-4 ring-blue-500/10">
            <Wifi className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
            منظومة مهام صيانة الإنترنت
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            بوابة تسجيل الدخول الموحدة للمديرين وفنيي الصيانة الميدانيين
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-8 shadow-2xl backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-medium flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
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
                  placeholder="أدخل اسم المستخدم"
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  autoComplete="username"
                  required
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
                  required
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
        </div>

        {/* Feature Highlights - 3 columns on tablet/desktop, stacked or 3-box on mobile */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-[11px] text-slate-400">
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex sm:flex-col items-center justify-center gap-2 sm:gap-0">
            <Clock className="w-4 h-4 sm:mx-auto sm:mb-1 text-blue-400 shrink-0" />
            <span>توثيق وقت الإرسال والقبول والإنجاز</span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex sm:flex-col items-center justify-center gap-2 sm:gap-0">
            <PhoneCall className="w-4 h-4 sm:mx-auto sm:mb-1 text-emerald-400 shrink-0" />
            <span>اتصال ورسائل واتساب مسبقة الصياغة</span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex sm:flex-col items-center justify-center gap-2 sm:gap-0">
            <Calendar className="w-4 h-4 sm:mx-auto sm:mb-1 text-indigo-400 shrink-0" />
            <span>حفظ السجلات لأسبوع وحذف تلقائي</span>
          </div>
        </div>
      </div>
    </div>
  );
};
