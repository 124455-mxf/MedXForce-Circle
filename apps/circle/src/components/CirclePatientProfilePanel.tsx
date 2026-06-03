import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { ClipboardList, Loader2, UserRound } from 'lucide-react';
import {
  displayProfileName,
  parseCircleProfileMeta,
  parseCircleProfileSnapshot,
  updateCirclePatientProfileFromProxy,
  type CirclePatientProfileSnapshot,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { CirclePatientProfileEditorModal } from './CirclePatientProfileEditorModal';
import { CirclePatientProfileReview } from './CirclePatientProfileReview';
import { isFirestoreQuotaError, pauseFirestoreBackgroundWrites } from '../lib/firestoreQuota';

type EditableSection = 'identity' | 'engagement' | 'lifestyle';

interface CirclePatientProfilePanelProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
  /** Admin embed: hide section icon/title (shown on collapsible summary instead). */
  compact?: boolean;
}

export function CirclePatientProfilePanel({
  user,
  db,
  patient,
  compact = false,
}: CirclePatientProfilePanelProps) {
  const [snapshot, setSnapshot] = useState<CirclePatientProfileSnapshot | null>(null);
  const [metaSummary, setMetaSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editSection, setEditSection] = useState<EditableSection | null>(null);

  const canEdit = !!patient.capabilities.remoteSettings;
  const showClinical = !!patient.capabilities.viewClinicalData;

  useEffect(() => {
    setLoading(true);
    return onSnapshot(
      doc(db, 'patients', patient.patientId),
      (snap) => {
        if (!snap.exists()) {
          setSnapshot(null);
          setMetaSummary(null);
          setLoading(false);
          return;
        }
        const data = snap.data();
        setSnapshot(parseCircleProfileSnapshot(data.profileSnapshot));
        setMetaSummary(parseCircleProfileMeta(data.profileMeta)?.summary || null);
        setLoading(false);
      },
      (err) => {
        console.warn('[CirclePatientProfilePanel]', err);
        setError('Could not load patient profile.');
        setLoading(false);
      },
    );
  }, [db, patient.patientId]);

  const handleSaveSection = useCallback(
    async (next: CirclePatientProfileSnapshot) => {
      setSaving(true);
      setError(null);
      try {
        await updateCirclePatientProfileFromProxy(
          db,
          patient.patientId,
          next,
          user.uid,
          patient.displayName,
        );
        setEditSection(null);
      } catch (err) {
        console.warn('[CirclePatientProfilePanel] save', err);
        if (isFirestoreQuotaError(err)) {
          pauseFirestoreBackgroundWrites(String(err));
          setError('Firestore daily write limit reached. Try again after midnight Pacific.');
        } else {
          setError('Could not save profile changes.');
        }
      } finally {
        setSaving(false);
      }
    },
    [db, patient.displayName, patient.patientId, user.uid],
  );

  const handleEditSection = (sectionId: string) => {
    if (!canEdit || !snapshot) return;
    if (sectionId === 'identity' || sectionId === 'engagement' || sectionId === 'lifestyle') {
      setEditSection(sectionId);
    }
  };

  return (
    <div className={compact ? 'p-4 space-y-4' : 'space-y-4'}>
      {!compact && (
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <UserRound size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-800">Patient profile</h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Read-only for circle members. Proxies with remote settings can edit selected sections.
            </p>
          </div>
        </div>
      )}

      {compact && (
        <p className="text-xs text-slate-500 leading-relaxed">
          Read-only for circle members. Proxies with remote settings can edit selected sections.
        </p>
      )}

      {loading ? (
        <div className="py-10 flex justify-center text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : !snapshot ? (
        <div className="p-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 leading-relaxed">
          No profile synced yet. In the Patient app, open profile, change something, and tap{' '}
          <span className="font-semibold text-slate-700">Save</span> — you should see a green
          &quot;Circle will show the update&quot; toast. Then refresh this page.
        </div>
      ) : (
        <>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <p className="text-lg font-bold text-slate-800">
              {displayProfileName(snapshot, patient.displayName)}
            </p>
            {metaSummary && (
              <p className="text-xs text-slate-500">{metaSummary}</p>
            )}
          </div>

          <CirclePatientProfileReview
            snapshot={snapshot}
            showClinical={showClinical}
            canEdit={canEdit}
            onEditSection={handleEditSection}
          />

          {!canEdit && (
            <p className="text-xs text-slate-400 flex items-center gap-2 px-1">
              <ClipboardList size={14} />
              Profile editing is limited to proxies with remote settings access.
            </p>
          )}
        </>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {snapshot && editSection && (
        <CirclePatientProfileEditorModal
          open
          section={editSection}
          snapshot={snapshot}
          saving={saving}
          onClose={() => setEditSection(null)}
          onSave={handleSaveSection}
        />
      )}
    </div>
  );
}
