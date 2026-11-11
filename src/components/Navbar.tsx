import React from 'react';
import { User, PageView } from '../types';
import { 
  Wifi, 
  LogOut, 
  Shield, 
  Wrench, 
  Send, 
  Activity, 
  Archive, 
  Clock, 
  Database 
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface Props {
  currentUser: User;
  currentPage: PageView;
  onPageChange: (page: PageView) => void;
  onLogout: () => void;
  pendingCount?: number;
  inProgressCount?: number;
  onOpenTechManagement?: () => void;
}

export const Navbar: React.FC<Props> = ({
  currentUser,
  currentPage,
  onPageChange,
  onLogout,
  pendingCount = 0,
  inProgressCount = 0,
  onOpenTechManagement,
}) => {
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

              {onOpenTechManagement && (
                <button
                  type="button"
                  onClick={onOpenTechManagement}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                  title="تعديل حسابات الفنيين وإضافة أو إزالة فني وتغيير كلمات المرور"
                >
                  <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                  <span>إدارة حسابات الفنيين</span>
                </button>
              )}
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

            {/* PWA Install Button for Desktop & Mobile */}
            <PWAInstallButton variant="navbar" />

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
              <span>الأرشيف</span>
            </button>
            {onOpenTechManagement && (
              <button
                type="button"
                onClick={onOpenTechManagement}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-emerald-400 font-bold hover:bg-slate-800"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>الفنيين</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
