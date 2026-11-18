import React, { useState, useRef, useEffect } from 'react';
import { User, PageView } from '../types';
import { 
  Wifi, 
  LogOut, 
  Shield, 
  Wrench, 
  Send, 
  Activity, 
  Archive, 
  MessageSquare,
  Wallet,
  Settings,
  ChevronDown,
  ChevronLeft
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { ThemeToggleButton } from './ThemeToggleButton';
import { AppTheme } from '../utils/theme';

interface Props {
  currentUser: User;
  currentPage: PageView;
  onPageChange: (page: PageView) => void;
  onLogout: () => void;
  theme: AppTheme;
  onToggleTheme: () => void;
  pendingCount?: number;
  inProgressCount?: number;
  onOpenTechManagement?: () => void;
  onOpenManagerAccount?: () => void;
  onOpenWhatsAppTemplate?: () => void;
  onOpenDeductions?: () => void;
}

export const Navbar: React.FC<Props> = ({
  currentUser,
  currentPage,
  onPageChange,
  onLogout,
  theme,
  onToggleTheme,
  pendingCount = 0,
  inProgressCount = 0,
  onOpenTechManagement,
  onOpenManagerAccount,
  onOpenWhatsAppTemplate,
  onOpenDeductions,
}) => {
  const isManager = currentUser.role === 'manager';
  const [settingsOpen, setSettingsOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  const hasSettingsItems = !!(onOpenTechManagement || onOpenWhatsAppTemplate || onOpenDeductions);

  useEffect(() => {
    if (!settingsOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [settingsOpen]);

  const renderSettingsMenuItems = () => (
    <div className="space-y-1.5">
      <div className="px-2.5 pt-1 pb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
          الإعدادات والإدارة
        </span>
      </div>

      {onOpenTechManagement && (
        <button
          type="button"
          onClick={() => {
            setSettingsOpen(false);
            onOpenTechManagement();
          }}
          className="w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 dark:bg-slate-950/60 dark:hover:bg-emerald-500/10 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all text-right cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                الفنيين
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                إدارة حسابات الفنيين وكلمات المرور
              </div>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 shrink-0" />
        </button>
      )}

      {onOpenWhatsAppTemplate && (
        <button
          type="button"
          onClick={() => {
            setSettingsOpen(false);
            onOpenWhatsAppTemplate();
          }}
          className="w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50 dark:bg-slate-950/60 dark:hover:bg-teal-500/10 border border-slate-200/80 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-500/30 transition-all text-right cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300">
                الواتساب
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                تعديل رسالة الواتساب المرسلة للمشترك
              </div>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 shrink-0" />
        </button>
      )}

      {onOpenDeductions && (
        <button
          type="button"
          onClick={() => {
            setSettingsOpen(false);
            onOpenDeductions();
          }}
          className="w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 dark:bg-slate-950/60 dark:hover:bg-rose-500/10 border border-slate-200/80 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-500/30 transition-all text-right cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-rose-700 dark:group-hover:text-rose-300">
                الخصومات
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                رصيد خصومات الموظفين وإعدادات التأخير
              </div>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 shrink-0" />
        </button>
      )}
    </div>
  );

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full shadow-md shadow-slate-200/60 dark:shadow-slate-950/60 transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 relative">
        {/* Main Header Bar */}
        <div className="h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-2.5 lg:gap-4">
          {/* Zone 1: Integrated App Logo & Name */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink min-w-0 sm:shrink-0">
            <div className="flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 shrink-0">
              <Wifi className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[12px] leading-tight sm:text-sm lg:text-base font-black tracking-tight text-slate-900 dark:text-white truncate whitespace-nowrap">
              متابعه التاسكات (هشام)
            </span>
          </div>

          {/* Integrated Navigation Links for Manager (Single Unified Bar on Computer/Tablet) */}
          {isManager && (
            <nav className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shrink-0">
              <button
                onClick={() => {
                  setSettingsOpen(false);
                  onPageChange('dispatch');
                }}
                className={`flex items-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                  currentPage === 'dispatch'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span className="lg:hidden">إرسال</span>
                <span className="hidden lg:inline">إرسال المهام</span>
              </button>

              <button
                onClick={() => {
                  setSettingsOpen(false);
                  onPageChange('monitoring');
                }}
                className={`flex items-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                  currentPage === 'monitoring'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <Activity className={`w-3.5 h-3.5 shrink-0 ${currentPage === 'monitoring' ? 'text-amber-200' : 'text-amber-600 dark:text-amber-400'}`} />
                <span className="lg:hidden">المتابعة</span>
                <span className="hidden lg:inline xl:hidden">المتابعة</span>
                <span className="hidden xl:inline">متابعة المهام</span>
                {(pendingCount > 0 || inProgressCount > 0) && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black">
                    {pendingCount + inProgressCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setSettingsOpen(false);
                  onPageChange('archive');
                }}
                className={`flex items-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                  currentPage === 'archive'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <Archive className="w-3.5 h-3.5 shrink-0" />
                <span className="xl:hidden">الأرشيف</span>
                <span className="hidden xl:inline">السجل والأرشيف</span>
              </button>

              {/* Settings Dropdown Card Trigger */}
              {hasSettingsItems && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSettingsOpen((prev) => !prev)}
                    aria-expanded={settingsOpen}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                      settingsOpen
                        ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                    }`}
                    title="الإعدادات: الفنيين، الواتساب، الخصومات"
                  >
                    <Settings className={`w-3.5 h-3.5 transition-transform duration-200 ${settingsOpen ? 'rotate-45 text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
                    <span>الإعدادات</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {settingsOpen && (
                    <div className="absolute top-full left-0 mt-2.5 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                      {renderSettingsMenuItems()}
                    </div>
                  )}
                </div>
              )}
            </nav>
          )}

          {/* Account, Theme Toggle, PWA & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isManager ? (
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  onOpenManagerAccount?.();
                }}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border border-amber-300 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 transition-all cursor-pointer group"
                title="تعديل بيانات حساب المدير (الاسم، اسم المستخدم، كلمة المرور، الهاتف)"
              >
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-slate-900 dark:text-white font-medium hidden lg:inline max-w-[100px] truncate">{currentUser.fullName}</span>
                <span className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-200/70 dark:bg-amber-500/20 px-1 py-0.2 rounded border border-amber-300 dark:border-amber-500/30 shrink-0 font-semibold">حسابي</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/70 text-xs">
                <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-slate-900 dark:text-white font-medium hidden sm:inline max-w-[100px] truncate">{currentUser.fullName}</span>
              </div>
            )}

            {/* Theme Toggle Button */}
            <ThemeToggleButton theme={theme} onToggle={onToggleTheme} variant="navbar" />

            {/* PWA Install Button for Desktop & Mobile */}
            <PWAInstallButton variant="navbar" />

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 border border-rose-200 dark:border-red-500/20 text-rose-700 dark:text-red-300 hover:text-rose-900 dark:hover:text-red-200 text-xs font-semibold transition-colors cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">خروج</span>
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar for Manager - 4 clean columns */}
        {isManager && (
          <div className="grid grid-cols-4 gap-1.5 sm:hidden border-t border-slate-200 dark:border-slate-800/80 py-1.5 text-[11px] w-full">
            <button
              onClick={() => {
                setSettingsOpen(false);
                onPageChange('dispatch');
              }}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-all ${
                currentPage === 'dispatch' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5 mb-0.5" />
              <span className="truncate w-full text-center">إرسال</span>
            </button>
            <button
              onClick={() => {
                setSettingsOpen(false);
                onPageChange('monitoring');
              }}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-all relative ${
                currentPage === 'monitoring' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 mb-0.5" />
              <span className="truncate w-full text-center">المتابعة</span>
              {(pendingCount > 0 || inProgressCount > 0) && (
                <span className="absolute top-0.5 right-1 px-1 rounded-full text-[9px] bg-amber-500 text-slate-950 font-black">
                  {pendingCount + inProgressCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setSettingsOpen(false);
                onPageChange('archive');
              }}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-all ${
                currentPage === 'archive' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Archive className="w-3.5 h-3.5 mb-0.5" />
              <span className="truncate w-full text-center">الأرشيف</span>
            </button>

            {hasSettingsItems && (
              <button
                type="button"
                onClick={() => setSettingsOpen((prev) => !prev)}
                aria-expanded={settingsOpen}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-all ${
                  settingsOpen
                    ? 'bg-slate-900 dark:bg-slate-800 text-white font-bold'
                    : 'text-indigo-700 dark:text-indigo-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Settings className={`w-3.5 h-3.5 mb-0.5 transition-transform duration-200 ${settingsOpen ? 'rotate-45 text-amber-400' : ''}`} />
                <span className="truncate w-full text-center">الإعدادات</span>
              </button>
            )}
          </div>
        )}

        {/* Mobile Floating Settings Card */}
        {isManager && settingsOpen && hasSettingsItems && (
          <div className="sm:hidden absolute top-full left-2.5 right-2.5 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {renderSettingsMenuItems()}
          </div>
        )}
      </div>
    </header>
  );
};


