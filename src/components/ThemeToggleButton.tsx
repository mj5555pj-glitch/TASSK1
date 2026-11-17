import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { AppTheme } from '../utils/theme';

interface Props {
  theme: AppTheme;
  onToggle: () => void;
  variant?: 'navbar' | 'card';
}

export const ThemeToggleButton: React.FC<Props> = ({
  theme,
  onToggle,
  variant = 'navbar',
}) => {
  const isDark = theme === 'dark';
  const nextLabel = isDark ? 'الوضع النهاري' : 'الوضع الليلي';
  const shortLabel = isDark ? 'نهاري' : 'ليلي';

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label={`تبديل إلى ${nextLabel}`}
        title={`التبديل إلى ${nextLabel}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700 cursor-pointer"
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 shrink-0" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
        )}
        <span className="whitespace-nowrap">{nextLabel}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`تبديل إلى ${nextLabel}`}
      title={`التبديل إلى ${nextLabel}`}
      className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700 cursor-pointer shrink-0"
    >
      {isDark ? (
        <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
      ) : (
        <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 shrink-0" />
      )}
      <span className="hidden min-[420px]:inline sm:hidden whitespace-nowrap">{shortLabel}</span>
      <span className="hidden sm:inline whitespace-nowrap">{nextLabel}</span>
    </button>
  );
};
