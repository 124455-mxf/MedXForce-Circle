import {
  BarChart3,
  Calendar,
  Image,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  ScrollText,
  Settings2,
  Sparkles,
  SlidersHorizontal,
  TestTube2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  canViewAnalyticsTab,
  canViewRemoteSettingsTab,
  normalizeMemberRole,
  type CircleMemberRole,
  type PatientCapabilities,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { CircleNavBadge } from './CircleCountBadge';
import { useCircleT } from '../lib/circleI18nContext';
import type { CircleTranslator } from '../lib/circleI18nContext';

export type CircleMainTab =
  | 'dashboard'
  | 'messages'
  | 'schedule'
  | 'media'
  | 'circle'
  | 'admin'
  | 'analytics'
  | 'diary'
  | 'know'
  | 'medxforce-lab'
  | 'remote-settings';

export type CircleMoreSection = 'default' | 'medxforceLab';

export interface CircleNavItem {
  id: CircleMainTab;
  label: string;
  icon: LucideIcon;
  description?: string;
  moreSection?: CircleMoreSection;
}

export interface CircleBottomNavBadges {
  messages?: number;
  circle?: number;
  schedule?: number;
  more?: number;
}

export type CircleBottomNavUrgencyKind = 'alert' | 'attention';

interface CircleBottomNavProps {
  primaryItems: CircleNavItem[];
  moreItems: CircleNavItem[];
  activeTab: CircleMainTab;
  onTabChange: (tab: CircleMainTab) => void;
  badges?: CircleBottomNavBadges;
  /** Pulsating Messages tab + bar tint for fresh alert/attention (first 2 minutes). */
  messagesUrgency?: CircleBottomNavUrgencyKind | null;
  pulseNavForUrgency?: boolean;
  className?: string;
}

function NavIconSlot({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center">
      {children}
    </span>
  );
}

function badgeCountForTab(tab: CircleMainTab, badges?: CircleBottomNavBadges): number {
  if (!badges) return 0;
  if (tab === 'messages') return badges.messages ?? 0;
  if (tab === 'circle') return badges.circle ?? 0;
  if (tab === 'schedule') return badges.schedule ?? 0;
  return 0;
}

export function CircleBottomNav({
  primaryItems,
  moreItems,
  activeTab,
  onTabChange,
  badges,
  messagesUrgency = null,
  pulseNavForUrgency = false,
  className,
}: CircleBottomNavProps) {
  const t = useCircleT();
  const [moreOpen, setMoreOpen] = useState(false);
  const barItems = [...primaryItems];
  const hasMore = moreItems.length > 0;
  const compact = barItems.length + (hasMore ? 1 : 0) >= 6;
  const moreActive = moreItems.some((item) => item.id === activeTab);
  const defaultMoreItems = moreItems.filter((item) => item.moreSection !== 'medxforceLab');
  const labMoreItems = moreItems.filter((item) => item.moreSection === 'medxforceLab');

  if (barItems.length === 0 && !hasMore) return null;

  const selectTab = (tab: CircleMainTab) => {
    setMoreOpen(false);
    onTabChange(tab);
  };

  const navUrgencyClass =
    pulseNavForUrgency && messagesUrgency === 'alert'
      ? 'circle-urgency-nav-alert border-red-200'
      : pulseNavForUrgency && messagesUrgency === 'attention'
        ? 'circle-urgency-nav-attention border-blue-200'
        : '';

  return (
    <>
      <nav
        className={cn(
          'shrink-0 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-sm pb-[max(0.125rem,env(safe-area-inset-bottom))]',
          navUrgencyClass,
          className,
        )}
        aria-label={t('common.bottomNav')}
      >
        <div className="flex items-center justify-around px-0.5 py-0.5">
          {barItems.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeTab;
            const showMessagesUrgency = item.id === 'messages' && messagesUrgency && pulseNavForUrgency;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-0.5 min-h-[40px] min-w-0 transition-all duration-200',
                  active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : showMessagesUrgency
                      ? messagesUrgency === 'alert'
                        ? 'text-red-700 hover:bg-red-50/50'
                        : 'text-sky-700 hover:bg-sky-50/50'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-600',
                )}
              >
                <NavIconSlot>
                  <span
                    className={cn(
                      'inline-flex items-center justify-center rounded-full p-0.5',
                      showMessagesUrgency &&
                        !active &&
                        (messagesUrgency === 'alert'
                          ? 'circle-urgency-nav-icon-alert'
                          : 'circle-urgency-nav-icon-attention'),
                    )}
                  >
                    <Icon size={compact ? 18 : 19} strokeWidth={active ? 2.25 : 1.75} />
                  </span>
                  <CircleNavBadge
                    count={badgeCountForTab(item.id, badges)}
                    onActive={active}
                  />
                </NavIconSlot>
                <span
                  className={cn(
                    'font-bold uppercase tracking-wide leading-none truncate w-full text-center',
                    compact ? 'text-[8px]' : 'text-[9px]',
                    active
                      ? 'text-white'
                      : showMessagesUrgency
                        ? messagesUrgency === 'alert'
                          ? 'text-red-600'
                          : 'text-sky-600'
                        : 'text-slate-400',
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
                'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-0.5 min-h-[40px] min-w-0 transition-all duration-200',
                moreActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-600',
              )}
            >
              <NavIconSlot>
                <MoreHorizontal size={compact ? 18 : 19} strokeWidth={moreActive ? 2.25 : 1.75} />
                <CircleNavBadge count={moreOpen ? 0 : (badges?.more ?? 0)} />
              </NavIconSlot>
              <span
                className={cn(
                  'font-bold uppercase tracking-wide leading-none truncate w-full text-center',
                  compact ? 'text-[8px]' : 'text-[9px]',
                  moreActive ? 'text-white' : 'text-slate-400',
                )}
              >
                {t('nav.more')}
              </span>
            </button>
          )}
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center">
          <button
            type="button"
            aria-label={t('common.closeMenu')}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="dialog"
            aria-label={t('common.moreSections')}
            className="relative w-full max-w-lg bg-white rounded-t-[28px] border border-slate-100 shadow-2xl px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-4"
          >
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
              {t('nav.more')}
            </p>
            {defaultMoreItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {defaultMoreItems.map((item) => {
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
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200',
                          active
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                            : 'bg-white text-slate-500 border border-slate-100',
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
            ) : null}
            {labMoreItems.length > 0 ? (
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  {t('nav.medxforceLabSection')}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {labMoreItems.map((item) => {
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
                            ? 'border-fuchsia-200 bg-fuchsia-50/60'
                            : 'border-slate-100 bg-gradient-to-r from-fuchsia-50/40 via-violet-50/30 to-white hover:border-fuchsia-100 hover:bg-white',
                        )}
                      >
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200',
                            active
                              ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-200'
                              : 'bg-white text-fuchsia-600 border border-fuchsia-100',
                          )}
                        >
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className={cn('font-bold text-sm', active ? 'text-fuchsia-700' : 'text-slate-800')}>
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
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

export type CircleNavBuildOptions = {
  memberRole?: CircleMemberRole;
  healthAssessmentsEnabled?: boolean;
};

export function primaryNavItemsForPatient(
  capabilities: PatientCapabilities,
  options: CircleNavBuildOptions = {},
): CircleNavItem[] {
  const memberRole = options.memberRole ? normalizeMemberRole(options.memberRole) : undefined;
  const showSchedule =
    memberRole !== 'friend' && options.healthAssessmentsEnabled !== false;

  const items: CircleNavItem[] = [{ id: 'dashboard', label: 'Home', icon: LayoutDashboard }];

  if (capabilities.messaging) {
    items.push({ id: 'messages', label: 'Messages', icon: MessageSquare });
  }

  if (showSchedule) {
    items.push({ id: 'schedule', label: 'Schedule', icon: Calendar });
  }

  items.push({
    id: 'diary',
    label: 'Diary',
    icon: ScrollText,
  });

  items.push({
    id: 'circle',
    label: 'Circle',
    icon: Users,
  });

  return items;
}

export function moreNavItemsForPatient(capabilities: PatientCapabilities): CircleNavItem[] {
  const items: CircleNavItem[] = [];

  if (capabilities.viewCircleMedia || capabilities.richMediaUpload) {
    items.push({
      id: 'media',
      label: 'Media',
      icon: Image,
      description: 'Photos & gallery',
    });
  }

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
  if (canViewRemoteSettingsTab(capabilities)) {
    items.push({
      id: 'remote-settings',
      label: 'Remote Settings',
      icon: SlidersHorizontal,
      description: 'Configure patient tablet',
    });
  }

  items.push({
    id: 'know',
    label: 'Know',
    icon: Sparkles,
    description: 'Learning, community & AI',
  });

  items.push({
    id: 'medxforce-lab',
    label: 'MedXForce Lab',
    icon: TestTube2,
    description: 'AI media, voice, avatar & games',
    moreSection: 'medxforceLab',
  });

  return items;
}

export function allNavItemsForPatient(
  capabilities: PatientCapabilities,
  options: CircleNavBuildOptions = {},
): CircleNavItem[] {
  return [...primaryNavItemsForPatient(capabilities, options), ...moreNavItemsForPatient(capabilities)];
}

/** @deprecated Use primaryNavItemsForPatient + moreNavItemsForPatient */
export function navItemsForPatient(
  capabilities: PatientCapabilities,
  options: CircleNavBuildOptions = {},
): CircleNavItem[] {
  return allNavItemsForPatient(capabilities, options);
}

const NAV_LABEL_KEYS: Record<CircleMainTab, string> = {
  dashboard: 'nav.home',
  messages: 'nav.messages',
  schedule: 'nav.schedule',
  media: 'nav.media',
  circle: 'nav.circle',
  diary: 'nav.diary',
  admin: 'nav.admin',
  analytics: 'nav.analytics',
  'remote-settings': 'nav.remoteSettings',
  know: 'nav.know',
  'medxforce-lab': 'nav.medxforceLab',
};

const NAV_DESC_KEYS: Partial<Record<CircleMainTab, string>> = {
  media: 'nav.mediaDesc',
  admin: 'nav.adminDesc',
  analytics: 'nav.analyticsDesc',
  'remote-settings': 'nav.remoteSettingsDesc',
  know: 'nav.knowDesc',
  'medxforce-lab': 'nav.medxforceLabDesc',
};

export function localizeNavItems(items: CircleNavItem[], t: CircleTranslator): CircleNavItem[] {
  return items.map((item) => ({
    ...item,
    label: t(NAV_LABEL_KEYS[item.id]),
    description: NAV_DESC_KEYS[item.id] ? t(NAV_DESC_KEYS[item.id]!) : item.description,
  }));
}
