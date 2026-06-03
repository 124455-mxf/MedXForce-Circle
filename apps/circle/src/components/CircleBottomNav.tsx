import {
  BarChart3,
  BookOpen,
  Image,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  Settings2,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { canViewAnalyticsTab, type PatientCapabilities } from '@medxforce/shared';
import { cn } from '../lib/utils';

export type CircleMainTab =
  | 'dashboard'
  | 'messages'
  | 'media'
  | 'circle'
  | 'admin'
  | 'analytics'
  | 'diary'
  | 'know';

export interface CircleNavItem {
  id: CircleMainTab;
  label: string;
  icon: LucideIcon;
  description?: string;
}

export interface CircleBottomNavBadges {
  messages?: number;
  circle?: number;
  more?: number;
}

interface CircleBottomNavProps {
  primaryItems: CircleNavItem[];
  moreItems: CircleNavItem[];
  activeTab: CircleMainTab;
  onTabChange: (tab: CircleMainTab) => void;
  badges?: CircleBottomNavBadges;
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <span
      className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none flex items-center justify-center tabular-nums pointer-events-none"
      aria-hidden
    >
      {label}
    </span>
  );
}

function badgeCountForTab(tab: CircleMainTab, badges?: CircleBottomNavBadges): number {
  if (!badges) return 0;
  if (tab === 'messages') return badges.messages ?? 0;
  if (tab === 'circle') return badges.circle ?? 0;
  return 0;
}

export function CircleBottomNav({
  primaryItems,
  moreItems,
  activeTab,
  onTabChange,
  badges,
}: CircleBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const barItems = [...primaryItems];
  const hasMore = moreItems.length > 0;
  const compact = barItems.length + (hasMore ? 1 : 0) >= 6;
  const moreActive = moreItems.some((item) => item.id === activeTab);

  if (barItems.length === 0 && !hasMore) return null;

  const selectTab = (tab: CircleMainTab) => {
    setMoreOpen(false);
    onTabChange(tab);
  };

  return (
    <>
      <nav
        className="shrink-0 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-sm pb-[max(0.125rem,env(safe-area-inset-bottom))]"
        aria-label="Bottom navigation"
      >
        <div className="flex items-center justify-around px-0.5 py-0.5">
          {barItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 min-h-[40px] transition-colors min-w-0',
                  active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600',
                )}
              >
                <span className="relative inline-flex">
                  <Icon size={compact ? 15 : 16} strokeWidth={active ? 2.25 : 1.75} />
                  <NavBadge count={badgeCountForTab(item.id, badges)} />
                </span>
                <span
                  className={cn(
                    'font-bold uppercase tracking-wide leading-none truncate w-full text-center mt-0.5',
                    compact ? 'text-[7px]' : 'text-[8px]',
                    active ? 'text-blue-600' : 'text-slate-400',
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {hasMore && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 min-h-[40px] transition-colors min-w-0',
                moreActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600',
              )}
            >
              <span className="relative inline-flex">
                <MoreHorizontal size={compact ? 15 : 16} strokeWidth={moreActive ? 2.25 : 1.75} />
                <NavBadge
                  count={moreActive || moreOpen ? 0 : (badges?.more ?? 0)}
                />
              </span>
              <span
                className={cn(
                  'font-bold uppercase tracking-wide leading-none truncate w-full text-center mt-0.5',
                  compact ? 'text-[7px]' : 'text-[8px]',
                  moreActive ? 'text-blue-600' : 'text-slate-400',
                )}
              >
                More
              </span>
            </button>
          )}
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="dialog"
            aria-label="More sections"
            className="relative w-full max-w-lg bg-white rounded-t-[28px] border border-slate-100 shadow-2xl px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-4"
          >
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
              More
            </p>
            <div className="grid grid-cols-2 gap-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = item.id === activeTab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectTab(item.id)}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-2xl border text-left transition-colors',
                      active
                        ? 'border-blue-200 bg-blue-50/60'
                        : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white',
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        active ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-500 border border-slate-100',
                      )}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('font-bold text-sm', active ? 'text-blue-700' : 'text-slate-800')}>
                        {item.label}
                      </p>
                      {item.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function primaryNavItemsForPatient(capabilities: PatientCapabilities): CircleNavItem[] {
  const items: CircleNavItem[] = [{ id: 'dashboard', label: 'Home', icon: LayoutDashboard }];

  if (capabilities.messaging) {
    items.push({ id: 'messages', label: 'Messages', icon: MessageSquare });
  }
  if (capabilities.viewCircleMedia || capabilities.richMediaUpload) {
    items.push({ id: 'media', label: 'Media', icon: Image });
  }

  items.push({
    id: 'circle',
    label: 'Circle',
    icon: Users,
  });

  items.push({
    id: 'diary',
    label: 'Diary',
    icon: BookOpen,
  });

  return items;
}

export function moreNavItemsForPatient(capabilities: PatientCapabilities): CircleNavItem[] {
  const items: CircleNavItem[] = [];

  if (capabilities.inviteMembers) {
    items.push({
      id: 'admin',
      label: 'Admin',
      icon: Settings2,
      description: 'Patient management',
    });
  }
  if (canViewAnalyticsTab(capabilities)) {
    items.push({
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'Engagement & care trends',
    });
  }

  items.push({
    id: 'know',
    label: 'Know',
    icon: Sparkles,
    description: 'Learning, community & AI',
  });

  return items;
}

export function allNavItemsForPatient(capabilities: PatientCapabilities): CircleNavItem[] {
  return [...primaryNavItemsForPatient(capabilities), ...moreNavItemsForPatient(capabilities)];
}

/** @deprecated Use primaryNavItemsForPatient + moreNavItemsForPatient */
export function navItemsForPatient(capabilities: PatientCapabilities): CircleNavItem[] {
  return allNavItemsForPatient(capabilities);
}
