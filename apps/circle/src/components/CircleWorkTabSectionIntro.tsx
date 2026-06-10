import type { LucideIcon } from 'lucide-react';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCircleBackToDashboard } from '../lib/circleChromeContext';
import { cn } from '../lib/utils';
import { circleSectionSubtitleClass, circleSectionTitleClass } from '../lib/circleSectionStyles';

export function CircleWorkTabDashboardBackButton({ className }: { className?: string }) {
  const onBackToDashboard = useCircleBackToDashboard();
  if (!onBackToDashboard) return null;

  return (
    <button
      type="button"
      onClick={onBackToDashboard}
      className={cn(
        'p-2 rounded-xl text-slate-500 hover:bg-slate-100 shrink-0',
        className,
      )}
      aria-label="Back to dashboard"
    >
      <ChevronLeft size={20} />
    </button>
  );
}

type CircleWorkTabSectionIntroProps = {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  subtitle?: string;
  titleExtra?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

export function CircleWorkTabSectionIntro({
  icon: Icon,
  iconClassName = 'text-blue-600',
  title,
  subtitle,
  titleExtra,
  trailing,
  className,
}: CircleWorkTabSectionIntroProps) {
  return (
    <div className={cn('flex items-start gap-2', className)}>
      <CircleWorkTabDashboardBackButton className="-ml-1" />
      <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Icon size={18} className={cn('shrink-0', iconClassName)} strokeWidth={2} />
            <h3 className={circleSectionTitleClass}>{title}</h3>
            {titleExtra}
          </div>
          {subtitle && (
            <p
              className={cn(
                circleSectionSubtitleClass,
                '[@media(max-height:740px)]:line-clamp-1',
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        {trailing}
      </div>
    </div>
  );
}
