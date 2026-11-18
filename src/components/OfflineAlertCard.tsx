import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, ChevronUp, AlertTriangle } from 'lucide-react';

export const OfflineAlertCard: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [minimized, setMinimized] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setMinimized(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setMinimized(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetryCheck = async () => {
    setIsChecking(true);
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOnline(false);
        return;
      }
      const res = await fetch(`${window.location.origin}/?ping=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
      });
      if (res.ok || navigator.onLine) {
        setIsOnline(true);
        setMinimized(false);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setTimeout(() => setIsChecking(false), 350);
    }
  };

  if (isOnline) return null;

  if (minimized) {
    return (
      <div
        dir="rtl"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[100] bg-rose-600 dark:bg-rose-700 text-white border-2 border-rose-300 dark:border-rose-400 rounded-2xl px-4 py-3 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <WifiOff className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black truncate">لا يوجد اتصال بالإنترنت</p>
            <p className="text-[11px] text-rose-100 truncate">كنك اول مرة دماغ البشه</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="px-3 py-1.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-xs font-black shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          <span>عرض</span>
        </button>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border-2 border-rose-400 dark:border-rose-500/70 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-500/20 border-2 border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/15">
          <WifiOff className="w-8 h-8 animate-pulse" />
        </div>

        {/* Title & Main Phrase */}
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>تنبيه انقطاع الشبكة</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            لا يوجد اتصال بالإنترنت
          </h2>

          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 text-base sm:text-lg font-black">
            كنك اول مرة دماغ البشه
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 pt-1">
            يرجى التحقق من اتصال الواي فاي أو بيانات الهاتف حتى تصل المهام والإشعارات بشكل فوري للمدير والفني.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleRetryCheck}
            disabled={isChecking}
            className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-sm font-black shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'جاري الفحص...' : 'تحديث فحص الاتصال'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            تصغير البطاقة
          </button>
        </div>
      </div>
    </div>
  );
};
