import React, { useState } from 'react';
import { MaintenanceTask } from '../types';
import { buildWhatsAppMessage, getWhatsAppUrl, normalizePhoneForWhatsApp } from '../utils/whatsapp';
import { MessageSquare, ExternalLink, Copy, Check, X, Phone } from 'lucide-react';

interface Props {
  task: MaintenanceTask;
  technicianName: string;
  onClose: () => void;
}

export const WhatsAppPreviewModal: React.FC<Props> = ({ task, technicianName, onClose }) => {
  const [copied, setCopied] = useState(false);
  const cleanPhone = normalizePhoneForWhatsApp(task.phone);
  const defaultMessage = buildWhatsAppMessage(task.subscriberName, technicianName, task.taskType, task.notes);
  const [customMessage, setCustomMessage] = useState(defaultMessage);

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(customMessage);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">رسالة الواتساب الجاهزة</h3>
              <p className="text-xs text-slate-400">إرسال مباشر إلى المشترك: {task.subscriberName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Strip */}
        <div className="my-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">رقم المشترك:</span>
            <span className="font-mono text-emerald-400 font-semibold" dir="ltr">{task.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">الفني المرسل:</span>
            <span className="text-white font-medium">{technicianName}</span>
          </div>
        </div>

        {/* Message Editor / Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              نص الرسالة المسبقة المجهزة للإرسال:
            </label>
            <span className="text-[11px] text-slate-400">قابلة للتعديل قبل الإرسال</span>
          </div>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={5}
            className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
            placeholder="اكتب الرسالة هنا..."
          />
        </div>

        {/* Notice */}
        <p className="mt-3 text-[11px] text-slate-400 leading-normal">
          * بالضغط على &quot;فتح واتساب الآن&quot;، سيتم نقلك مباشرة إلى تطبيق الواتساب أو واتساب ويب مع إدراج الرسالة والاسمين تلقائياً.
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? 'تم النسخ!' : 'نسخ الرسالة'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/40"
          >
            <ExternalLink className="w-4 h-4" />
            <span>فتح واتساب الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
};
