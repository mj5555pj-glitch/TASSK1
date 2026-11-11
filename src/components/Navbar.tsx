import React, { useState } from 'react';
import { User, PageView } from '../types';
import { 
  Wifi, 
  LogOut, 
  UserCheck, 
  Shield, 
  Wrench, 
  Users, 
  Send, 
  Activity, 
  Archive, 
  Clock, 
  Database 
} from 'lucide-react';

interface Props {
  currentUser: User;
  currentPage: PageView;
  onPageChange: (page: PageView) => void;
  onLogout: () => void;
  onSwitchUser: (user: User) => void;
  allUsers: User[];
  pendingCount?: number;
  inProgressCount?: number;
}

export const Navbar: React.FC<Props> = ({
  currentUser,
  currentPage,
  onPageChange,
  onLogout,
  onSwitchUser,
  allUsers,
  pendingCount = 0,
  inProgressCount = 0,
}) => {
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const isManager = currentUser.role === 'manager';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
                  منظومة مهام صيانة الإنترنت
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <Database className="w-3 h-3" />
                  <span>فايبر بيس</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                إرسال ومتابعة مهام الصيانة للفنيين وتوثيق الأوقات
              </p>
            </div>
          </div>

          {/* Navigation Links for Manager */}
          {isManager && (
            <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => onPageChange('dispatch')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                  currentPage === 'dispatch'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>صفحة إرسال المهام</span>
              </button>

              <button
                onClick={() => onPageChange('monitoring')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                  currentPage === 'monitoring'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>متابعة المهام الجارية والمعلقة</span>
                {(pendingCount > 0 || inProgressCount > 0) && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black">
                    {pendingCount + inProgressCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onPageChange('archive')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                  currentPage === 'archive'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>سجل الأسبوع والأرشيف</span>
              </button>
            </nav>
          )}

          {/* Account & Role info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/70 text-xs">
              {isManager ? (
                <Shield className="w-4 h-4 text-amber-400" />
              ) : (
                <Wrench className="w-4 h-4 text-emerald-400" />
              )}
              <span className="text-white font-medium hidden sm:inline">{currentUser.fullName}</span>
            </div>

            {/* Quick Switch Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                title="تبديل الحساب للتجربة والمحاكاة"
              >
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">تبديل</span>
              </button>

              {showSwitchMenu && (
                <div 
                  className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in"
                  dir="rtl"
                >
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-800">
                    تبديل سريع للمستخدم (للتجربة)
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {allUsers.map((u) => {
                      const isCurrent = u.id === currentUser.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            onSwitchUser(u);
                            setShowSwitchMenu(false);
                          }}
                          className={`w-full text-right px-3 py-2 flex items-center justify-between text-xs transition-colors hover:bg-slate-800 ${
                            isCurrent ? 'bg-blue-600/15 text-blue-300 font-bold' : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {u.role === 'manager' ? (
                              <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : (
                              <Wrench className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            <div>
                              <div className="text-xs">{u.fullName}</div>
                              <div className="text-[10px] text-slate-400">
                                {u.role === 'manager' ? 'مدير الصيانة' : u.specialty || 'فني ميداني'}
                              </div>
                            </div>
                          </div>
                          {isCurrent && <UserCheck className="w-4 h-4 text-blue-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 hover:text-red-200 text-xs font-semibold transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar for Manager */}
        {isManager && (
          <div className="flex md:hidden items-center justify-around border-t border-slate-800/80 py-2 text-xs">
            <button
              onClick={() => onPageChange('dispatch')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                currentPage === 'dispatch' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال المهام</span>
            </button>
            <button
              onClick={() => onPageChange('monitoring')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                currentPage === 'monitoring' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>المتابعة</span>
            </button>
            <button
              onClick={() => onPageChange('archive')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                currentPage === 'archive' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>الأرشيف (أسبوع)</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
