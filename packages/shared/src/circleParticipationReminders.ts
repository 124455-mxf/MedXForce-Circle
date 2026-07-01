import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';

/** Inactivity window before nudging circle members to participate. */
export const PARTICIPATION_REMINDER_WINDOW_MS = 28 * 24 * 60 * 60 * 1000;

/** Care-team and profile reminders resurface sooner — proxy action is time-sensitive. */
export const CARE_ACTION_REMINDER_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

/** Celebration tiles (birthday / onset) use the same window as the UI (-3 to +7 days). */
export const CELEBRATION_REMINDER_SNOOZE_MS = 11 * 24 * 60 * 60 * 1000;

export type CircleParticipationReminderKind =
  | 'galleryUpload'
  | 'diaryEntry'
  | 'assessmentAfterFirstComm'
  | 'profileIncomplete'
  | 'teamCoverage'
  | 'birthday'
  | 'onsetMilestone';

export function reminderSnoozeDurationMs(kind: CircleParticipationReminderKind): number {
  if (kind === 'teamCoverage' || kind === 'profileIncomplete') {
    return CARE_ACTION_REMINDER_SNOOZE_MS;
  }
  if (kind === 'birthday' || kind === 'onsetMilestone') {
    return CELEBRATION_REMINDER_SNOOZE_MS;
  }
  return PARTICIPATION_REMINDER_WINDOW_MS;
}

export type CircleParticipationReminderSnoozes = Partial<
  Record<CircleParticipationReminderKind, number>
>;

export type CircleProfileReminderSnoozesByPatient = Record<
  string,
  CircleParticipationReminderSnoozes
>;

export function parseMemberReminderSnoozes(
  data: Record<string, unknown> | undefined,
): CircleParticipationReminderSnoozes {
  const raw = data?.reminderSnoozes ?? data;
  if (!raw || typeof raw !== 'object') return {};
  const map = raw as Record<string, unknown>;
  const next: CircleParticipationReminderSnoozes = {};
  if (typeof map.galleryUpload === 'number' && map.galleryUpload > 0) {
    next.galleryUpload = map.galleryUpload;
  }
  if (typeof map.diaryEntry === 'number' && map.diaryEntry > 0) {
    next.diaryEntry = map.diaryEntry;
  }
  if (typeof map.assessmentAfterFirstComm === 'number' && map.assessmentAfterFirstComm > 0) {
    next.assessmentAfterFirstComm = map.assessmentAfterFirstComm;
  }
  if (typeof map.profileIncomplete === 'number' && map.profileIncomplete > 0) {
    next.profileIncomplete = map.profileIncomplete;
  }
  if (typeof map.teamCoverage === 'number' && map.teamCoverage > 0) {
    next.teamCoverage = map.teamCoverage;
  }
  if (typeof map.birthday === 'number' && map.birthday > 0) {
    next.birthday = map.birthday;
  }
  if (typeof map.onsetMilestone === 'number' && map.onsetMilestone > 0) {
    next.onsetMilestone = map.onsetMilestone;
  }
  return next;
}

export function parseReminderSnoozesByPatient(
  raw: unknown,
): CircleProfileReminderSnoozesByPatient {
  if (!raw || typeof raw !== 'object') return {};
  const next: CircleProfileReminderSnoozesByPatient = {};
  for (const [patientId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof patientId !== 'string' || !patientId.trim()) continue;
    const parsed = parseMemberReminderSnoozes(
      value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined,
    );
    if (Object.keys(parsed).length > 0) {
      next[patientId] = parsed;
    }
  }
  return next;
}

export function isParticipationReminderSnoozed(
  kind: CircleParticipationReminderKind,
  snoozes: CircleParticipationReminderSnoozes,
  now = Date.now(),
): boolean {
  const until = snoozes[kind];
  return typeof until === 'number' && until > now;
}

export function shouldShowGalleryUploadReminder(input: {
  enabled: boolean;
  latestMyUploadAt: number | null;
  snoozes: CircleParticipationReminderSnoozes;
  now?: number;
}): boolean {
  if (!input.enabled) return false;
  const now = input.now ?? Date.now();
  if (isParticipationReminderSnoozed('galleryUpload', input.snoozes, now)) return false;
  if (input.latestMyUploadAt == null || input.latestMyUploadAt <= 0) return true;
  return now - input.latestMyUploadAt >= PARTICIPATION_REMINDER_WINDOW_MS;
}

export function shouldShowDiaryEntryReminder(input: {
  enabled: boolean;
  latestMyDiaryAt: number | null;
  snoozes: CircleParticipationReminderSnoozes;
  now?: number;
}): boolean {
  if (!input.enabled) return false;
  const now = input.now ?? Date.now();
  if (isParticipationReminderSnoozed('diaryEntry', input.snoozes, now)) return false;
  if (input.latestMyDiaryAt == null || input.latestMyDiaryAt <= 0) return true;
  return now - input.latestMyDiaryAt >= PARTICIPATION_REMINDER_WINDOW_MS;
}

/** Legacy member-doc path (read fallback for snoozes written before circle_profiles migration). */
export function memberParticipationSnoozeRef(
  db: Firestore,
  patientId: string,
  memberUid: string,
) {
  return doc(db, 'patients', patientId, 'members', memberUid);
}

export function circleProfileReminderSnoozesRef(db: Firestore, memberUid: string) {
  return doc(db, 'circle_profiles', memberUid);
}

async function readLegacyMemberReminderSnoozes(
  db: Firestore,
  patientId: string,
  memberUid: string,
): Promise<CircleParticipationReminderSnoozes> {
  const snap = await getDoc(memberParticipationSnoozeRef(db, patientId, memberUid));
  if (!snap.exists()) return {};
  return parseMemberReminderSnoozes(snap.data() as Record<string, unknown>);
}

async function readCircleProfileReminderSnoozes(
  db: Firestore,
  patientId: string,
  memberUid: string,
): Promise<CircleParticipationReminderSnoozes> {
  const snap = await getDoc(circleProfileReminderSnoozesRef(db, memberUid));
  if (!snap.exists()) return {};
  const byPatient = parseReminderSnoozesByPatient(snap.data()?.reminderSnoozesByPatient);
  return byPatient[patientId] ?? {};
}

function mergeReminderSnoozes(
  primary: CircleParticipationReminderSnoozes,
  fallback: CircleParticipationReminderSnoozes,
): CircleParticipationReminderSnoozes {
  return { ...fallback, ...primary };
}

export async function readMemberReminderSnoozes(
  db: Firestore,
  patientId: string,
  memberUid: string,
): Promise<CircleParticipationReminderSnoozes> {
  const [profileSnoozes, legacySnoozes] = await Promise.all([
    readCircleProfileReminderSnoozes(db, patientId, memberUid),
    readLegacyMemberReminderSnoozes(db, patientId, memberUid),
  ]);
  return mergeReminderSnoozes(profileSnoozes, legacySnoozes);
}

export async function snoozeParticipationReminder(
  db: Firestore,
  patientId: string,
  memberUid: string,
  kind: CircleParticipationReminderKind,
  existing: CircleParticipationReminderSnoozes,
  now = Date.now(),
): Promise<CircleParticipationReminderSnoozes> {
  const next: CircleParticipationReminderSnoozes = {
    ...existing,
    [kind]: now + reminderSnoozeDurationMs(kind),
  };

  const profileRef = circleProfileReminderSnoozesRef(db, memberUid);
  const profileSnap = await getDoc(profileRef);
  const byPatient = profileSnap.exists()
    ? parseReminderSnoozesByPatient(profileSnap.data()?.reminderSnoozesByPatient)
    : {};

  await setDoc(
    profileRef,
    {
      uid: memberUid,
      reminderSnoozesByPatient: {
        ...byPatient,
        [patientId]: next,
      },
      updatedAt: now,
    },
    { merge: true },
  );

  return next;
}
