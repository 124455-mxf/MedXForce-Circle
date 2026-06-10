import { AlertCircle, Bell } from 'lucide-react';

export type CircleNotifyTurnOffKey = 'alert' | 'attention';

type CircleNotifyTurnOffConfirmModalProps = {
  open: boolean;
  notifyKey: CircleNotifyTurnOffKey;
  patientDisplayName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
};

const COPY: Record<
  CircleNotifyTurnOffKey,
  { title: string; body: string; icon: typeof Bell; iconWrap: string; confirmClass: string }
> = {
  alert: {
    title: 'Turn off Alert notifications?',
    body: 'You will no longer be notified when urgent alerts are sent. Turn this back on anytime if you want to receive them again.',
    icon: Bell,
    iconWrap: 'bg-red-50 text-red-500',
    confirmClass: 'bg-red-600 hover:bg-red-700 shadow-red-200',
  },
  attention: {
    title: 'Turn off Attention notifications?',
    body: 'You will no longer be notified when attention is needed. Turn this back on anytime if you want to receive them again.',
    icon: AlertCircle,
    iconWrap: 'bg-orange-50 text-orange-500',
    confirmClass: 'bg-orange-600 hover:bg-orange-700 shadow-orange-200',
  },
};

export function CircleNotifyTurnOffConfirmModal({
  open,
  notifyKey,
  patientDisplayName,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: CircleNotifyTurnOffConfirmModalProps) {
  if (!open) return null;

  const config = COPY[notifyKey];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-lg w-full space-y-6 border border-slate-100">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${config.iconWrap}`}
        >
          <Icon size={32} />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-slate-900">{config.title}</h3>
          <p className="text-slate-600 leading-relaxed text-sm">{config.body}</p>
          <p className="text-sm text-slate-500">
            Patient:{' '}
            <span className="font-bold text-red-600">{patientDisplayName}</span>
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            Keep on
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`flex-1 py-4 text-white rounded-2xl font-bold transition-all shadow-lg disabled:opacity-50 ${config.confirmClass}`}
          >
            {isSubmitting ? 'Saving…' : 'Turn off'}
          </button>
        </div>
      </div>
    </div>
  );
}
