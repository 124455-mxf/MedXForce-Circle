import { MessageCircle } from 'lucide-react';
import { useCircleT } from '../lib/circleI18nContext';

type CircleDropInPatientRequestBannerProps = {
  patientName: string;
  onAccept: () => void;
  onDecline: () => void;
  busy?: boolean;
};

export function CircleDropInPatientRequestBanner({
  patientName,
  onAccept,
  onDecline,
  busy = false,
}: CircleDropInPatientRequestBannerProps) {
  const t = useCircleT();

  return (
    <div className="fixed top-4 left-4 right-4 z-[9998] mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 shadow-lg shadow-emerald-900/10 p-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <MessageCircle size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-emerald-950">{t('remotePromptsModal.dropInPatientRequestTitle')}</p>
          <p className="text-sm text-emerald-900/80 mt-1">
            {t('remotePromptsModal.dropInPatientRequestBody', { name: patientName })}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={onAccept}
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
            >
              {t('remotePromptsModal.dropInPatientRequestAccept')}
            </button>
            <button
              type="button"
              onClick={onDecline}
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-900 text-sm font-bold hover:bg-emerald-100/60 disabled:opacity-50"
            >
              {t('remotePromptsModal.notNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
