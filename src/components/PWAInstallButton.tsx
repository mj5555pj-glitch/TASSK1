import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Share, 
  PlusSquare, 
  X, 
  CheckCircle2, 
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface Props {
  variant?: 'navbar' | 'floating' | 'card';
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'navbar' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  // If already installed and running inside standalone app window, hide the install prompts
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        setInstalledSuccess(true);
        setTimeout(() => setInstalledSuccess(false), 4000);
      }
    } else {
      // Show universal install guide for desktop/mobile browsers
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {/* Navbar button layout */}
      <button
        type="button"
        onClick={handleInstallClick}
        className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
          variant === 'navbar'
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
        }`}
        title="تثبيت التطبيق على سطح المكتب للكمبيوتر والجوال"
      >
        <Download className="w-3.5 h-3.5 text-blue-200 shrink-0" />
        <span className="hidden xs:inline sm:hidden whitespace-nowrap">تثبيت</span>
        <span className="hidden sm:inline whitespace-nowrap">تثبيت التطبيق</span>
      </button>

      {/* Success notification */}
      {installedSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in max-w-[calc(100vw-2rem)]" dir="rtl">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>تم تثبيت التطبيق بنجاح على جهازك!</span>
        </div>
      )}

      {/* Guided Install Modal for Desktop & Mobile Browsers */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-[calc(100vw-1.5rem)] sm:max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-200 text-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    تثبيت التطبيق على الكمبيوتر والجوال
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    يعمل التطبيق كتطبيق أصلي (PWA) بدون الحاجة لمتجر تطبيقات
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instruction Tabs/Cards */}
            <div className="space-y-3 text-xs">
              {/* Option 1: Desktop (Chrome / Edge / Windows / Mac) */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-bold">
                  <Monitor className="w-4 h-4" />
                  <span>سطح المكتب للكمبيوتر (Chrome / Edge):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pr-1 leading-relaxed">
                  <li>انقر على أيقونة التثبيت <strong className="text-white">💻 (تثبيت التطبيق)</strong> الموجودة في شريط عنوان المتصفح بالأعلى.</li>
                  <li>أو افتح قائمة المتصفح (⋮) ثم اختر <strong className="text-white">"تثبيت منظومة مهام صيانة الإنترنت"</strong>.</li>
                  <li>سيظهر التطبيق كأيقونة مستقلة على سطح المكتب وقائمة ابدأ.</li>
                </ol>
              </div>

              {/* Option 2: Android Phones */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Smartphone className="w-4 h-4" />
                  <span>هواتف الأندرويد (Google Chrome):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pr-1 leading-relaxed">
                  <li>اضغط على زر القائمة <strong className="text-white">(الثلاث نقاط ⋮)</strong> في أعلى أو أسفل المتصفح.</li>
                  <li>اختر <strong className="text-white">"تثبيت التطبيق"</strong> أو <strong className="text-white">"الإضافة إلى الشاشة الرئيسية"</strong>.</li>
                  <li>سيتم تنزيل التطبيق وفتحه كبرنامج مستقل بكامل الشاشة.</li>
                </ol>
              </div>

              {/* Option 3: iPhone / iPad (Safari) */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-bold">
                  <Share className="w-4 h-4" />
                  <span>هواتف آيفون وآيباد (متصفح Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pr-1 leading-relaxed">
                  <li>اضغط على زر <strong className="text-white">المشاركة (Share 📤)</strong> في شريط متصفح Safari.</li>
                  <li>مرر للأسفل واضغط على <strong className="text-white">"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong>.</li>
                  <li>اضغط على <strong className="text-white">"إضافة" (Add)</strong> في الزاوية العلوية.</li>
                </ol>
              </div>
            </div>

            {/* Direct prompt try button if available */}
            {isInstallable && (
              <button
                type="button"
                onClick={async () => {
                  await install();
                  setShowGuideModal(false);
                }}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>بدء التثبيت التلقائي الآن</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  );
};
