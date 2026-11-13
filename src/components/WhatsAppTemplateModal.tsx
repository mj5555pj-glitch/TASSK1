import React, { useState, useRef } from 'react';
import {
  DEFAULT_WHATSAPP_TEMPLATE,
  WHATSAPP_TEMPLATE_PLACEHOLDERS,
  buildWhatsAppMessage,
} from '../utils/whatsapp';
import {
  MessageSquare,
  X,
  Save,
  RotateCcw,
  Eye,
  Plus,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface Props {
  currentTemplate: string;
  managerName: string;
  onSave: (newTemplate: string) => Promise<void>;
  onClose: () => void;
}

export const WhatsAppTemplateModal: React.FC<Props> = ({
  currentTemplate,
  onSave,
  onClose,
}) => {
  const [templateText, setTemplateText] = useState(
    currentTemplate && currentTemplate.trim().length > 0
      ? currentTemplate
      : DEFAULT_WHATSAPP_TEMPLATE
  );
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleInsertToken = (token: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTemplateText((prev) => `${prev} ${token}`);
      return;
    }

    const start = textarea.selectionStart ?? templateText.length;
    const end = textarea.selectionEnd ?? templateText.length;
    const updated =
      templateText.slice(0, start) + token + templateText.slice(end);
    setTemplateText(updated);

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + token.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  const handleResetDefault = () => {
    setTemplateText(DEFAULT_WHATSAPP_TEMPLATE);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!templateText.trim()) {
      setError('لا يمكن حفظ رسالة فارغة، يرجى كتابة نص رسالة الواتساب.');
      return;
    }

    if (templateText.length > 3500) {
      setError('نص الرسالة طويل جداً، يرجى اختصاره لأقل من 3500 حرف.');
      return;
    }

    try {
      setSaving(true);
      await onSave(templateText);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error('Failed to save WhatsApp template:', err);
      setError('تعذر حفظ قالب الرسالة في قاعدة البيانات، يرجى المحاولة مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  const livePreview = buildWhatsAppMessage(
    'أحمد محمد',
    'علي حسن',
    'صيانة',
    'الراوتر لا يعطي إشارة إنترنت',
    templateText,
    '#TSK-4821'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-[calc(100vw-1.25rem)] sm:max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 sm:p-6 text-slate-100 animate-in zoom-in-95 duration-200 space-y-4 max-h-[92vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-bold text-white truncate">
                تعديل رسالة الواتساب المرسلة للمشترك
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                يُعتمد هذا القالب تلقائياً لجميع الفنيين عند إرسال رسالة واتساب لأي مشترك
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-medium">
            {error}
          </div>
        )}

        {savedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>تم حفظ قالب رسالة الواتساب وتعميمه على كافة الحسابات بنجاح!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dynamic Variable Chips */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>متغيرات تلقائية (اضغط لإدراجها داخل النص):</span>
              </span>
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>استعادة النص الافتراضي</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {WHATSAPP_TEMPLATE_PLACEHOLDERS.map((item) => (
                <button
                  key={item.token}
                  type="button"
                  onClick={() => handleInsertToken(item.token)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-emerald-600/20 text-emerald-300 border border-slate-700 hover:border-emerald-500/40 text-[11px] font-semibold transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{item.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                    {item.token}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Template Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              نص الرسالة القابل للتعديل (أضف التفاصيل أو التعليمات التي تريدها):
            </label>
            <textarea
              ref={textareaRef}
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              rows={7}
              className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-sans"
              placeholder="اكتب قالب رسالة الواتساب هنا..."
            />
          </div>

          {/* Live Preview */}
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/25 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
              <Eye className="w-3.5 h-3.5" />
              <span>معاينة حية لشكل الرسالة التي ستصل للمشترك:</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-xs text-slate-200 whitespace-pre-line leading-relaxed">
              {livePreview}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/40"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'جاري الحفظ والتعميم...' : 'حفظ الرسالة وتعميمها للفنيين'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
