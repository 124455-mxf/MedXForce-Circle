import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { CircleMemberRole } from '@medxforce/shared';
import { isCircleAiAssistAvailable } from '../lib/circleAiAssist';
import { CircleAiGuidanceModal } from './CircleAiGuidanceModal';

type CircleAiGuidancePanelProps = {
  threadLabel: string;
  memberRole: CircleMemberRole;
  recentContext?: string;
};

/** Compact entry point in the composer — full Q&A opens in a modal. */
export function CircleAiGuidancePanel({
  threadLabel,
  memberRole,
  recentContext,
}: CircleAiGuidancePanelProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!isCircleAiAssistAvailable()) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-violet-100 bg-violet-50/50 text-left hover:bg-violet-50 hover:border-violet-200 transition-colors"
      >
        <Sparkles size={16} className="text-violet-600 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold text-violet-700">Private AI guidance</span>
          <span className="block text-[10px] text-violet-600/90 mt-0.5">
            Ask a question — opens in full screen, not posted to the thread
          </span>
        </span>
      </button>

      <CircleAiGuidanceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        threadLabel={threadLabel}
        memberRole={memberRole}
        recentContext={recentContext}
      />
    </>
  );
}
