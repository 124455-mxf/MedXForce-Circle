import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, type Firestore } from 'firebase/firestore';
import { CalendarClock, Clock, History, Loader2, Mail, Pencil, Plus, RefreshCw, ShieldOff, Trash2, Users } from 'lucide-react';
import {
  clampRelationship,
  CircleContactEditorModal,
  defaultRelationshipForKind,
  type ContactEditorDraft,
  type ContactEditorMode,
} from './CircleContactEditorModal';
import { CircleInviteConfirmModal } from './CircleInviteConfirmModal';
import { CirclePatientLanguagePill } from './CirclePatientLanguagePill';
import { CircleContactNotifyIconStrip } from './CircleContactNotifyIconStrip';
import {
  ContactConflictError,
  deletePatientManagedContact,
  listPatientManagedContacts,
  listCircleInvitesForPatient,
  managedContactRecordFingerprint,
  normalizeInviteEmail,
  parsePatientManagedContacts,
  previewCircleAccessRevoke,
  previewManagedContactDeleteInviteChange,
  previewManagedContactInviteChange,
  previewProvisionCircleAccessRevoke,
  previewProvisionManagedContactDeleteInviteChange,
  previewProvisionManagedContactInviteChange,
  reconcileAcceptedMemberRolesForUser,
  revokeCircleInviteByEmail,
  revokeProvisionDraftInviteByEmail,
  saveCircleUserProfile,
  pushMemberNotifyPreferencesFromManagedContact,
  upsertPatientManagedContact,
  upsertProvisionManagedContact,
  deleteProvisionManagedContact,
  listProvisionDraftInvites,
  listProvisionManagedContacts,
  type CircleContactKind,
  type CircleInviteListItem,
  type CircleInvitePreviewItem,
  mergeContactWithMemberContactProfile,
  composeContactDisplayName,
  listInactiveCircleMembers,
  parseMemberContactProfile,
  type CircleManagedContact,
  type CircleMemberContactProfile,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { circleTabButtonClass, circleTabListClass } from '../lib/circleSectionStyles';
import { isFirestoreQuotaError, pauseFirestoreBackgroundWrites } from '../lib/firestoreQuota';
import { cn } from '../lib/utils';
import { useCircleI18nContext, useCircleT, type CircleTranslator } from '../lib/circleI18nContext';
import { formatDashboardTimestamp } from '../lib/dashboardI18n';
import { useCircleMemberActivityByUid } from '../hooks/useCircleMemberActivityByUid';
import {
  contactKindLabelI18n,
  formatContactSaveErrorI18n,
  inviteStatusLabelI18n,
  translateCircleMemberAccessLabel,
} from '../lib/adminScreenI18n';
import { inviteForContactEmail, resolvedContactAccess } from '../lib/circleContactDisplay';
import {
  circleAccessOptionFromManagedContact,
  circleRoleFieldsFromAccessOption,
  demoteAccessOptionForContact,
  findBackupProxyContact,
  findPrimaryProxyContact,
} from '../lib/circleContactAccessOptions';
import { buildCircleContactEmailAudience, buildCircleEmailInviterScope } from '../lib/circleContactEmailAudience';
import { sendCircleContactAddedEmail, sendCircleContactIntroductionEmail } from '../services/circleContactIntroductionEmailApi';
import { removeCircleMemberFromPatient } from '../services/removeCircleMemberFromPatient';
import { useCircleToast, type CircleToastTone } from '../hooks/useCircleToast';
import { CircleAppToast } from './CircleAppToast';
type PanelTab = 'people' | 'access';

type InviteConfirmAction =
  | { type: 'save' }
  | { type: 'delete'; contact: CircleManagedContact }
  | { type: 'revoke'; item: CircleInviteListItem };

function isValidInviteEmail(raw: string): boolean {
  const email = raw.trim().toLowerCase();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

async function sendAutoIntroductionEmailsForItems(params: {
  items: CircleInvitePreviewItem[];
  contacts: CircleManagedContact[];
  draft: ContactEditorDraft;
  patient: CirclePatientSummary;
  user: User;
  members: CircleInviteListItem[];
  memberContactProfileByEmail: Map<string, CircleMemberContactProfile>;
  t: CircleTranslator;
  showToast: (message: string, tone?: CircleToastTone) => void;
}): Promise<void> {
  const inviteItems = params.items.filter(
    (item) => item.action === 'invite' || item.action === 'reinvite',
  );
  if (inviteItems.length === 0) return;

  let sent = 0;
  let failed = 0;

  for (const item of inviteItems) {
    const contact = findContactForInviteItem(item, params.contacts, params.draft);
    const audience = buildCircleContactEmailAudience(
      contact,
      {
        patientName: params.patient.displayName,
        ...buildCircleEmailInviterScope(params.user, {
          members: params.members,
          contacts: params.contacts,
          memberContactProfileByEmail: params.memberContactProfileByEmail,
        }),
      },
      params.t,
    );
    try {
      const result = await sendCircleContactIntroductionEmail({
        email: normalizeInviteEmail(item.email),
        patientId: params.patient.patientId,
        audience,
      });
      if (result.success) sent += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  if (sent > 0) {
    params.showToast(params.t('admin.users.inviteEmailSent'), 'success');
  } else if (failed > 0) {
    params.showToast(params.t('admin.users.inviteEmailFailed'), 'error');
  }
}

function statusClass(status: CircleInviteListItem['status']) {
  if (status === 'accepted') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'revoked') return 'bg-slate-100 text-slate-500 border-slate-200';
  return 'bg-amber-50 text-amber-700 border-amber-100';
}

function contactToDraft(contact: CircleManagedContact): ContactEditorDraft {
  const firstName = contact.firstName || '';
  const lastName = contact.lastName || '';
  return {
    id: contact.id,
    name: composeContactDisplayName({
      firstName,
      lastName,
      name: contact.name,
    }),
    firstName,
    lastName,
    dateOfBirth: contact.dateOfBirth || '',
    email: contact.email,
    mobile: contact.mobile,
    relationship: contact.relationship,
    kind: contact.kind,
    language: contact.language ?? 'English',
    message: contact.message,
    sms: contact.sms,
    alert: contact.alert,
    attention: contact.attention,
    circleAccessOption: circleAccessOptionFromManagedContact(contact),
  };
}

function contactForEditorDisplay(
  contact: CircleManagedContact,
  members: CircleInviteListItem[],
  memberContactProfileByEmail: Map<string, CircleMemberContactProfile>,
): CircleManagedContact {
  const email = normalizeInviteEmail(contact.email);
  if (!email) return contact;
  const invite = inviteForContactEmail(contact, members);
  if (invite?.status !== 'accepted') return contact;
  // Notify flags live on the contact row. Member prefs must not cover them,
  // or Alarm / Attention / Message snap back after Save.
  return mergeContactWithMemberContactProfile(
    contact,
    memberContactProfileByEmail.get(email) ?? null,
  );
}

function draftFingerprint(draft: ContactEditorDraft): string {
  return JSON.stringify({
    id: draft.id ?? '',
    name: draft.name.trim(),
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    dateOfBirth: draft.dateOfBirth.trim(),
    email: draft.email.trim(),
    mobile: draft.mobile.trim(),
    relationship: draft.relationship.trim(),
    kind: draft.kind,
    language: draft.language.trim(),
    message: draft.message,
    sms: draft.sms,
    alert: draft.alert,
    attention: draft.attention,
    circleAccessOption: draft.circleAccessOption,
  });
}

const EMPTY_DRAFT: ContactEditorDraft = {
  name: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  email: '',
  mobile: '',
  relationship: 'Spouse',
  kind: 'caregiver',
  language: 'English',
  message: true,
  sms: true,
  alert: true,
  attention: true,
  circleAccessOption: 'caregiver',
};

function draftRoleFields(draft: ContactEditorDraft) {
  return circleRoleFieldsFromAccessOption(draft.kind, draft.circleAccessOption);
}

function previewContactFromDraft(draft: ContactEditorDraft) {
  const roleFields = draftRoleFields(draft);
  return {
    id: draft.id ?? '',
    name: draft.name,
    email: draft.email ?? '',
    kind: draft.kind,
    ...(roleFields.circleRole ? { circleRole: roleFields.circleRole } : {}),
    ...(roleFields.proxyTier ? { proxyTier: roleFields.proxyTier } : {}),
  };
}

async function demoteConflictingProxyBeforeSave(
  upsert: typeof upsertPatientManagedContact,
  db: Firestore,
  patientId: string,
  contacts: CircleManagedContact[],
  draft: ContactEditorDraft,
  expectedFingerprint?: string,
) {
  const roleFields = draftRoleFields(draft);
  if (roleFields.circleRole !== 'proxy') return;

  const conflicting =
    roleFields.proxyTier === 'backup'
      ? findBackupProxyContact(contacts, draft.id)
      : findPrimaryProxyContact(contacts, draft.id);
  if (!conflicting) return;

  const demoteFields = circleRoleFieldsFromAccessOption(
    conflicting.kind,
    demoteAccessOptionForContact(conflicting),
  );
  await upsert(
    db,
    patientId,
    {
      id: conflicting.id,
      name: conflicting.name,
      email: conflicting.email,
      mobile: conflicting.mobile,
      relationship: conflicting.relationship,
      kind: conflicting.kind,
      language: conflicting.language || 'English',
      message: conflicting.message,
      sms: conflicting.sms,
      alert: conflicting.alert,
      attention: conflicting.attention,
      ...(demoteFields.circleRole ? { circleRole: demoteFields.circleRole } : {}),
    },
    { expectedContactFingerprint: managedContactRecordFingerprint(conflicting) },
  );
}

interface CircleSettingsUserManagementPanelProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary | null;
  /** Admin embed: hide section icon/title and patient name in subtitle. */
  compact?: boolean;
  /** Open on Circle access (e.g. from Home pending-invite reminder). */
  initialTab?: PanelTab;
  onInitialTabConsumed?: () => void;
}

function isCurrentUserInvite(item: CircleInviteListItem, user: User): boolean {
  const authEmail = normalizeInviteEmail(user.email || '');
  if (authEmail && authEmail === normalizeInviteEmail(item.invitedEmail)) return true;
  if (item.acceptedByUid && item.acceptedByUid === user.uid) return true;
  return false;
}

function findContactForInviteItem(
  item: CircleInvitePreviewItem,
  contacts: CircleManagedContact[],
  draft: ContactEditorDraft,
): CircleManagedContact {
  const normalized = normalizeInviteEmail(item.email);
  const fromList = contacts.find((contact) => normalizeInviteEmail(contact.email) === normalized);
  if (fromList) return fromList;
  return {
    id: draft.id || '',
    name: item.name || draft.name,
    email: item.email,
    mobile: draft.mobile,
    relationship: draft.relationship,
    kind: draft.kind,
    language: draft.language || 'English',
    message: draft.message,
    sms: draft.sms,
    alert: draft.alert,
    attention: draft.attention,
    isEmailVerified: false,
    ...draftRoleFields(draft),
  };
}

function resolvedInviteAccessLabel(
  t: CircleTranslator,
  item: CircleInviteListItem,
  contacts: CircleManagedContact[],
): string {
  const email = normalizeInviteEmail(item.invitedEmail);
  const linked = contacts.find((contact) => normalizeInviteEmail(contact.email) === email);
  if (linked?.circleRole) {
    return translateCircleMemberAccessLabel(t, linked.circleRole, linked.proxyTier);
  }
  return translateCircleMemberAccessLabel(t, item.role, item.proxyTier);
}

function resolvedInviteDisplayName(
  item: CircleInviteListItem,
  contacts: CircleManagedContact[],
  memberContactProfileByEmail: Map<string, CircleMemberContactProfile>,
): string {
  const email = normalizeInviteEmail(item.invitedEmail);
  const linked = contacts.find((contact) => normalizeInviteEmail(contact.email) === email);
  if (linked) {
    const merged = mergeContactWithMemberContactProfile(
      linked,
      memberContactProfileByEmail.get(email) ?? null,
    );
    const composed = composeContactDisplayName(merged);
    if (composed) return composed;
  }
  return item.displayName?.trim() || item.invitedEmail;
}

type ResendEmailTarget =
  | { kind: 'introduction'; source: 'contact'; contact: CircleManagedContact }
  | { kind: 'introduction'; source: 'invite'; item: CircleInviteListItem }
  | { kind: 'contact_added'; contact: CircleManagedContact };

function contactForInviteResend(
  item: CircleInviteListItem,
  contacts: CircleManagedContact[],
): CircleManagedContact {
  const email = normalizeInviteEmail(item.invitedEmail);
  const linked = contacts.find((contact) => normalizeInviteEmail(contact.email) === email);
  if (linked) return linked;

  const role = item.role;
  const kind: CircleContactKind =
    role === 'friend' ? 'friend' : role === 'family' ? 'family' : 'caregiver';
  return {
    id: item.contactId || '',
    name: item.displayName || item.invitedEmail,
    email: item.invitedEmail,
    mobile: '',
    relationship: kind === 'friend' ? 'Friend' : kind === 'family' ? 'Family' : 'Other',
    kind,
    language: 'English',
    message: true,
    sms: false,
    alert: true,
    attention: true,
    circleRole:
      role === 'proxy'
        ? 'proxy'
        : role === 'friend' || role === 'family' || role === 'caregiver'
          ? role
          : 'caregiver',
    ...(role === 'proxy'
      ? { proxyTier: item.proxyTier === 'backup' ? 'backup' : 'primary' as const }
      : {}),
  };
}

function memberLastOpenedAt(
  uid: string | undefined,
  lastOpenByUid: Record<string, number>,
  presenceByUid: Record<string, number>,
): number {
  if (!uid) return 0;
  const openAt = Number(lastOpenByUid[uid]);
  const seenAt = Number(presenceByUid[uid]);
  if (Number.isFinite(openAt) && openAt > 0) return openAt;
  if (Number.isFinite(seenAt) && seenAt > 0) return seenAt;
  return 0;
}

function DeletionScheduledNote({ until, className }: { until: number; className?: string }) {
  const t = useCircleT();
  const date = new Date(until).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <p
      className={cn(
        'flex items-center gap-2 rounded-xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-950',
        className,
      )}
    >
      <CalendarClock size={14} className="shrink-0 text-rose-700" aria-hidden />
      <span className="min-w-0 leading-snug">{t('admin.users.deletionScheduled', { date })}</span>
    </p>
  );
}

/** Proxy, then caregiver, family, friends, contacts. Primary proxy before backup. */
function peopleListGroupRank(contact: CircleManagedContact): number {
  if (contact.circleRole === 'proxy') return contact.proxyTier === 'backup' ? 1 : 0;
  if (contact.kind === 'caregiver') return 2;
  if (contact.kind === 'family') return 3;
  if (contact.kind === 'friend') return 4;
  return 5;
}

function contactLastNameKey(contact: CircleManagedContact): string {
  const last = (contact.lastName || '').trim();
  if (last) return last;
  const display = composeContactDisplayName(contact);
  const parts = display.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return parts[parts.length - 1] ?? display;
  return display || contact.email;
}

function contactFirstNameKey(contact: CircleManagedContact): string {
  const first = (contact.firstName || '').trim();
  if (first) return first;
  const display = composeContactDisplayName(contact);
  const parts = display.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return parts.slice(0, -1).join(' ');
  return '';
}

function PersonRow({
  contact,
  members,
  onView,
  onEdit,
  onRequestResendInviteEmail,
  onRequestResendContactAddedEmail,
  resendingInviteEmail,
}: {
  contact: CircleManagedContact;
  members: CircleInviteListItem[];
  onView: () => void;
  onEdit: () => void;
  onRequestResendInviteEmail?: () => void;
  onRequestResendContactAddedEmail?: () => void;
  resendingInviteEmail?: string | null;
}) {
  const t = useCircleT();
  const access = resolvedContactAccess(t, contact, members);
  const canResendInvite =
    contact.kind !== 'contact' && isValidInviteEmail(contact.email) && !!onRequestResendInviteEmail;
  const canResendContactAdded =
    contact.kind === 'contact' && isValidInviteEmail(contact.email) && !!onRequestResendContactAddedEmail;
  const resending =
    !!resendingInviteEmail &&
    normalizeInviteEmail(resendingInviteEmail) === normalizeInviteEmail(contact.email);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView();
        }
      }}
      className={cn(
        'p-4 rounded-2xl border shadow-sm cursor-pointer transition-colors',
        contact.deletionScheduledUntil
          ? 'border-rose-300 bg-rose-50 hover:border-rose-400 hover:bg-rose-50'
          : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50',
      )}
    >
      <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <p className="font-bold text-slate-800 truncate">
            {composeContactDisplayName(contact) || t('admin.users.unnamed')}
          </p>
          <span
            className={cn(
              'shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border',
              access.badgeClass,
            )}
          >
            {access.label}
          </span>
        </div>
        <p className="text-sm text-slate-500 truncate mt-0.5">
          {contact.email || t('admin.users.noEmail')}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {contact.language?.trim() ? (
            <CirclePatientLanguagePill language={contact.language} title={contact.language} />
          ) : null}
          <CircleContactNotifyIconStrip
            values={{
              alert: contact.alert,
              attention: contact.attention,
              message: contact.message,
              sms: contact.sms,
            }}
            kind={contact.kind}
            hasEmail={!!contact.email.trim()}
            hasMobile={!!contact.mobile.trim()}
          />
        </div>
      </div>
      {canResendInvite && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRequestResendInviteEmail?.();
          }}
          disabled={resending}
          className="p-2.5 rounded-xl text-blue-600 hover:bg-blue-50 disabled:opacity-50"
          aria-label={t('admin.users.sendInviteEmailAgainAria')}
          title={t('admin.users.sendInviteEmailAgain')}
        >
          {resending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
        </button>
      )}
      {canResendContactAdded && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRequestResendContactAddedEmail?.();
          }}
          disabled={resending}
          className="p-2.5 rounded-xl text-blue-600 hover:bg-blue-50 disabled:opacity-50"
          aria-label={t('admin.users.sendContactAddedEmailAgainAria')}
          title={t('admin.users.sendContactAddedEmailAgain')}
        >
          {resending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
        </button>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100"
        aria-label={t('admin.users.editAria')}
      >
        <Pencil size={16} />
      </button>
      </div>
      {contact.deletionScheduledUntil ? (
        <DeletionScheduledNote until={contact.deletionScheduledUntil} className="mt-3" />
      ) : null}
    </div>
  );
}

export function CircleSettingsUserManagementPanel({
  user,
  db,
  patient,
  compact = false,
  initialTab,
  onInitialTabConsumed,
}: CircleSettingsUserManagementPanelProps) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();
  const { toast, showToast } = useCircleToast();
  const [tab, setTab] = useState<PanelTab>(initialTab === 'access' ? 'access' : 'people');
  const [members, setMembers] = useState<CircleInviteListItem[]>([]);
  const [contacts, setContacts] = useState<CircleManagedContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);
  const [resendingInviteEmail, setResendingInviteEmail] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<CircleInviteListItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CircleManagedContact | null>(null);
  const [deleteContributions, setDeleteContributions] = useState(false);
  const [confirmEraseContributions, setConfirmEraseContributions] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [confirmResendEmail, setConfirmResendEmail] = useState<ResendEmailTarget | null>(null);
  const [invitePreviewItems, setInvitePreviewItems] = useState<CircleInvitePreviewItem[] | null>(
    null,
  );
  const [inviteConfirmAction, setInviteConfirmAction] = useState<InviteConfirmAction | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<ContactEditorMode>('edit');
  const [draft, setDraft] = useState<ContactEditorDraft>(EMPTY_DRAFT);
  const [editorBaselineContactFingerprint, setEditorBaselineContactFingerprint] = useState('');
  const [initialDraftFingerprint, setInitialDraftFingerprint] = useState('');
  const [remoteStale, setRemoteStale] = useState(false);
  const [editorAccess, setEditorAccess] = useState<{ label: string; badgeClass: string } | null>(
    null,
  );
  const [memberContactProfileByEmail, setMemberContactProfileByEmail] = useState<
    Map<string, CircleMemberContactProfile>
  >(() => new Map());
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const memberOverlaySnapGenRef = useRef(0);

  const isPendingProvision = patient?.isPendingProvision === true;

  const loadMembers = useCallback(async () => {
    if (!patient?.patientId) {
      setMembers([]);
      setContacts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isPendingProvision) {
        const [rows, listedContacts] = await Promise.all([
          listProvisionDraftInvites(db, patient.patientId),
          listProvisionManagedContacts(db, patient.patientId),
        ]);
        setMembers(rows);
        setContacts(listedContacts);
      } else {
        const [rows, listedContacts] = await Promise.all([
          listCircleInvitesForPatient(db, patient.patientId),
          listPatientManagedContacts(db, patient.patientId, { includeDeletionScheduled: true }),
        ]);
        setMembers(rows);
        setContacts(listedContacts);
      }
    } catch (err) {
      console.warn('[CircleSettingsUserManagementPanel]', err);
      setError(t('admin.users.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [db, isPendingProvision, patient?.patientId, t]);

  useEffect(() => {
    if (!patient?.patientId || !patient.capabilities.inviteMembers) return;
    void reconcileAcceptedMemberRolesForUser(db, user.uid).catch((err) => {
      console.warn('[CircleSettingsUserManagementPanel] proxy access heal', err);
    });
  }, [db, patient?.capabilities.inviteMembers, patient?.patientId, user.uid]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (initialTab !== 'access' && initialTab !== 'people') return;
    setTab(initialTab);
    onInitialTabConsumed?.();
  }, [initialTab, onInitialTabConsumed]);

  useEffect(() => {
    if (!patient?.patientId || isPendingProvision) {
      setMemberContactProfileByEmail(new Map());
      return;
    }

    return onSnapshot(collection(db, 'patients', patient.patientId, 'members'), (snap) => {
      const gen = ++memberOverlaySnapGenRef.current;
      void (async () => {
        try {
          const profileNext = new Map<string, CircleMemberContactProfile>();
          await Promise.all(
            snap.docs.map(async (memberDoc) => {
              const data = memberDoc.data() as Record<string, unknown>;
              const email = normalizeInviteEmail(String(data.invitedEmail ?? ''));
              if (!email) return;

              let profileSource: Record<string, unknown> = data;
              try {
                const prefsContactSnap = await getDoc(
                  doc(db, 'patients', patient.patientId, 'members', memberDoc.id, 'prefs', 'contact'),
                );
                if (prefsContactSnap.exists()) {
                  profileSource = prefsContactSnap.data() as Record<string, unknown>;
                }
              } catch {
                // Proxy may be denied prefs/contact; member-root profile is enough.
              }
              const profile = parseMemberContactProfile(profileSource);
              if (profile) profileNext.set(email, profile);
            }),
          );
          if (gen !== memberOverlaySnapGenRef.current) return;
          setMemberContactProfileByEmail(profileNext);
        } catch (err) {
          console.warn('[CircleSettingsUserManagementPanel] member overlay sync', err);
        }
      })();
    });
  }, [db, isPendingProvision, patient?.patientId]);

  useEffect(() => {
    if (!patient?.patientId) {
      setContacts([]);
      return;
    }

    if (isPendingProvision) {
      return onSnapshot(
        doc(db, 'patient_provisions', patient.patientId),
        (snap) => {
          if (!snap.exists()) return;
          const listed = parsePatientManagedContacts(snap.data(), {
            includeDeletionScheduled: true,
          });
          setContacts(listed);
        },
        (err) => {
          console.warn('[CircleSettingsUserManagementPanel] live provision contacts', err);
        },
      );
    }

    return onSnapshot(
      doc(db, 'patients', patient.patientId),
      (snap) => {
        if (!snap.exists()) return;
        const listed = parsePatientManagedContacts(snap.data(), {
          includeDeletionScheduled: true,
        });
        setContacts(listed);
      },
      (err) => {
        console.warn('[CircleSettingsUserManagementPanel] live contacts', err);
      },
    );
  }, [db, isPendingProvision, patient?.patientId]);

  useEffect(() => {
    if (!patient?.patientId || !isPendingProvision) return;

    return onSnapshot(
      collection(db, 'patient_provisions', patient.patientId, 'draft_invites'),
      (snap) => {
        const rows = snap.docs
          .map((inviteDoc) => {
            const data = inviteDoc.data() as Record<string, unknown>;
            const status = (data.status || 'pending') as CircleInviteListItem['status'];
            return {
              id: inviteDoc.id,
              invitedEmail: String(data.invitedEmail || ''),
              displayName: typeof data.displayName === 'string' ? data.displayName : undefined,
              role: String(data.role || 'member'),
              proxyTier:
                data.proxyTier === 'backup' || data.proxyTier === 'primary'
                  ? data.proxyTier
                  : undefined,
              status,
              updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
              acceptedByUid:
                typeof data.acceptedByUid === 'string' ? data.acceptedByUid : undefined,
            } satisfies CircleInviteListItem;
          })
          .filter((item) => item.invitedEmail)
          .sort((a, b) => {
            const statusOrder = { accepted: 0, pending: 1, revoked: 2 };
            const diff = statusOrder[a.status] - statusOrder[b.status];
            if (diff !== 0) return diff;
            return (a.displayName || a.invitedEmail).localeCompare(b.displayName || b.invitedEmail);
          });
        setMembers(rows);
      },
      (err) => {
        console.warn('[CircleSettingsUserManagementPanel] live provision invites', err);
      },
    );
  }, [db, isPendingProvision, patient?.patientId]);

  useEffect(() => {
    if (!editorOpen || editorMode === 'view') {
      if (!editorOpen) setRemoteStale(false);
      return;
    }
    if (!editorBaselineContactFingerprint) return;

    const currentDraft = draftRef.current;
    const remoteContact = currentDraft.id
      ? contacts.find((contact) => contact.id === currentDraft.id)
      : undefined;
    if (!remoteContact) return;

    const remoteFingerprint = managedContactRecordFingerprint(remoteContact);
    if (remoteFingerprint === editorBaselineContactFingerprint) return;

    const dirty = draftFingerprint(currentDraft) !== initialDraftFingerprint;
    if (!dirty) {
      const refreshed = contactToDraft(
        contactForEditorDisplay(remoteContact, members, memberContactProfileByEmail),
      );
      setDraft(refreshed);
      setInitialDraftFingerprint(draftFingerprint(refreshed));
      setEditorBaselineContactFingerprint(remoteFingerprint);
      setRemoteStale(false);
      return;
    }

    setRemoteStale(true);
  }, [
    contacts,
    editorBaselineContactFingerprint,
    editorMode,
    editorOpen,
    initialDraftFingerprint,
    memberContactProfileByEmail,
    members,
  ]);

  useEffect(() => {
    if (!editorOpen || editorMode !== 'view') return;
    const currentDraft = draftRef.current;
    if (!currentDraft.id) return;
    const remoteContact = contacts.find((contact) => contact.id === currentDraft.id);
    if (!remoteContact) return;
    setDraft(
      contactToDraft(contactForEditorDisplay(remoteContact, members, memberContactProfileByEmail)),
    );
  }, [contacts, editorMode, editorOpen, memberContactProfileByEmail, members]);

  const { activeMembers, pastMembers } = useMemo(() => {
    const active: CircleInviteListItem[] = [];
    const past: CircleInviteListItem[] = [];
    for (const item of members) {
      if (item.status === 'revoked') past.push(item);
      else active.push(item);
    }
    return { activeMembers: active, pastMembers: past };
  }, [members]);

  const accessActivityUids = useMemo(() => {
    const seen = new Set<string>();
    const uids: string[] = [];
    for (const item of members) {
      const uid = item.acceptedByUid?.trim();
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      uids.push(uid);
    }
    return uids;
  }, [members]);
  const {
    lastOpenByUid,
    presenceByUid,
    loading: memberActivityLoading,
  } = useCircleMemberActivityByUid(db, patient?.patientId, accessActivityUids);
  const inactiveAccessMembers = useMemo(() => {
    if (memberActivityLoading) return [];
    return listInactiveCircleMembers({
      invites: members,
      lastOpenByUid,
      presenceByUid,
      excludeUid: user.uid,
    });
  }, [lastOpenByUid, memberActivityLoading, members, presenceByUid, user.uid]);
  const inactiveAccessUids = useMemo(
    () => new Set(inactiveAccessMembers.map((member) => member.uid)),
    [inactiveAccessMembers],
  );
  const accessMembers = useMemo(() => {
    if (inactiveAccessMembers.length === 0) return activeMembers;
    const rank = new Map(inactiveAccessMembers.map((member, index) => [member.uid, index]));
    return [...activeMembers].sort((a, b) => {
      const aUid = a.acceptedByUid?.trim();
      const bUid = b.acceptedByUid?.trim();
      const aRank = aUid ? rank.get(aUid) : undefined;
      const bRank = bUid ? rank.get(bUid) : undefined;
      if (aRank != null && bRank != null) return aRank - bRank;
      if (aRank != null) return -1;
      if (bRank != null) return 1;
      return 0;
    });
  }, [activeMembers, inactiveAccessMembers]);

  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      const groupDiff = peopleListGroupRank(a) - peopleListGroupRank(b);
      if (groupDiff !== 0) return groupDiff;
      const lastDiff = contactLastNameKey(a).localeCompare(contactLastNameKey(b), undefined, {
        sensitivity: 'base',
      });
      if (lastDiff !== 0) return lastDiff;
      return contactFirstNameKey(a).localeCompare(contactFirstNameKey(b), undefined, {
        sensitivity: 'base',
      });
    });
  }, [contacts]);

  const handleRevoke = async (item: CircleInviteListItem) => {
    if (!patient?.patientId) return;
    setRevokingEmail(item.invitedEmail);
    setError(null);
    try {
      const ok = isPendingProvision
        ? await revokeProvisionDraftInviteByEmail(db, patient.patientId, item.invitedEmail)
        : await revokeCircleInviteByEmail(db, patient.patientId, item.invitedEmail, {
            actorUid: user.uid,
          });
      if (!ok) {
        setError(t('admin.users.revokeFailed'));
        return;
      }
      setConfirmRevoke(null);
      await loadMembers();
    } catch (err) {
      console.warn('[CircleSettingsUserManagementPanel] revoke', err);
      if (isFirestoreQuotaError(err)) {
        pauseFirestoreBackgroundWrites(String(err));
        setError(t('admin.profile.quotaError'));
      } else {
        setError(t('admin.users.revokeFailed'));
      }
    } finally {
      setRevokingEmail(null);
    }
  };

  const requestRevoke = async (item: CircleInviteListItem) => {
    if (!patient?.patientId) return;
    setRevokingEmail(item.invitedEmail);
    setError(null);
    try {
      const preview = isPendingProvision
        ? await previewProvisionCircleAccessRevoke(
            db,
            patient.patientId,
            item.invitedEmail,
            item.displayName || undefined,
          )
        : await previewCircleAccessRevoke(
            db,
            patient.patientId,
            item.invitedEmail,
            item.displayName || undefined,
          );
      if (preview.length > 0) {
        setInvitePreviewItems(preview);
        setInviteConfirmAction({ type: 'revoke', item });
        return;
      }
      setConfirmRevoke(item);
    } catch (err) {
      console.warn('[CircleSettingsUserManagementPanel] revoke preview', err);
      setConfirmRevoke(item);
    } finally {
      setRevokingEmail(null);
    }
  };

  const openEditorWithDraft = (
    nextDraft: ContactEditorDraft,
    mode: ContactEditorMode,
    contact?: CircleManagedContact,
  ) => {
    setDraft(nextDraft);
    setEditorMode(mode);
    setEditorAccess(contact ? resolvedContactAccess(t, contact, members) : null);
    if (mode !== 'view') {
      setInitialDraftFingerprint(draftFingerprint(nextDraft));
      setEditorBaselineContactFingerprint(contact ? managedContactRecordFingerprint(contact) : '');
    }
    setRemoteStale(false);
    setEditorError(null);
    setEditorOpen(true);
  };

  const openCreate = () => {
    openEditorWithDraft(
      { ...EMPTY_DRAFT, relationship: defaultRelationshipForKind('caregiver') },
      'create',
    );
  };

  const openView = (contact: CircleManagedContact) => {
    openEditorWithDraft(
      contactToDraft(contactForEditorDisplay(contact, members, memberContactProfileByEmail)),
      'view',
      contact,
    );
  };

  const openEdit = (contact: CircleManagedContact) => {
    openEditorWithDraft(
      contactToDraft(contactForEditorDisplay(contact, members, memberContactProfileByEmail)),
      'edit',
      contact,
    );
  };

  const switchViewToEdit = () => {
    const currentDraft = draftRef.current;
    const remoteContact = currentDraft.id
      ? contacts.find((contact) => contact.id === currentDraft.id)
      : undefined;
    if (remoteContact) {
      openEdit(remoteContact);
      return;
    }
    setEditorMode('edit');
    setInitialDraftFingerprint(draftFingerprint(currentDraft));
    setEditorBaselineContactFingerprint('');
    setRemoteStale(false);
    setEditorError(null);
  };

  const refreshDraftFromRemote = () => {
    const currentDraft = draftRef.current;
    const remoteContact = currentDraft.id
      ? contacts.find((contact) => contact.id === currentDraft.id)
      : undefined;
    if (!remoteContact) return;
    const refreshed = contactToDraft(
      contactForEditorDisplay(remoteContact, members, memberContactProfileByEmail),
    );
    setDraft(refreshed);
    setEditorAccess(resolvedContactAccess(t, remoteContact, members));
    setInitialDraftFingerprint(draftFingerprint(refreshed));
    setEditorBaselineContactFingerprint(managedContactRecordFingerprint(remoteContact));
    setRemoteStale(false);
    setEditorError(null);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditorOpen(false);
    setEditorMode('edit');
    setEditorError(null);
    setDraft(EMPTY_DRAFT);
    setRemoteStale(false);
    setInitialDraftFingerprint('');
    setEditorBaselineContactFingerprint('');
  };

  const persistContact = async (): Promise<CircleManagedContact | undefined> => {
    if (!patient?.patientId) return;
    const currentDraft = draftRef.current;
    const composedName = composeContactDisplayName({
      firstName: currentDraft.firstName,
      lastName: currentDraft.lastName,
      name: currentDraft.name,
    });
    const normalizedEmail = currentDraft.email.trim();
    const normalizedMobile = currentDraft.mobile.trim();
    const nextMessage = currentDraft.message && !!normalizedEmail;
    const nextSms = currentDraft.sms && !!normalizedMobile;
    const existing = currentDraft.id
      ? contacts.find((contact) => contact.id === currentDraft.id)
      : undefined;
    const invite = existing ? inviteForContactEmail(existing, members) : undefined;
    const roleFields = draftRoleFields(currentDraft);
    const upsert = isPendingProvision ? upsertProvisionManagedContact : upsertPatientManagedContact;

    await demoteConflictingProxyBeforeSave(upsert, db, patient.patientId, contacts, currentDraft);

    const nextAlert = currentDraft.alert && !!normalizedEmail;
    const nextAttention = currentDraft.attention && !!normalizedEmail;
    const nextLanguage = currentDraft.language || 'English';
    const saved = await upsert(
      db,
      patient.patientId,
      {
        id: currentDraft.id,
        name: composedName,
        firstName: currentDraft.firstName,
        lastName: currentDraft.lastName,
        dateOfBirth: currentDraft.dateOfBirth,
        email: normalizedEmail,
        mobile: normalizedMobile,
        relationship: clampRelationship(currentDraft.kind, currentDraft.relationship),
        kind: currentDraft.kind,
        language: nextLanguage,
        message: nextMessage,
        sms: nextSms,
        alert: nextAlert,
        attention: nextAttention,
        ...(roleFields.circleRole ? { circleRole: roleFields.circleRole } : {}),
        ...(roleFields.proxyTier ? { proxyTier: roleFields.proxyTier } : {}),
        ...(existing?.contactAddedEmailSentAt
          ? { contactAddedEmailSentAt: existing.contactAddedEmailSentAt }
          : {}),
      },
      { expectedContactFingerprint: editorBaselineContactFingerprint || undefined },
    );

    if (!isPendingProvision && invite?.status === 'accepted' && invite.acceptedByUid) {
      const displayed = existing
        ? contactForEditorDisplay(existing, members, memberContactProfileByEmail)
        : undefined;
      try {
        await pushMemberNotifyPreferencesFromManagedContact(
          db,
          patient.patientId,
          invite.acceptedByUid,
          {
            alert: nextAlert,
            attention: nextAttention,
            message: nextMessage,
          },
        );
      } catch (err) {
        console.warn('[CircleSettingsUserManagementPanel] member notify sync', err);
      }
      if (displayed && nextLanguage !== (displayed.language || 'English')) {
        await saveCircleUserProfile(db, invite.acceptedByUid, {
          language: nextLanguage,
          languageSource: 'patient',
          managedPatientId: patient.patientId,
        });
      }
    }

    closeEditor();
    await loadMembers();
    return saved;
  };

  const maybeOfferContactAddedEmail = (saved: CircleManagedContact | undefined) => {
    if (!saved || saved.kind !== 'contact' || !isValidInviteEmail(saved.email)) return;
    if (saved.contactAddedEmailSentAt) return;
    setConfirmResendEmail({ kind: 'contact_added', contact: saved });
  };

  const handleSaveContact = async () => {
    if (!patient?.patientId) return;
    const composedName = composeContactDisplayName({
      firstName: draft.firstName,
      lastName: draft.lastName,
      name: draft.name,
    });
    if (!composedName) {
      setEditorError(t('admin.users.nameRequired'));
      return;
    }
    if (composedName !== draft.name.trim()) {
      const nextDraft = { ...draft, name: composedName };
      draftRef.current = nextDraft;
      setDraft(nextDraft);
    }
    if (draft.kind !== 'contact' && !draft.email.trim()) {
      setEditorError(t('admin.users.emailRequired'));
      return;
    }
    if (draft.email.trim() && !isValidInviteEmail(draft.email)) {
      setEditorError(t('admin.users.invalidEmail'));
      return;
    }

    const normalizedDraftEmail = normalizeInviteEmail(draft.email);
    if (normalizedDraftEmail) {
      const emailOwner = contacts.find(
        (contact) => normalizeInviteEmail(contact.email) === normalizedDraftEmail,
      );
      if (emailOwner && emailOwner.id !== draft.id) {
        setEditorError(
          t('admin.users.duplicateEmail', {
            name: emailOwner.name || t('admin.users.thisPerson'),
            email: normalizedDraftEmail,
          }),
        );
        return;
      }
    }

    if (remoteStale) {
      setEditorError(t('admin.users.staleBeforeSave'));
      return;
    }

    setSaving(true);
    setEditorError(null);
    try {
      const previous = draft.id ? contacts.find((contact) => contact.id === draft.id) : undefined;
      const preview = isPendingProvision
        ? await previewProvisionManagedContactInviteChange(
            db,
            patient.patientId,
            previewContactFromDraft(draft),
            { previousEmail: previous?.email },
          )
        : await previewManagedContactInviteChange(
            db,
            patient.patientId,
            previewContactFromDraft(draft),
            { previousEmail: previous?.email },
          );
      if (preview.length > 0) {
        setInvitePreviewItems(preview);
        setInviteConfirmAction({ type: 'save' });
        return;
      }
      const saved = await persistContact();
      maybeOfferContactAddedEmail(saved);
    } catch (err) {
      console.warn('[CircleSettingsUserManagementPanel] save', err);
      if (err instanceof ContactConflictError) {
        setRemoteStale(true);
      }
      setEditorError(formatContactSaveErrorI18n(t, err));
    } finally {
      setSaving(false);
    }
  };

  const handleInviteConfirm = async () => {
    const pendingItems = invitePreviewItems ?? [];
    const action = inviteConfirmAction;
    setSaving(true);
    try {
      if (action?.type === 'delete') {
        await handleDeleteContact(action.contact);
      } else if (action?.type === 'revoke') {
        await handleRevoke(action.item);
      } else {
        await persistContact();
        if (action?.type === 'save' && patient?.patientId) {
          await sendAutoIntroductionEmailsForItems({
            items: pendingItems,
            contacts,
            draft: draftRef.current,
            patient,
            user,
            members,
            memberContactProfileByEmail,
            t,
            showToast,
          });
        }
      }
      setInvitePreviewItems(null);
      setInviteConfirmAction(null);
    } catch (err) {
      console.warn('[CircleSettingsUserManagementPanel] invite confirm', err);
      if (action?.type === 'save') {
        if (err instanceof ContactConflictError) {
          setRemoteStale(true);
          setEditorError(err.message);
        } else {
          setEditorError(err instanceof Error ? err.message : t('admin.users.saveFailed'));
        }
      } else if (isFirestoreQuotaError(err)) {
        pauseFirestoreBackgroundWrites(String(err));
        setError(t('admin.profile.quotaError'));
      }
      setInvitePreviewItems(null);
      setInviteConfirmAction(null);
    } finally {
      setSaving(false);
    }
  };

  const markContactAddedEmailSent = async (contact: CircleManagedContact) => {
    if (!patient?.patientId) return;
    const payload = {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      mobile: contact.mobile,
      relationship: contact.relationship,
      kind: contact.kind,
      language: contact.language || 'English',
      message: contact.message,
      sms: contact.sms,
      alert: contact.alert,
      attention: contact.attention,
      contactAddedEmailSentAt: Date.now(),
    };
    if (isPendingProvision) {
      await upsertProvisionManagedContact(db, patient.patientId, payload);
    } else {
      await upsertPatientManagedContact(db, patient.patientId, payload, { syncInvite: false });
    }
    await loadMembers();
  };

  const executeResendEmail = async (target: ResendEmailTarget) => {
    if (!patient?.patientId) return;
    const contact =
      target.kind === 'contact_added' || target.source === 'contact'
        ? target.contact
        : contactForInviteResend(target.item, contacts);
    if (!isValidInviteEmail(contact.email)) return;

    const email = normalizeInviteEmail(contact.email);
    setResendingInviteEmail(email);
    try {
      const audience = buildCircleContactEmailAudience(
        contact,
        {
          patientName: patient.displayName,
          ...buildCircleEmailInviterScope(user, {
            members,
            contacts,
            memberContactProfileByEmail,
          }),
        },
        t,
      );
      const result =
        target.kind === 'contact_added'
          ? await sendCircleContactAddedEmail({
              email,
              patientId: patient.patientId,
              audience,
            })
          : await sendCircleContactIntroductionEmail({
              email,
              patientId: patient.patientId,
              audience,
            });
      showToast(
        result.success
          ? target.kind === 'contact_added'
            ? t('admin.users.contactAddedEmailSent')
            : t('admin.users.inviteEmailSent')
          : target.kind === 'contact_added'
            ? t('admin.users.contactAddedEmailFailed')
            : t('admin.users.inviteEmailFailed'),
        result.success ? 'success' : 'error',
      );
      if (result.success) {
        if (target.kind === 'contact_added') {
          await markContactAddedEmailSent(contact);
        }
        setConfirmResendEmail(null);
      }
    } finally {
      setResendingInviteEmail(null);
    }
  };

  const handleDeleteContact = async (contact: CircleManagedContact) => {
    if (!patient?.patientId) return;
    setError(null);
    try {
      if (isPendingProvision) {
        await deleteProvisionManagedContact(db, patient.patientId, contact);
      } else {
        await deletePatientManagedContact(db, patient.patientId, contact);
      }
      setConfirmDelete(null);
      await loadMembers();
    } catch (err) {
      console.warn('[CircleSettingsUserManagementPanel] delete', err);
      if (isFirestoreQuotaError(err)) {
        pauseFirestoreBackgroundWrites(String(err));
        setError(t('admin.profile.quotaError'));
      } else {
        setError(t('admin.users.deleteFailed'));
      }
      throw err;
    }
  };

  const proceedDelete = async (contact: CircleManagedContact) => {
    if (!patient?.patientId) return;
    setSaving(true);
    setError(null);
    setRemoveError('');
    try {
      if (!isPendingProvision && isValidInviteEmail(contact.email)) {
        if (deleteContributions) {
          await removeCircleMemberFromPatient({
            patientId: patient.patientId,
            email: contact.email,
            deleteContributions: true,
          });
        } else {
          await deletePatientManagedContact(db, patient.patientId, contact);
        }
        setConfirmDelete(null);
        setDeleteContributions(false);
        setConfirmEraseContributions(false);
        setError(null);
        await loadMembers();
        return;
      }
      const preview = isPendingProvision
        ? await previewProvisionManagedContactDeleteInviteChange(db, patient.patientId, contact)
        : await previewManagedContactDeleteInviteChange(db, patient.patientId, contact);
      if (preview.length > 0) {
        setConfirmDelete(null);
        setInvitePreviewItems(preview);
        setInviteConfirmAction({ type: 'delete', contact });
        return;
      }
      await handleDeleteContact(contact);
    } catch (err) {
      console.warn('[CircleSettingsUserManagementPanel] delete preview', err);
      if (isFirestoreQuotaError(err)) {
        pauseFirestoreBackgroundWrites(String(err));
        setError(t('admin.profile.quotaError'));
      } else if (confirmDelete) {
        const detail = err instanceof Error ? err.message.trim() : '';
        setRemoveError(detail || t('admin.users.deleteFailed'));
      } else {
        setError(t('admin.users.deleteFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return (
      <div className="p-5">
        <p className="text-sm text-slate-500 leading-relaxed">{t('admin.users.noPatient')}</p>
      </div>
    );
  }

  if (!patient.capabilities.inviteMembers) {
    return (
      <div className="p-5">
        <p className="text-sm text-slate-500 leading-relaxed">{t('admin.users.proxyOnly')}</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn(compact ? 'flex flex-col flex-1 min-h-0' : 'space-y-5 p-5')}>
        {!compact && (
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-800">{t('admin.users.title')}</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {t('admin.users.subtitleNamed', { name: patient.displayName })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadMembers()}
              disabled={loading}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 shrink-0 disabled:opacity-50"
              aria-label={t('admin.users.refreshAria')}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            </button>
          </div>
        )}

        <div className={cn(compact && 'shrink-0 space-y-3 px-4 pt-4 pb-2 bg-white')}>
          <div className="flex items-center gap-2">
            <div className={cn(circleTabListClass, 'flex-1 min-w-0')} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'people'}
                onClick={() => setTab('people')}
                className={circleTabButtonClass(tab === 'people')}
              >
                {t('admin.users.tabPeople')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'access'}
                onClick={() => setTab('access')}
                className={circleTabButtonClass(tab === 'access')}
              >
                {t('admin.users.tabAccess')}
              </button>
            </div>
            {compact && (
              <button
                type="button"
                onClick={() => void loadMembers()}
                disabled={loading}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 shrink-0 disabled:opacity-50"
                aria-label={t('admin.users.refreshAria')}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              </button>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div
          className={cn(
            compact &&
              'min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y space-y-4 px-4 pb-4',
          )}
        >
        {tab === 'people' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={openCreate}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
            >
              <Plus size={18} />
              {t('admin.users.addPerson')}
            </button>

            {loading && contacts.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">{t('admin.users.loading')}</div>
            ) : sortedContacts.length === 0 ? (
              <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-400">{t('admin.users.noPeople')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedContacts.map((contact) => (
                  <PersonRow
                    key={contact.id}
                    contact={contactForEditorDisplay(contact, members, memberContactProfileByEmail)}
                    members={members}
                    onView={() => openView(contact)}
                    onEdit={() => openEdit(contact)}
                    onRequestResendInviteEmail={() =>
                      setConfirmResendEmail({ kind: 'introduction', source: 'contact', contact })
                    }
                    onRequestResendContactAddedEmail={() =>
                      setConfirmResendEmail({ kind: 'contact_added', contact })
                    }
                    resendingInviteEmail={resendingInviteEmail}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'access' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed px-1">{t('admin.users.accessHint')}</p>

            {loading && members.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">{t('admin.users.loading')}</div>
            ) : activeMembers.length === 0 && pastMembers.length === 0 ? (
              <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-400">{t('admin.users.noInvites')}</p>
              </div>
            ) : (
              <>
                {activeMembers.length > 0 && (
                  <div className="space-y-2">
                    {accessMembers.map((item) => {
                      const isSelf = isCurrentUserInvite(item, user);
                      const memberUid = item.acceptedByUid?.trim();
                      const inactive = Boolean(memberUid && inactiveAccessUids.has(memberUid));
                      const lastOpenedAt = memberLastOpenedAt(memberUid, lastOpenByUid, presenceByUid);
                      const openedLine =
                        item.status === 'accepted' && lastOpenedAt > 0
                          ? t('admin.users.lastOpened', {
                              when: formatDashboardTimestamp(t, language, lastOpenedAt),
                            })
                          : item.status === 'accepted' && !memberActivityLoading
                            ? t('admin.users.neverOpened')
                            : '';
                      const scheduledUntil = contacts.find(
                        (contact) =>
                          contact.deletionScheduledUntil &&
                          normalizeInviteEmail(contact.email) ===
                            normalizeInviteEmail(item.invitedEmail),
                      )?.deletionScheduledUntil;
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'p-4 rounded-2xl border shadow-sm space-y-3',
                            scheduledUntil
                              ? 'border-rose-300 bg-rose-50'
                              : inactive
                                ? 'border-amber-300 bg-amber-50/60'
                                : 'border-slate-100 bg-white',
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="font-bold text-slate-800 truncate">
                                {resolvedInviteDisplayName(
                                  item,
                                  contacts,
                                  memberContactProfileByEmail,
                                )}
                              </p>
                              {isSelf && (
                                <span className="shrink-0 px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[10px] font-bold uppercase">
                                  {t('admin.users.you')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 truncate">{item.invitedEmail}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {resolvedInviteAccessLabel(t, item, contacts)}
                            </p>
                            {openedLine ? (
                              <p
                                className={cn(
                                  'mt-1.5 flex items-center gap-1.5 text-xs',
                                  inactive ? 'font-semibold text-amber-800' : 'text-slate-500',
                                )}
                              >
                                <Clock size={13} className="shrink-0" aria-hidden />
                                <span>{openedLine}</span>
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={cn(
                                'px-3 py-1 rounded-full text-xs font-bold border',
                                statusClass(item.status),
                              )}
                            >
                              {inviteStatusLabelI18n(t, item.status)}
                            </span>
                            {(item.status === 'pending' || item.status === 'accepted') &&
                              !isSelf &&
                              isValidInviteEmail(item.invitedEmail) && (
                                <div className="flex items-center gap-2 ml-auto">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmResendEmail({ kind: 'introduction', source: 'invite', item })
                                    }
                                    disabled={
                                      resendingInviteEmail === normalizeInviteEmail(item.invitedEmail)
                                    }
                                    className="flex items-center gap-1.5 px-3 py-2 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 disabled:opacity-50"
                                  >
                                    {resendingInviteEmail === normalizeInviteEmail(item.invitedEmail) ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Mail size={14} />
                                    )}
                                    {t('admin.users.accessSendInviteEmail')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void requestRevoke(item)}
                                    disabled={revokingEmail === item.invitedEmail}
                                    className="flex items-center gap-1.5 px-3 py-2 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 disabled:opacity-50"
                                  >
                                    {revokingEmail === item.invitedEmail ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <ShieldOff size={14} />
                                    )}
                                    {t('admin.users.revoke')}
                                  </button>
                                </div>
                              )}
                          </div>
                          {scheduledUntil ? <DeletionScheduledNote until={scheduledUntil} /> : null}
                        </div>
                      );
                    })}
                  </div>
                )}

                {pastMembers.length > 0 && (
                  <details className="rounded-2xl border border-slate-100 bg-slate-50/80 open:bg-slate-50">
                    <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none">
                      <History size={16} className="text-slate-400 shrink-0" />
                      <span className="text-sm font-bold text-slate-600 flex-1">{t('admin.users.pastAccess')}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">
                        {pastMembers.length}
                      </span>
                    </summary>
                    <div className="px-4 pb-4 space-y-2">
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        {t('admin.users.pastAccessHint')}
                      </p>
                      {pastMembers.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl border border-slate-100 bg-white/80 opacity-90"
                        >
                          <p className="text-sm font-semibold text-slate-600 truncate">
                            {resolvedInviteDisplayName(
                              item,
                              contacts,
                              memberContactProfileByEmail,
                            )}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{item.invitedEmail}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}
          </div>
        )}
        </div>
      </div>

      <CircleContactEditorModal
        open={editorOpen}
        mode={editorMode}
        draft={draft}
        saving={saving}
        error={editorError}
        remoteStale={remoteStale}
        circleAccessLabel={editorAccess?.label}
        circleAccessBadgeClass={editorAccess?.badgeClass}
        rosterContacts={contacts}
        onRefreshFromRemote={refreshDraftFromRemote}
        onChange={(patch) =>
          setDraft((d) => {
            const next = { ...d, ...patch };
            draftRef.current = next;
            return next;
          })
        }
        onClose={closeEditor}
        onSave={() => void handleSaveContact()}
        onSwitchToEdit={editorMode === 'view' ? switchViewToEdit : undefined}
        onRemove={
          editorMode === 'view'
            ? () => {
                const contact = contacts.find((row) => row.id === draft.id);
                if (!contact) return;
                closeEditor();
                setDeleteContributions(false);
                setConfirmEraseContributions(false);
                setRemoveError('');
                setError(null);
                setConfirmDelete(contact);
              }
            : undefined
        }
      />

      {confirmRevoke && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-[28px] shadow-2xl max-w-sm w-full space-y-5 border border-slate-100">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
              <ShieldOff size={28} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">{t('admin.users.revokeModalTitle')}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {t('admin.users.revokeModalDescription', {
                  name: confirmRevoke.displayName || confirmRevoke.invitedEmail,
                })}
              </p>
              {isValidInviteEmail(confirmRevoke.invitedEmail) && (
                <p className="text-base font-bold text-red-600 break-all px-1">
                  {confirmRevoke.invitedEmail}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmRevoke(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleRevoke(confirmRevoke)}
                disabled={revokingEmail === confirmRevoke.invitedEmail}
                className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold disabled:opacity-50"
              >
                {t('admin.users.revoke')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmResendEmail && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-[28px] shadow-2xl max-w-sm w-full space-y-5 border border-slate-100">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto">
              <Mail size={24} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                {confirmResendEmail.kind === 'contact_added'
                  ? t('admin.users.contactAddedEmailModalTitle')
                  : t('admin.users.resendEmailModalTitle')}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {confirmResendEmail.kind === 'contact_added'
                  ? t('admin.users.contactAddedEmailModalDescription', {
                      email:
                        confirmResendEmail.contact.email,
                      patient: patient.displayName,
                    })
                  : t('admin.users.resendEmailModalDescription', {
                      email:
                        confirmResendEmail.kind === 'introduction' &&
                        confirmResendEmail.source === 'contact'
                          ? confirmResendEmail.contact.email
                          : confirmResendEmail.kind === 'introduction'
                            ? confirmResendEmail.item.invitedEmail
                            : '',
                    })}
              </p>
              <p className="text-base font-bold text-red-600 break-all px-1">
                {confirmResendEmail.kind === 'contact_added'
                  ? confirmResendEmail.contact.email
                  : confirmResendEmail.kind === 'introduction' &&
                      confirmResendEmail.source === 'contact'
                    ? confirmResendEmail.contact.email
                    : confirmResendEmail.item.invitedEmail}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmResendEmail(null)}
                disabled={!!resendingInviteEmail}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void executeResendEmail(confirmResendEmail)}
                disabled={!!resendingInviteEmail}
                className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {resendingInviteEmail ? (
                  <Loader2 size={16} className="animate-spin mx-auto" />
                ) : confirmResendEmail.kind === 'contact_added' ? (
                  t('admin.users.contactAddedEmailConfirm')
                ) : (
                  t('admin.users.resendEmailConfirm')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && !confirmEraseContributions && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-[28px] shadow-2xl max-w-sm w-full space-y-5 border border-slate-100">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">{t('admin.users.deleteModalTitle')}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {t('admin.users.deleteModalDescription', {
                  name:
                    confirmDelete.name ||
                    confirmDelete.email ||
                    t('admin.users.thisPerson'),
                  patient: patient.displayName,
                })}
              </p>
              {confirmDelete.email && isValidInviteEmail(confirmDelete.email) && (
                <p className="text-base font-bold text-red-600 break-all px-1">{confirmDelete.email}</p>
              )}
              {!isPendingProvision && isValidInviteEmail(confirmDelete.email) && (
                <fieldset className="text-left space-y-2 pt-1">
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="remove-contributions"
                      className="mt-1"
                      checked={!deleteContributions}
                      onChange={() => setDeleteContributions(false)}
                    />
                    <span>{t('admin.users.keepContributions')}</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="remove-contributions"
                      className="mt-1"
                      checked={deleteContributions}
                      onChange={() => setDeleteContributions(true)}
                    />
                    <span>{t('admin.users.removeContributions')}</span>
                  </label>
                </fieldset>
              )}
              {removeError ? <p className="text-sm text-red-600">{removeError}</p> : null}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(null);
                  setDeleteContributions(false);
                  setConfirmEraseContributions(false);
                  setRemoveError('');
                  setError(null);
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    !isPendingProvision &&
                    isValidInviteEmail(confirmDelete.email) &&
                    deleteContributions
                  ) {
                    setRemoveError('');
                    setConfirmEraseContributions(true);
                    return;
                  }
                  void proceedDelete(confirmDelete);
                }}
                disabled={saving}
                className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold inline-flex items-center justify-center gap-2 disabled:cursor-wait"
              >
                {saving ? <Loader2 size={16} className="animate-spin shrink-0" /> : null}
                {saving ? t('admin.users.removingProgress') : t('admin.users.removeFromPatientConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && confirmEraseContributions && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-[28px] shadow-2xl max-w-sm w-full space-y-5 border border-slate-100">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
              {saving ? <Loader2 size={24} className="animate-spin" /> : <Trash2 size={24} />}
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                {t('admin.users.eraseContributionsTitle', {
                  name:
                    confirmDelete.name ||
                    confirmDelete.email ||
                    t('admin.users.thisPerson'),
                })}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {saving
                  ? t('admin.users.removingProgressDetail', {
                      name:
                        confirmDelete.name ||
                        confirmDelete.email ||
                        t('admin.users.thisPerson'),
                      patient: patient.displayName,
                    })
                  : t('admin.users.eraseContributionsDescription', {
                      name:
                        confirmDelete.name ||
                        confirmDelete.email ||
                        t('admin.users.thisPerson'),
                      patient: patient.displayName,
                    })}
              </p>
              {removeError ? <p className="text-sm text-red-600">{removeError}</p> : null}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmEraseContributions(false);
                  setRemoveError('');
                }}
                disabled={saving}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold disabled:opacity-50"
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                onClick={() => void proceedDelete(confirmDelete)}
                disabled={saving}
                className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold inline-flex items-center justify-center gap-2 disabled:cursor-wait"
              >
                {saving ? <Loader2 size={16} className="animate-spin shrink-0" /> : null}
                {saving ? t('admin.users.removingProgress') : t('admin.users.eraseContributionsConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <CircleInviteConfirmModal
        open={invitePreviewItems !== null && invitePreviewItems.length > 0}
        items={invitePreviewItems ?? []}
        contacts={contacts}
        draftEmail={inviteConfirmAction?.type === 'save' ? draft.email : undefined}
        onConfirm={() => void handleInviteConfirm()}
        onCancel={() => {
          setInvitePreviewItems(null);
          setInviteConfirmAction(null);
        }}
        isSubmitting={saving || revokingEmail !== null}
        confirmLabel={
          inviteConfirmAction?.type === 'delete'
            ? t('admin.users.deletePerson')
            : inviteConfirmAction?.type === 'revoke'
              ? t('admin.users.removeAccess')
              : undefined
        }
      />
      <CircleAppToast message={toast?.message ?? null} tone={toast?.tone} />
    </>
  );
}
