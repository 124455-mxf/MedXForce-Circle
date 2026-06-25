import { useMemo, useState } from 'react';
import type { DailyCheckInAnswerTrendPoint } from '@medxforce/shared';
import { normalizeMemberRole, type CircleMemberRole } from '@medxforce/shared';
import { useCircleT } from '../lib/circleI18nContext';
import {
  buildCheckInWellnessAnimationFramesFromTrend,
  buildCheckInWellnessPreviewFrames,
  getCheckInWellnessAveragesFromTrend,
} from '../lib/circleCheckInWellnessMetrics';
import {
  CircleDashboardCheckInWellnessModal,
} from './CircleDashboardCheckInWellness';
import { CircleDashboardCheckInWellnessTile } from './CircleDashboardCheckInWellnessTile';

type CircleDashboardCheckInWellnessSectionProps = {
  memberRole: CircleMemberRole;
  answerTrend?: DailyCheckInAnswerTrendPoint[];
  enabled: boolean;
  preview?: boolean;
  onOpenDetails?: () => void;
};

export function CircleDashboardCheckInWellnessSection({
  memberRole,
  answerTrend,
  enabled,
  preview = false,
  onOpenDetails,
}: CircleDashboardCheckInWellnessSectionProps) {
  const t = useCircleT();
  const [open, setOpen] = useState(false);
  const role = normalizeMemberRole(memberRole);
  const active = enabled && role !== 'friend';
  const windowDays = 30;

  const averages = useMemo(() => {
    if (preview) {
      return {
        mood: 2.2,
        pain: 5.5,
        sleep: 1.9,
        moodSamples: 4,
        painSamples: 4,
        sleepSamples: 4,
        windowDays,
      };
    }
    return getCheckInWellnessAveragesFromTrend(answerTrend, windowDays);
  }, [answerTrend, preview]);

  const frames = useMemo(() => {
    if (preview) return buildCheckInWellnessPreviewFrames();
    return buildCheckInWellnessAnimationFramesFromTrend(answerTrend, windowDays);
  }, [answerTrend, preview]);

  if (!active) return null;

  return (
    <>
      <div className="h-[13rem] sm:h-[14rem]">
        <CircleDashboardCheckInWellnessTile
          averages={averages}
          frames={frames}
          onOpenModal={() => setOpen(true)}
          onOpenDetails={onOpenDetails}
          t={t}
        />
      </div>

      <CircleDashboardCheckInWellnessModal
        isOpen={open}
        onClose={() => setOpen(false)}
        averages={averages}
        frames={frames}
        onOpenDetails={onOpenDetails}
        t={t}
      />
    </>
  );
}
