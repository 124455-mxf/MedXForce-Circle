/** Shared Analytics metric icons and tile colors (list, overview, detail sheets). */
import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  Brain,
  Calendar,
  Eye,
  Heart,
  HeartPulse,
  MessageSquare,
  Mic,
  Move,
  Scale,
  Sparkles,
  ThermometerSun,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { AnalyticsMetricId } from '@medxforce/shared';

export const ANALYTICS_METRIC_ICONS: Record<AnalyticsMetricId, LucideIcon> = {
  'alert-attention': Bell,
  'speech-history': MessageSquare,
  'ai-conversation': Bot,
  'daily-check-in': Calendar,
  impact: Activity,
  pain: HeartPulse,
  'strength-reflex': Scale,
  mobility: Move,
  numbness: Zap,
  temperature: ThermometerSun,
  balance: Activity,
  vision: Eye,
  speech: Mic,
  neurological: Brain,
  physiological: Activity,
  psychological: Heart,
  stroke: Heart,
  diary: BookOpen,
  'vitality-game': Sparkles,
  'soul-vitality': Heart,
};

const ANALYTICS_METRIC_ICON_WRAP: Partial<Record<AnalyticsMetricId, string>> = {
  pain: 'bg-rose-50 text-rose-600',
  numbness: 'bg-purple-50 text-purple-600',
  mobility: 'bg-emerald-50 text-emerald-600',
  temperature: 'bg-cyan-50 text-cyan-600',
  neurological: 'bg-purple-50 text-purple-600',
  physiological: 'bg-blue-50 text-blue-600',
  psychological: 'bg-pink-50 text-pink-600',
};

const DEFAULT_METRIC_ICON_WRAP = 'bg-blue-50 text-blue-600';

export function analyticsMetricIcon(metricId: AnalyticsMetricId | string): LucideIcon {
  return ANALYTICS_METRIC_ICONS[metricId as AnalyticsMetricId] ?? Activity;
}

export function analyticsMetricIconWrapClass(metricId: AnalyticsMetricId | string): string {
  return ANALYTICS_METRIC_ICON_WRAP[metricId as AnalyticsMetricId] ?? DEFAULT_METRIC_ICON_WRAP;
}

export const ANALYTICS_SHEET_ICON_TILE_CLASS =
  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0';
