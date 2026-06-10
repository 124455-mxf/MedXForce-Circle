import type { LucideIcon } from 'lucide-react';
import { CircleWorkTabDashboardBackButton } from './CircleWorkTabSectionIntro';
import { cn } from '../lib/utils';

type PlaceholderItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName?: string;
  badge?: string;
};

type CircleTabPlaceholderProps = {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  subtitle: string;
  badge?: string;
  items?: PlaceholderItem[];
};

function PlaceholderBadge({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-500 text-[9px] font-bold uppercase shrink-0">
      {label}
    </span>
  );
}

function PlaceholderCard({
  icon: Icon,
  iconClassName = 'text-slate-500',
  title,
  description,
  badge,
  className,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  description: string;
  badge?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'p-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 text-left opacity-90',
        className,
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Icon size={18} className={`shrink-0 ${iconClassName}`} strokeWidth={2} />
        <p className="font-bold text-slate-700">{title}</p>
        {badge && <PlaceholderBadge label={badge} />}
      </div>
      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{description}</p>
    </div>
  );
}

export function CircleTabPlaceholder({
  icon,
  iconClassName = 'text-cyan-600',
  title,
  subtitle,
  badge = 'Coming soon',
  items,
}: CircleTabPlaceholderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <CircleWorkTabDashboardBackButton className="-ml-1" />
        <PlaceholderCard
          icon={icon}
          iconClassName={iconClassName}
          title={title}
          description={subtitle}
          badge={badge}
          className="flex-1 min-w-0"
        />
      </div>

      {items && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <PlaceholderCard
              key={item.title}
              icon={item.icon}
              iconClassName={item.iconClassName ?? 'text-slate-500'}
              title={item.title}
              description={item.description}
              badge={item.badge}
            />
          ))}
        </div>
      )}
    </div>
  );
}
