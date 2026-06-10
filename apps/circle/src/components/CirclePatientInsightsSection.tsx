import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  Cake,
  ChevronDown,
  ChevronRight,
  Flag,
  Heart,
  Languages,
  PartyPopper,
  Sparkles,
  Stethoscope,
  Target,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  buildPatientInsightItems,
  buildPreviewBirthdayReminder,
  buildPreviewOnsetMilestoneFiveYear,
  buildPreviewOnsetMilestoneOneYear,
  countFilledPatientInsights,
  isPatientInsightsPreviewRemindersEnabled,
  resolveBirthdayReminder,
  resolveOnsetMilestone,
  type CirclePatientInsightItem,
  type CirclePatientInsightKey,
} from '@medxforce/shared';
import type { CirclePatientProfileSnapshot } from '@medxforce/shared';
import type { CirclePatientSummary } from '@medxforce/shared';
import { cn } from '../lib/utils';

function patientFirstName(
  snapshot: CirclePatientProfileSnapshot | null,
  displayName: string,
): string {
  const fromSnapshot = snapshot?.identity.firstName?.trim();
  if (fromSnapshot) return fromSnapshot;
  const first = displayName.trim().split(/\s+/)[0];
  return first || 'them';
}

type CirclePatientInsightsSectionProps = {
  patient: CirclePatientSummary;
  snapshot: CirclePatientProfileSnapshot | null;
  loading?: boolean;
  onOpenProfile?: () => void;
};

const INSIGHT_ICONS: Record<CirclePatientInsightKey, LucideIcon> = {
  activeHobbies: Sparkles,
  passiveHobbies: Heart,
  topicTriggers: AlertTriangle,
  languagesSpoken: Languages,
  personalGoals: Target,
  socialAnchors: Users,
  primaryDiagnosis: Stethoscope,
  dateOfOnset: Flag,
  occupation: Briefcase,
  treatmentPhase: Stethoscope,
};

function CelebrationCard({
  tone,
  icon: Icon,
  headline,
  body,
  onOpenProfile,
  isPreview = false,
}: {
  tone: 'birthday' | 'milestone';
  icon: LucideIcon;
  headline: string;
  body: string;
  onOpenProfile?: () => void;
  isPreview?: boolean;
}) {
  const Wrapper = onOpenProfile && !isPreview ? 'button' : 'div';

  return (
    <Wrapper
      type={onOpenProfile && !isPreview ? 'button' : undefined}
      onClick={onOpenProfile && !isPreview ? onOpenProfile : undefined}
      className={cn(
        'w-full h-full text-left p-3 sm:p-4 rounded-2xl border shadow-sm transition-colors relative',
        tone === 'birthday'
          ? 'bg-gradient-to-r from-violet-50 via-pink-50 to-amber-50 border-violet-200 hover:border-violet-300'
          : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200 hover:border-emerald-300',
        onOpenProfile && !isPreview && 'hover:shadow-md',
      )}
    >
      {isPreview ? (
        <span className="absolute top-3 right-3 inline-flex rounded-full bg-slate-900/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Preview
        </span>
      ) : null}
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
            tone === 'birthday' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700',
          )}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-800 text-xs sm:text-sm leading-snug line-clamp-2">
            {headline}
          </p>
          <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-snug line-clamp-2">
            {body}
          </p>
        </div>
        {onOpenProfile && !isPreview ? (
          <ChevronRight size={18} className="text-slate-400 shrink-0 mt-1" />
        ) : null}
      </div>
    </Wrapper>
  );
}

function InsightCard({
  item,
  onOpenProfile,
}: {
  item: CirclePatientInsightItem;
  onOpenProfile?: () => void;
}) {
  const Icon = INSIGHT_ICONS[item.key];
  const Wrapper = onOpenProfile ? 'button' : 'div';

  return (
    <Wrapper
      type={onOpenProfile ? 'button' : undefined}
      onClick={onOpenProfile}
      className={cn(
        'relative h-full min-h-[5.75rem] w-full text-left p-4 rounded-2xl border transition-colors flex flex-col',
        item.filled
          ? 'bg-white border-slate-100 hover:border-blue-200 hover:bg-blue-50/20'
          : 'bg-slate-50/80 border-dashed border-slate-200 hover:border-slate-300',
        onOpenProfile && 'cursor-pointer',
      )}
    >
      {item.overflowCount && item.overflowCount > 0 ? (
        <span className="absolute top-3 right-3 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-500">
          {item.totalCount} total
        </span>
      ) : null}
      <div className="flex items-start gap-2.5">
        <Icon
          size={18}
          className={cn('shrink-0 mt-0.5', item.filled ? 'text-blue-600' : 'text-slate-400')}
        />
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {item.label}
          </p>
          <p
            className={cn(
              'text-sm mt-1 leading-snug line-clamp-2',
              item.filled ? 'text-slate-800 font-medium' : 'text-slate-400 italic',
            )}
            title={item.filled ? item.value : undefined}
          >
            {item.filled ? item.value : 'Not added yet'}
          </p>
          {!item.filled && item.hint ? (
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
              {item.hint}
            </p>
          ) : null}
          {item.filled && item.overflowCount && item.overflowCount > 0 && onOpenProfile ? (
            <p className="text-[11px] font-semibold text-blue-600 mt-1.5">View all in profile</p>
          ) : null}
        </div>
      </div>
    </Wrapper>
  );
}

export function CirclePatientInsightsSection({
  patient,
  snapshot,
  loading = false,
  onOpenProfile,
}: CirclePatientInsightsSectionProps) {
  const previewReminders = useMemo(() => isPatientInsightsPreviewRemindersEnabled(), []);
  const [expanded, setExpanded] = useState(previewReminders);

  if (loading) {
    return (
      <section className="space-y-2">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">
          Get to know…
        </h3>
        <div className="p-5 rounded-2xl border border-slate-100 bg-white text-sm text-slate-400">
          Loading patient insights…
        </div>
      </section>
    );
  }

  const items = buildPatientInsightItems(snapshot, patient.role);
  if (items.length === 0) return null;

  const birthday = resolveBirthdayReminder(snapshot, patient.displayName);
  const onsetMilestone = resolveOnsetMilestone(snapshot);
  const counts = countFilledPatientInsights(items);
  const firstName = patientFirstName(snapshot, patient.displayName);
  const sectionTitle = `Get to know ${firstName}`;

  const previewBirthday = previewReminders ? buildPreviewBirthdayReminder(firstName) : null;
  const previewOnsetFiveYear = previewReminders ? buildPreviewOnsetMilestoneFiveYear() : null;
  const previewOnsetOneYear = previewReminders ? buildPreviewOnsetMilestoneOneYear() : null;

  const hasReminder = !!(birthday || onsetMilestone || previewReminders);

  const collapsedHint = birthday
    ? birthday.headline
    : onsetMilestone
      ? onsetMilestone.headline
      : previewReminders
        ? previewBirthday?.headline ?? 'Preview: birthday & onset reminders'
        : `${counts.filled}/${counts.total} insights available`;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50/80 transition-colors"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-800 leading-snug">{sectionTitle}</h3>
          <p className="text-xs font-medium text-slate-500 mt-1 leading-snug">{collapsedHint}</p>
          {!expanded ? (
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Tap to view hobbies, goals, diagnosis, and more
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasReminder && !expanded ? (
            <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
              Reminder
            </span>
          ) : null}
          <ChevronDown
            size={18}
            className={cn(
              'text-slate-400 transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
          {previewReminders ? (
            <p className="text-[11px] text-violet-700 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 leading-relaxed">
              Preview mode — sample birthday and onset tiles. Remove{' '}
              <span className="font-semibold">?previewReminders=1</span> from the URL when done.
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              {counts.filled}/{counts.total} insights available
            </p>
            {onOpenProfile ? (
              <button
                type="button"
                onClick={onOpenProfile}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 shrink-0"
              >
                Full profile
              </button>
            ) : null}
          </div>

          {(birthday ||
            previewBirthday ||
            onsetMilestone ||
            previewOnsetFiveYear ||
            previewOnsetOneYear) ? (
            <div className="grid grid-cols-2 gap-3">
              {birthday ? (
                <div className="h-[10rem] sm:h-[10.5rem]">
                  <CelebrationCard
                    tone="birthday"
                    icon={birthday.daysUntil >= 0 && birthday.daysUntil <= 1 ? PartyPopper : Cake}
                    headline={birthday.headline}
                    body={birthday.body}
                    onOpenProfile={onOpenProfile}
                  />
                </div>
              ) : null}

              {previewBirthday ? (
                <div className="h-[10rem] sm:h-[10.5rem]">
                  <CelebrationCard
                    tone="birthday"
                    icon={Cake}
                    headline={previewBirthday.headline}
                    body={previewBirthday.body}
                    isPreview
                  />
                </div>
              ) : null}

              {onsetMilestone ? (
                <div className="h-[10rem] sm:h-[10.5rem]">
                  <CelebrationCard
                    tone="milestone"
                    icon={Flag}
                    headline={onsetMilestone.headline}
                    body={onsetMilestone.body}
                    onOpenProfile={onOpenProfile}
                  />
                </div>
              ) : null}

              {previewOnsetFiveYear ? (
                <div className="h-[10rem] sm:h-[10.5rem]">
                  <CelebrationCard
                    tone="milestone"
                    icon={Flag}
                    headline={previewOnsetFiveYear.headline}
                    body={previewOnsetFiveYear.body}
                    isPreview
                  />
                </div>
              ) : null}

              {previewOnsetOneYear ? (
                <div className="h-[10rem] sm:h-[10.5rem]">
                  <CelebrationCard
                    tone="milestone"
                    icon={Flag}
                    headline={previewOnsetOneYear.headline}
                    body={previewOnsetOneYear.body}
                    isPreview
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item) => (
              <InsightCard key={item.key} item={item} onOpenProfile={onOpenProfile} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
