import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';

/** Match patient app — online if seen within 2 minutes. */
const PRESENCE_ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

export function isPatientPresenceOnline(lastSeen: number, now = Date.now()): boolean {
  return lastSeen > 0 && now - lastSeen <= PRESENCE_ONLINE_THRESHOLD_MS;
}

export interface PatientPresenceState {
  online: boolean;
  lastSeen: number;
  onlineSince: number;
  activeSection: string | null;
}

/** Human-readable last-seen label for Circle chrome (not shown when caller uses "Now" for online). */
export function formatPatientLastSeen(lastSeen: number, now = Date.now()): string {
  if (!lastSeen) return 'Unknown';

  const seen = new Date(lastSeen);
  const time = seen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (seen.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (seen.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${seen.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
}

const PATIENT_SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  'quick-answers': 'Quick Answers',
  'quick-settings': 'Quick Settings',
  'dashboard/daily-check-in': 'Daily check-in',
  'dashboard/visit-capture': 'Doctor visit capture',
  'dashboard/drop-in': 'Drop-in chat',
  communication: 'Communication',
  messages: 'Messages',
  companion: 'Companion',
  vitality: 'Vitality',
  diary: 'Diary',
  assessments: 'Assessments',
  camera: 'Camera',
  statistics: 'Analytics',
  settings: 'Settings',
  'vitality/body': 'Body',
  'vitality/mind': 'Mind',
  'vitality/mind/games': 'Vitality Games',
  'vitality/soul': 'Soul',
  'vitality/soul/gallery': 'Media Gallery',
  'vitality/soul/gallery/lightbox': 'Lightbox',
  'vitality/soul/gallery/my-media': 'My Media',
  'vitality/soul/gallery/videos': 'Videos',
  'vitality/soul/gallery/people': 'People & faces',
  'vitality/soul/gallery/stimulus-library': 'Stimulus library',
  'vitality/soul/music': 'Music',
};

export function formatPatientActiveSection(section: string | null | undefined): string {
  if (!section) return 'Patient app';
  if (PATIENT_SECTION_LABELS[section]) return PATIENT_SECTION_LABELS[section];

  // Legacy values written before granular vitality paths.
  if (section === 'vitality') return 'Vitality';

  const segments = section.split('/');
  const last = segments[segments.length - 1] ?? section;
  return last
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatPatientOnlineDurationMinutes(
  onlineSince: number,
  now = Date.now(),
): number {
  if (!onlineSince) return 1;
  return Math.max(1, Math.round((now - onlineSince) / 60_000));
}

/** Under 60 minutes: "42 minutes". At 60+ minutes: "6:19" (hours:minutes). */
/** Hide remote prompts while patient is in a focused overlay (Quick Answers, visit, etc.). */
export function isPatientDoNotDisturbSection(section: string | null | undefined): boolean {
  if (!section) return false;
  return (
    section === 'quick-answers' ||
    section === 'quick-settings' ||
    section === 'assessments' ||
    section === 'dashboard/daily-check-in' ||
    section === 'dashboard/visit-capture' ||
    section === 'dashboard/drop-in'
  );
}

export function formatPatientOnlineDurationLabel(
  onlineSince: number,
  now = Date.now(),
): string {
  const minutes = formatPatientOnlineDurationMinutes(onlineSince, now);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}:${String(remainder).padStart(2, '0')}`;
}

/** Patient app presence (patients/{id}/presence/{id}). */
export function usePatientOnlinePresence(
  db: Firestore,
  patientId: string | undefined,
): PatientPresenceState {
  const [presence, setPresence] = useState<PatientPresenceState>({
    online: false,
    lastSeen: 0,
    onlineSince: 0,
    activeSection: null,
  });
  const lastSeenRef = useRef(0);
  const onlineSinceRef = useRef(0);
  const activeSectionRef = useRef<string | null>(null);
  const explicitlyOfflineRef = useRef(false);

  useEffect(() => {
    if (!patientId) {
      lastSeenRef.current = 0;
      onlineSinceRef.current = 0;
      activeSectionRef.current = null;
      explicitlyOfflineRef.current = false;
      setPresence({ online: false, lastSeen: 0, onlineSince: 0, activeSection: null });
      return;
    }

    const presenceRef = doc(db, 'patients', patientId, 'presence', patientId);
    return onSnapshot(
      presenceRef,
      (snap) => {
        const data = snap.data();
        const lastSeen = typeof data?.lastSeen === 'number' ? data.lastSeen : 0;
        const onlineSince = typeof data?.onlineSince === 'number' ? data.onlineSince : 0;
        const activeSection =
          typeof data?.activeSection === 'string' ? data.activeSection : null;
        const explicitlyOffline = data?.status === 'offline';
        lastSeenRef.current = lastSeen;
        onlineSinceRef.current = onlineSince;
        activeSectionRef.current = activeSection;
        explicitlyOfflineRef.current = explicitlyOffline;
        setPresence({
          lastSeen,
          onlineSince,
          activeSection: explicitlyOffline ? null : activeSection,
          online: !explicitlyOffline && isPatientPresenceOnline(lastSeen),
        });
      },
      () => {
        lastSeenRef.current = 0;
        onlineSinceRef.current = 0;
        activeSectionRef.current = null;
        explicitlyOfflineRef.current = false;
        setPresence({ online: false, lastSeen: 0, onlineSince: 0, activeSection: null });
      },
    );
  }, [db, patientId]);

  useEffect(() => {
    if (!patientId) return;
    const interval = window.setInterval(() => {
      setPresence((prev) => ({
        ...prev,
        online:
          !explicitlyOfflineRef.current && isPatientPresenceOnline(lastSeenRef.current),
      }));
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [patientId]);

  return presence;
}
