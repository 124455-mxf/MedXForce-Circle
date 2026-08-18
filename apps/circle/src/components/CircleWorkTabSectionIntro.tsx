import type { LucideIcon } from 'lucide-react';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCircleBackToDashboard } from '../lib/circleChromeContext';
import { useCircleT } from '../lib/circleI18nContext';
import { cn } from '../lib/utils';
import { circleSectionSubtitleClass, circleSectionTitleClass } from '../lib/circleSectionStyles';

export function CircleWorkTabDashboardBackButton({ className }: { className?: string }) {
  const onBackToDashboard = useCircleBackToDashboard();
  const t = useCircleT();
  if (!onBackToDashboard) return null;

  return (
    <button
      type="button"
      onClick={onBackToDashboard}
      className={cn(
        'p-2 rounded-xl text-slate-500 hover:bg-slate-100 shrink-0',
        className,
      )}
      aria-label={t('common.aria.backToDashboard')}
    >
      <ChevronLeft size={20} />
    </button>
  );
}

type CircleWorkTabSectionIntroProps = {
  icon: LucideIcon;
  iconClassName?: string;
  /** Rounded tile behind the icon (Analytics sheets / overview). */
  iconTileClassName?: string;
  title: string;
  subtitle?: string;
  titleExtra?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

export function CircleWorkTabSectionIntro({
  icon: Icon,
  iconClassName = 'text-blue-600',
  iconTileClassName,
  title,
  subtitle,
  titleExtra,
  trailing,
  className,
}: CircleWorkTabSectionIntroProps) {
  const icon = iconTileClassName ? (
    <div
      className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
        iconTileClassName,
      )}
    >
      <Icon size={18} />
    </div>
  ) : (
    <Icon size={18} className={cn('shrink-0', iconClassName)} strokeWidth={2} />
  );

  return (
    <div className={cn('flex', iconTileClassName ? 'items-center gap-3' : 'items-start gap-2', className)}>
      <CircleWorkTabDashboardBackButton className="-ml-1" />
      <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
        {iconTileClassName ? (
          <div className="min-w-0 flex-1 flex items-center gap-3">
            {icon}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className={circleSectionTitleClass}>{title}</h3>
                {titleExtra ? <span className="inline-flex shrink-0">{titleExtra}</span> : null}
              </div>
              {subtitle && <p className={circleSectionSubtitleClass}>{subtitle}</p>}
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {icon}
              <h3 className={circleSectionTitleClass}>{title}</h3>
              {titleExtra ? <span className="inline-flex shrink-0">{titleExtra}</span> : null}
            </div>
            {subtitle && <p className={circleSectionSubtitleClass}>{subtitle}</p>}
          </div>
        )}
        {trailing}
      </div>
    </div>
  );
}
