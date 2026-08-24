import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import { HeartHandshake, LogOut } from 'lucide-react';
import {
  canInviteMembers,
  leaveCircleForPatient,
  listManagedProxyContacts,
  normalizeInviteEmail,
  parsePatientManagedContacts,
  type CirclePatientSummary,
  type ManagedProxyContact,
} from '@medxforce/shared';
import { CircleLeaveCircleConfirmModal } from './CircleLeaveCircleConfirmModal';
import { useCircleT } from '../lib/circleI18nContext';
import { translateCircleMemberAccessLabel } from '../lib/adminScreenI18n';
import {
  circleAccessOptionLabelKey,
  type CircleAccessOptionId,
} from '../lib/circleContactAccessOptions';

interface CircleSettingsCareRelationshipPanelProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary | null;
  onLeftCircle: () => void | Promise<void>;
}

/** Assignable Circle sign-in roles — same set as User management / invite access options. */
const CARE_RELATIONSHIP_ROLE_OPTIONS: CircleAccessOptionId[] = [
  'proxy_primary',
  'proxy_backup',
  'caregiver',
  'family',
  'friend',
];

function pickContactableProxy(
  proxies: ManagedProxyContact[],
  viewerEmail: string,
): ManagedProxyContact | null {
  const viewer = normalizeInviteEmail(viewerEmail);
  const others = proxies.filter(
    (proxy) => normalizeInviteEmail(proxy.email) !== viewer,
  );
  return (
    others.find((proxy) => proxy.tier === 'primary') ??
    others.find((proxy) => proxy.tier === 'backup') ??
    null
  );
}

export function CircleSettingsCareRelationshipPanel({
  user,
  db,
  patient,
  onLeftCircle,
}: CircleSettingsCareRelationshipPanelProps) {
  const t = useCircleT();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proxies, setProxies] = useState<ManagedProxyContact[]>([]);
  const [proxiesReady, setProxiesReady] = useState(false);

  useEffect(() => {
    if (!patient?.patientId) {
      setProxies([]);
      setProxiesReady(true);
      return;
    }
    setProxiesReady(false);
    const unsub = onSnapshot(
      doc(db, 'patients', patient.patientId),
      (snap) => {
        if (!snap.exists()) {
          setProxies([]);
          setProxiesReady(true);
          return;
        }
        setProxies(
          listManagedProxyContacts(
            parsePatientManagedContacts(snap.data() as Record<string, unknown>),
          ),
        );
        setProxiesReady(true);
      },
      () => {
        setProxies([]);
        setProxiesReady(true);
      },
    );
    return unsub;
  }, [db, patient?.patientId]);

  const handleLeave = async () => {
    if (!patient) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await leaveCircleForPatient(db, {
        uid: user.uid,
        patientId: patient.patientId,
        email: user.email || '',
      });
      if (!ok) {
        setError(t('settings.careRelationshipLeaveFailed'));
        return;
      }
      setConfirmOpen(false);
      await onLeftCircle();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('settings.careRelationshipLeaveFailedGeneric'),
      );
    } finally {
      setBusy(false);
    }
  };

  if (!patient) {
    return (
      <div className="p-5">
        <p className="text-sm text-slate-500 leading-relaxed">
          {t('settings.notificationsNoPatient')}
        </p>
      </div>
    );
  }

  const otherProxy = pickContactableProxy(proxies, user.email || '');
  const otherProxyName = otherProxy?.name.trim() || otherProxy?.email.trim() || '';
  const userManagementHint = t('settings.careRelationshipChangeViaUserManagement', {
    settings: t('drawer.settings'),
    userManagement: t('drawer.userManagement'),
  });
  const roleChangeHint = canInviteMembers(patient.capabilities)
    ? userManagementHint
    : !proxiesReady
      ? null
      : patient.role === 'proxy' && !otherProxy
        ? userManagementHint
        : otherProxyName
          ? t('settings.careRelationshipChangeContactNamed', { name: otherProxyName })
          : t('settings.careRelationshipChangeContactGeneric');

  return (
    <>
      <div className="space-y-6 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
            {patient.photoUrl ? (
              <img src={patient.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <HeartHandshake size={22} />
            )}
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="font-bold text-slate-800">{t('drawer.careRelationship')}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {t('settings.careRelationshipPanelSubtitle')}
            </p>
          </div>
        </div>

        <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
          <div>
            <p className="font-bold text-slate-800">{patient.displayName}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              {t('settings.careRelationshipYourRole')}
            </p>
            <p className="text-sm font-semibold text-slate-700">
              {translateCircleMemberAccessLabel(t, patient.role, patient.proxyTier)}
            </p>
          </div>
        </div>

        <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              {t('settings.careRelationshipRolesTitle')}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('settings.careRelationshipRolesIntro')}
            </p>
          </div>
          <ul className="space-y-1.5">
            {CARE_RELATIONSHIP_ROLE_OPTIONS.map((option) => (
              <li
                key={option}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" aria-hidden />
                {t(circleAccessOptionLabelKey(option))}
              </li>
            ))}
          </ul>
          {roleChangeHint && (
            <p className="text-xs text-slate-500 leading-relaxed">{roleChangeHint}</p>
          )}
        </div>

        <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('settings.careRelationshipLeaveHint')}
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-red-600 bg-white border border-red-100 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <LogOut size={18} />
            {t('settings.careRelationshipLeaveButton')}
          </button>
        </div>
      </div>

      <CircleLeaveCircleConfirmModal
        open={confirmOpen}
        patientName={patient.displayName}
        busy={busy}
        onCancel={() => {
          if (!busy) setConfirmOpen(false);
        }}
        onConfirm={() => void handleLeave()}
      />
    </>
  );
}
