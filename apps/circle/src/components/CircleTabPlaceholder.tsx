import type { LucideIcon } from 'lucide-react';

type PlaceholderItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
};

type CircleTabPlaceholderProps = {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  subtitle: string;
  patientName?: string;
  items?: PlaceholderItem[];
};

export function CircleTabPlaceholder({
  icon: Icon,
  iconClassName = 'bg-blue-50 text-blue-600',
  title,
  subtitle,
  patientName,
  items,
}: CircleTabPlaceholderProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-4 text-center">
        <div
          className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center ${iconClassName}`}
        >
          <Icon size={28} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
          {patientName && (
            <p className="text-sm mt-1">
              For{' '}
              <span className="font-bold text-red-600">{patientName}</span>
            </p>
          )}
          <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-md mx-auto">{subtitle}</p>
        </div>
        <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
          Coming soon
        </span>
      </div>

      {items && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <div
                key={item.title}
                className="p-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 text-left opacity-90"
              >
                <ItemIcon size={20} className="text-slate-400 mb-2" />
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-700">{item.title}</p>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-500 text-[9px] font-bold uppercase">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
