import { BarChart3, Image, LayoutDashboard, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

export type CircleMainTab = 'dashboard' | 'messages' | 'media' | 'analytics';

export interface CircleNavItem {
  id: CircleMainTab;
  label: string;
  icon: typeof MessageSquare;
}

interface CircleBottomNavProps {
  items: CircleNavItem[];
  activeTab: CircleMainTab;
  onTabChange: (tab: CircleMainTab) => void;
}

export function CircleBottomNav({ items, activeTab, onTabChange }: CircleBottomNavProps) {
  if (items.length === 0) return null;

  return (
    <nav
      className="shrink-0 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-sm pt-0.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeTab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 transition-colors min-w-0',
                active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600',
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
              <span
                className={cn(
                  'text-[9px] font-bold uppercase tracking-wide truncate w-full text-center',
                  active ? 'text-blue-600' : 'text-slate-400',
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function navItemsForPatient(capabilities: {
  messaging?: boolean;
  viewCircleMedia?: boolean;
  richMediaUpload?: boolean;
  viewClinicalData?: boolean;
}): CircleNavItem[] {
  const items: CircleNavItem[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  ];
  if (capabilities.messaging) {
    items.push({ id: 'messages', label: 'Messages', icon: MessageSquare });
  }
  if (capabilities.viewCircleMedia || capabilities.richMediaUpload) {
    items.push({ id: 'media', label: 'Media', icon: Image });
  }
  if (capabilities.viewClinicalData) {
    items.push({ id: 'analytics', label: 'Analytics', icon: BarChart3 });
  }
  return items;
}
