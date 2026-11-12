import React, { useState } from 'react';
import { MaintenanceTask } from '../types';
import { 
  buildWhatsAppMessage, 
  normalizePhoneForWhatsApp, 
  COUNTRY_CODES, 
  getTelUrl 
} from '../utils/whatsapp';
import { 
  MessageSquare, 
  Phone, 
  PhoneCall, 
  Copy, 
  Check, 
  X, 
  ExternalLink, 
  Globe, 
  CheckCircle2, 
  AlertCircle,
  Video,
  Send
} from 'lucide-react';

interface Props {
  task: MaintenanceTask;
  technicianName: string;
  onClose: () => void;
}

export const WhatsAppPreviewModal: React.FC<Props> = ({ task, technicianName, onClose }) => {
  // Mode selection: 'message' | 'call'
  const [activeTab, setActiveTab] = useState<'message' | 'call'>('message');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('964'); // Default Iraq 964
  const [editablePhone, setEditablePhone] = useState<string>(task.phone);
  const [copied, setCopied] = useState(false);

  const defaultMessage = buildWhatsAppMessage(
    task.subscriberName, 
    technicianName, 
    task.taskType, 
    task.notes
  );
  const [customMessage, setCustomMessage] = useState(defaultMessage);

  // Computed clean WhatsApp number with country code
  const cleanPhone = normalizePhoneForWhatsApp(editablePhone, selectedCountryCode);
  const isValidNumber = cleanPhone.length >= 10;

  const currentCountry = COUNTRY_CODES.find((c) => c.dialCode === selectedCountryCode) || COUNTRY_CODES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Send pre-filled WhatsApp message
  const handleSendMessage = () => {
    if (!cleanPhone) return;
    const encoded = encodeURIComponent(customMessage);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  // 2. Open WhatsApp for Voice / Video Call
  const handleWhatsAppCall = () => {
    if (!cleanPhone) return;
    // Direct chat link in WhatsApp allows 1-click call from top bar in app
    const url = `https://wa.me/${cleanPhone}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  // 3. Regular GSM cellular call
  const handleRegularCall = () => {
    window.location.href = getTelUrl(editablePhone);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-[calc(100vw-1.25rem)] sm:max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 sm:p-6 text-slate-100 animate-in zoom-in-95 duration-200 space-y-4 sm:space-y-5 max-h-[92vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-bold text-white flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span>خيارات الواتساب للمشترك</span>
                <span className="text-[10px] sm:text-xs font-normal text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.2 rounded-full border border-emerald-500/20">
                  {task.taskNumber}
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                المشترك: <strong className="text-white">{task.subscriberName}</strong> · الفني: <strong className="text-slate-300">{technicianName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Country Code & Phone Verification Section (Fix for missing country code) */}
        <div className="p-3 sm:p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>مفتاح الدولة ورقم الهاتف للواتساب:</span>
            </span>

            {/* Country Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 shrink-0">الدولة:</span>
              <select
                value={selectedCountryCode}
                onChange={(e) => setSelectedCountryCode(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500 cursor-pointer max-w-full"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.dialCode}>
                    {c.flag} {c.name} (+{c.dialCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Formatted Number Display */}
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 shrink-0">الرقم المدخل:</span>
              <input
                type="text"
                value={editablePhone}
                onChange={(e) => setEditablePhone(e.target.value)}
                className="bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500 w-32 sm:w-36"
                dir="ltr"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-1 rounded-lg font-mono text-xs overflow-hidden">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] text-slate-400 ml-1 shrink-0">الدولي:</span>
              <span dir="ltr" className="truncate">+{cleanPhone}</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher: خيار إرسال الرسالة أو الاتصال عبر الواتساب */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('message')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'message'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>1. إرسال رسالة عبر الواتساب</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('call')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'call'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>2. الاتصال عبر الواتساب</span>
          </button>
        </div>

        {/* Tab 1 Content: إرسال رسالة */}
        {activeTab === 'message' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                نص الرسالة المسبقة المجهزة للإرسال:
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ بنجاح' : 'نسخ نص الرسالة'}</span>
              </button>
            </div>

            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={4}
              className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs sm:text-sm leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none font-sans"
              placeholder="اكتب الرسالة هنا..."
            />

            <p className="text-[11px] text-slate-400">
              * سيتم فتح تطبيق الواتساب مباشرة مع إدراج الرسالة والاسمين ورقم المشترك بمفتاح الدولة الدولي (+{selectedCountryCode}).
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!isValidNumber}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/40"
              >
                <Send className="w-4 h-4" />
                <span>إرسال الرسالة عبر الواتساب الآن</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2 Content: الاتصال عبر الواتساب */}
        {activeTab === 'call' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-4 rounded-xl bg-slate-950 border border-blue-500/20 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">الاتصال المباشر بالمشترك عبر الواتساب</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    يتم فتح محادثة الواتساب مع الرقم الدولي (+{cleanPhone}) فوراً، لتتمكن من الضغط على زر الاتصال الصوتي <Phone className="w-3.5 h-3.5 inline mx-1 text-emerald-400" /> أو الفيديو <Video className="w-3.5 h-3.5 inline mx-1 text-blue-400" /> بالأعلى مجاناً وبدون رصيد هاتفي.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleWhatsAppCall}
                  disabled={!isValidNumber}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/40"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>فتح الواتساب والاتصال الصوتي</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </button>

                <button
                  type="button"
                  onClick={handleRegularCall}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
                  title="اتصال عادي عبر شريحة الهاتف GSM"
                >
                  <Phone className="w-4 h-4 text-blue-400" />
                  <span>اتصال هاتفي عادي (GSM)</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
