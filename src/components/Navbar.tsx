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
  Database,
  MessageSquare
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
  onOpenManagerAccount?: () => void;
  onOpenWhatsAppTemplate?: () => void;
}

export const Navbar: React.FC<Props> = ({
  currentUser,
  currentPage,
  onPageChange,
  onLogout,
  pendingCount = 0,
  inProgressCount = 0,
  onOpenTechManagement,
  onOpenManagerAccount,
  onOpenWhatsAppTemplate,
}) => {
  const isManager = currentUser.role === 'manager';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-2 sm:gap-3 shrink min-w-0">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 shrink-0">
              <Wifi className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white truncate max-w-[130px] sm:max-w-none sm:text-lg">
                  <span className="sm:hidden">صيانة نت</span>
                  <span className="hidden sm:inline">منظومة مهام صيانة الإنترنت</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
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
                  <span>الفنيين</span>
                </button>
              )}

              {onOpenWhatsAppTemplate && (
                <button
                  type="button"
                  onClick={onOpenWhatsAppTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                  title="تعديل نص رسالة الواتساب المرسلة للمشترك"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                  <span>رسالة الواتساب</span>
                </button>
              )}
            </nav>
          )}

          {/* Account & Role info */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {isManager ? (
              <button
                type="button"
                onClick={onOpenManagerAccount}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs text-amber-200 transition-all cursor-pointer group"
                title="تعديل بيانات حساب المدير (الاسم، اسم المستخدم، كلمة المرور، الهاتف)"
              >
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-white font-medium hidden sm:inline max-w-[100px] truncate">{currentUser.fullName}</span>
                <span className="text-[10px] text-amber-300 bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/30 shrink-0 font-semibold">حسابي</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/70 text-xs">
                <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                <span className="text-white font-medium hidden sm:inline max-w-[100px] truncate">{currentUser.fullName}</span>
              </div>
            )}

            {/* PWA Install Button for Desktop & Mobile */}
            <PWAInstallButton variant="navbar" />

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 hover:text-red-200 text-xs font-semibold transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar for Manager - 5 equal grid columns, zero overflow */}
        {isManager && (
          <div className="grid grid-cols-5 gap-1 md:hidden border-t border-slate-800/80 py-1.5 text-[10px] w-full">
            <button
              onClick={() => onPageChange('dispatch')}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all ${
                currentPage === 'dispatch' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5 mb-0.5" />
              <span className="truncate w-full text-center">إرسال</span>
            </button>
            <button
              onClick={() => onPageChange('monitoring')}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all relative ${
                currentPage === 'monitoring' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 mb-0.5" />
              <span className="truncate w-full text-center">المتابعة</span>
              {(pendingCount > 0 || inProgressCount > 0) && (
                <span className="absolute top-0.5 right-0.5 px-1 rounded-full text-[9px] bg-amber-500 text-slate-950 font-black">
                  {pendingCount + inProgressCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onPageChange('archive')}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all ${
                currentPage === 'archive' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Archive className="w-3.5 h-3.5 mb-0.5" />
              <span className="truncate w-full text-center">الأرشيف</span>
            </button>
            {onOpenTechManagement && (
              <button
                type="button"
                onClick={onOpenTechManagement}
                className="flex flex-col items-center justify-center py-1 px-0.5 rounded-lg text-emerald-400 font-bold hover:bg-slate-800"
              >
                <Wrench className="w-3.5 h-3.5 mb-0.5" />
                <span className="truncate w-full text-center">الفنيين</span>
              </button>
            )}
            {onOpenWhatsAppTemplate && (
              <button
                type="button"
                onClick={onOpenWhatsAppTemplate}
                className="flex flex-col items-center justify-center py-1 px-0.5 rounded-lg text-teal-400 font-bold hover:bg-slate-800"
              >
                <MessageSquare className="w-3.5 h-3.5 mb-0.5" />
                <span className="truncate w-full text-center">الواتساب</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
