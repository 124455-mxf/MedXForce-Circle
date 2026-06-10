import type { User } from 'firebase/auth';
import { HeartHandshake } from 'lucide-react';
import type { CirclePatientSummary } from '@medxforce/shared';
import { cn } from '../lib/utils';
import { MedXForceBrandLogo } from './MedXForceBrandLogo';
import { PatientOnlineIndicator } from './PatientOnlineIndicator';
import { PatientPresenceCaption } from './PatientPresenceCaption';

export type CircleAppHeaderVariant = 'comfortable' | 'compact';

const HEADER_SHELL_CLASS = 'shrink-0 flex items-start gap-2.5 min-w-0 mb-1';
const LOGO_BOX_CLASS =
  'bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0 w-11 h-11';
const TITLE_CLASS = 'font-bold text-slate-800 leading-tight text-xl truncate';

type CircleAppHeaderProps = {
  variant: CircleAppHeaderVariant;
  user: User;
  accountPhotoUrl?: string;
  onOpenProfile: () => void;
  selectedPatient: CirclePatientSummary;
  patientOnline?: boolean;
  patientLastSeen?: number;
  onOpenPatientSwitcher?: () => void;
};

function CircleYouButton({
  user,
  accountPhotoUrl,
  onOpenProfile,
}: {
  user: User;
  accountPhotoUrl?: string;
  onOpenProfile: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpenProfile}
      className="flex flex-col items-center shrink-0 gap-0.5 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 rounded-full"
      title="Your account"
    >
      <span className="rounded-full bg-blue-100 border-2 border-blue-200 overflow-hidden flex items-center justify-center w-11 h-11">
        {accountPhotoUrl ? (
          <img src={accountPhotoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-bold text-blue-700 text-sm">
            {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-none">
        You
      </span>
    </button>
  );
}

function CirclePatientAvatar({
  patient,
  onClick,
}: {
  patient: CirclePatientSummary;
  onClick?: () => void;
}) {
  const className =
    'w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden';

  const content = patient.photoUrl ? (
    <img src={patient.photoUrl} alt="" className="w-full h-full object-cover" />
  ) : (
    <HeartHandshake size={20} className="text-blue-600" />
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(className, 'outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20')}
        title="Switch patient"
        aria-label="Switch patient"
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className} aria-hidden>
      {content}
    </div>
  );
}

function CircleBrandLogoTile() {
  return (
    <div className={LOGO_BOX_CLASS}>
      <MedXForceBrandLogo />
    </div>
  );
}

export function CircleAppHeader({
  variant,
  user,
  accountPhotoUrl,
  onOpenProfile,
  selectedPatient,
  patientOnline = false,
  patientLastSeen = 0,
  onOpenPatientSwitcher,
}: CircleAppHeaderProps) {
  const compact = variant === 'compact';

  return (
    <header className={HEADER_SHELL_CLASS}>
      <CircleBrandLogoTile />

      <div className="min-w-0 flex-1 pt-0.5">
        {compact ? (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className={TITLE_CLASS}>{selectedPatient.displayName}</h1>
              <PatientOnlineIndicator online={patientOnline} showWhenOffline />
            </div>
            <PatientPresenceCaption
              online={patientOnline}
              lastSeen={patientLastSeen}
              variant="header"
              className="mt-0.5"
            />
          </>
        ) : (
          <>
            <h1 className={TITLE_CLASS}>MedXForce Circle</h1>
            <p className="text-xs text-slate-500 truncate mt-0.5 leading-normal">Friends &amp; family</p>
          </>
        )}
      </div>

      {compact ? (
        <CirclePatientAvatar patient={selectedPatient} onClick={onOpenPatientSwitcher} />
      ) : (
        <CircleYouButton
          user={user}
          accountPhotoUrl={accountPhotoUrl}
          onOpenProfile={onOpenProfile}
        />
      )}
    </header>
  );
}
