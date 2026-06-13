import { MessageCircle, Stethoscope } from 'lucide-react';
import { cn } from '../lib/utils';
import type { useCircleT } from '../lib/circleI18nContext';

export type CirclePostFolderActionVariant =
  | 'drop_in_start'
  | 'drop_in_resume'
  | 'drop_in_offline'
  | 'drop_in_dnd'
  | 'record_visit';

interface CirclePostFolderActionCardProps {
  variant: CirclePostFolderActionVariant;
  onAction?: () => void;
  t: ReturnType<typeof useCircleT>;
  className?: string;
}

export function CirclePostFolderActionCard({
  variant,
  onAction,
  t,
  className,
}: CirclePostFolderActionCardProps) {
  const isDropIn = variant.startsWith('drop_in_');
  const isBlocked = variant === 'drop_in_offline' || variant === 'drop_in_dnd';
  const isResume = variant === 'drop_in_resume';
  const isActionable = !isBlocked && !!onAction;

  const title = (() => {
    switch (variant) {
      case 'drop_in_start':
        return t('dashboard.dropIn');
      case 'drop_in_resume':
        return t('dashboard.resumeDropIn');
      case 'drop_in_offline':
        return t('circle.folderActionDropInOfflineTitle');
      case 'drop_in_dnd':
        return t('circle.folderActionDropInDndTitle');
      case 'record_visit':
        return t('circle.folderActionRecordVisit');
      default:
        return '';
    }
  })();

  const description = (() => {
    switch (variant) {
      case 'drop_in_start':
        return t('circle.folderActionDropInStartHint');
      case 'drop_in_resume':
        return t('circle.folderActionDropInResumeHint');
      case 'drop_in_offline':
        return t('circle.folderActionDropInOfflineHint');
      case 'drop_in_dnd':
        return t('circle.folderActionDropInDndHint');
      case 'record_visit':
        return t('circle.folderActionRecordVisitHint');
      default:
        return '';
    }
  })();

  const Icon = isDropIn ? MessageCircle : Stethoscope;

  const content = (
    <>
      <span
        className={cn(
          'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
          isBlocked
            ? 'bg-slate-100 text-slate-400'
            : isDropIn
              ? isResume
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-600'
              : 'bg-blue-50 text-blue-600',
        )}
      >
        <Icon size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-bold text-slate-800">{title}</span>
        <span className="block text-xs text-slate-500 mt-0.5 leading-snug">{description}</span>
      </span>
    </>
  );

  if (isActionable) {
    return (
      <button
        type="button"
        onClick={onAction}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors',
          isResume
            ? 'border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100/80'
            : isDropIn
              ? 'border-indigo-100 bg-white hover:bg-indigo-50/50'
              : 'border-blue-100 bg-white hover:bg-blue-50/50',
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/80',
        className,
      )}
    >
      {content}
    </div>
  );
}
