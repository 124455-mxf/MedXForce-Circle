import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import { History, Loader2, Pencil, Plus, RefreshCw, ShieldOff, Trash2, Users } from 'lucide-react';
import {
  clampRelationship,
  CircleContactEditorModal,
  defaultRelationshipForKind,
  type ContactEditorDraft,
  type ContactEditorMode,
} from './CircleContactEditorModal';
import { CircleInviteConfirmModal } from './CircleInviteConfirmModal';
import {
  ContactConflictError,
  deletePatientManagedContact,
  listPatientManagedContacts,
  listCircleInvitesForPatient,
  normalizeInviteEmail,
  parsePatientManagedContacts,
  previewCircleAccessRevoke,
  previewManagedContactDeleteInviteChange,
  previewManagedContactInviteChange,
  readPatientDocUpdatedAt,
  revokeCircleInviteByEmail,
  upsertPatientManagedContact,
  type CircleContactKind,
  type CircleInviteListItem,
  type CircleInvitePreviewItem,
  type CircleManagedContact,
  type CircleMemberRole,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { circleTabButtonClass, circleTabListClass } from '../lib/circleSectionStyles';
import { isFirestoreQuotaError, pauseFirestoreBackgroundWrites } from '../lib/firestoreQuota';
import { cn } from '../lib/utils';

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

const ROLE_LABELS: Record<CircleMemberRole, string> = {
  friend: 'Friend',
  family: 'Family',
  caregiver: 'Caregiver',
  professional_caregiver: 'Professional caregiver',
  proxy: 'Proxy',
  facility_staff: 'Facility staff',
};

const KIND_LABEL: Record<CircleContactKind, string> = {
  caregiver: 'Caregiver',
  family: 'Family',
  friend: 'Friend',
  contact: 'Contact',
};

const KIND_BADGE: Record<CircleContactKind, string> = {
  caregiver: 'bg-violet-50 text-violet-700 border-violet-100',
  family: 'bg-blue-50 text-blue-700 border-blue-100',
  friend: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  contact: 'bg-slate-100 text-slate-600 border-slate-200',
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role as CircleMemberRole] ?? role.replace(/_/g, ' ');
}

function statusLabel(status: CircleInviteListItem['status']) {
  if (status === 'accepted') return 'Active';
  if (status === 'revoked') return 'Revoked';
  return 'Pending';
}

function statusClass(status: CircleInviteListItem['status']) {
  if (status === 'accepted') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'revoked') return 'bg-slate-100 text-slate-500 border-slate-200';
  return 'bg-amber-50 text-amber-700 border-amber-100';
}

function contactToDraft(contact: CircleManagedContact): ContactEditorDraft {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    mobile: contact.mobile,
    relationship: contact.relationship,
    kind: contact.kind,
    language: contact.language ?? 'English',
    message: contact.message ?? true,
    sms: contact.sms ?? false,
    alert: contact.alert ?? true,
    attention: contact.attention ?? true,
  };
}

function draftFingerprint(draft: ContactEditorDraft): string {
  return JSON.stringify({
    id: draft.id ?? '',
    name: draft.name.trim(),
    email: draft.email.trim(),
    mobile: draft.mobile.trim(),
    relationship: draft.relationship.trim(),
    kind: draft.kind,
    language: draft.language.trim(),
    message: draft.message,
    sms: draft.sms,
    alert: draft.alert,
    attention: draft.attention,
  });
}

const EMPTY_DRAFT: ContactEditorDraft = {
  name: '',
  email: '',
  mobile: '',
  relationship: 'Spouse',
  kind: 'caregiver',
  language: 'English',
  message: true,
  sms: true,
  alert: true,
  attention: true,
};

interface CircleSettingsUserManagementPanelProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary | null;
  /** Admin embed: hide section icon/title and patient name in subtitle. */
  compact?: boolean;
}

function isCurrentUserInvite(item: CircleInviteListItem, user: User): boolean {
  const authEmail = normalizeInviteEmail(user.email || '');
  if (authEmail && authEmail === normalizeInviteEmail(item.invitedEmail)) return true;
  if (item.acceptedByUid && item.acceptedByUid === user.uid) return true;
  return false;
}

function PersonRow({
  contact,
  onView,
  onEdit,
  onDelete,
}: {
  contact: CircleManagedContact;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
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
      className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 cursor-pointer hover:border-slate-200 hover:bg-slate-50/50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <p className="font-bold text-slate-800 truncate">{contact.name || 'Unnamed'}</p>
          <span
            className={cn(
              'shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border',
              KIND_BADGE[contact.kind],
            )}
          >
            {KIND_LABEL[contact.kind]}
          </span>
        </div>
        <p className="text-sm text-slate-500 truncate mt-0.5">
          {contact.relationship || '—'}
          {contact.email ? ` · ${contact.email}` : ' · No email'}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100"
        aria-label="Edit"
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-2.5 rounded-xl text-red-500 hover:bg-red-50"
        aria-label="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export function CircleSettingsUserManagementPanel({
  user,
  db,
  patient,
  compact = false,
}: CircleSettingsUserManagementPanelProps) {
  const [tab, setTab] = useState<PanelTab>('people');
  const [members, setMembers] = useState<CircleInviteListItem[]>([]);
  const [contacts, setContacts] = useState<CircleManagedContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<CircleInviteListItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CircleManagedContact | null>(null);
  const [invitePreviewItems, setInvitePreviewItems] = useState<CircleInvitePreviewItem[] | null>(
    null,
  );
  const [inviteConfirmAction, setInviteConfirmAction] = useState<InviteConfirmAction | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<ContactEditorMode>('edit');
  const [draft, setDraft] = useState<ContactEditorDraft>(EMPTY_DRAFT);
  const [patientDocUpdatedAt, setPatientDocUpdatedAt] = useState(0);
  const [editorBaselineUpdatedAt, setEditorBaselineUpdatedAt] = useState(0);
  const [initialDraftFingerprint, setInitialDraftFingerprint] = useState('');
  const [remoteStale, setRemoteStale] = useState(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const loadMembers = useCallback(async () => {
    if (!patient?.patientId) {
      setMembers([]);
      setContacts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [rows, listedContacts] = await Promise.all([
        listCircleInvitesForPatient(db, patient.patientId),
        listPatientManagedContacts(db, patient.patientId),
      ]);
      setMembers(rows);
      setContacts(listedContacts);
    } catch (err) {
      console.warn('[CircleSettingsUserManagementPanel]', err);
      setError('Could not load. Try refresh.');
    } finally {
      setLoading(false);
    }
  }, [db, patient?.patientId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (!patient?.patientId) {
      setContacts([]);
      setPatientDocUpdatedAt(0);
      return;
    }

    return onSnapshot(
      doc(db, 'patients', patient.patientId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const updatedAt = readPatientDocUpdatedAt(data);
        const listed = parsePatientManagedContacts(data);
        setContacts(listed);
        setPatientDocUpdatedAt(updatedAt);
      },
      (err) => {
        console.warn('[CircleSettingsUserManagementPanel] live contacts', err);
      },
    );
  }, [db, patient?.patientId]);

  useEffect(() => {
    if (!editorOpen || editorMode === 'view') {
      if (!editorOpen) setRemoteStale(false);
      return;
    }
    if (patientDocUpdatedAt <= editorBaselineUpdatedAt) return;

    const currentDraft = draftRef.current;
    const remoteContact = currentDraft.id
      ? contacts.find((contact) => contact.id === currentDraft.id)
      : undefined;
    if (!remoteContact) return;

    const dirty = draftFingerprint(currentDraft) !== initialDraftFingerprint;
    if (!dirty) {
      const refreshed = contactToDraft(remoteContact);
      setDraft(refreshed);
      setInitialDraftFingerprint(draftFingerprint(refreshed));
      setEditorBaselineUpdatedAt(patientDocUpdatedAt);
      setRemoteStale(false);
      return;
    }

    setRemoteStale(true);
  }, [
    contacts,
    editorBaselineUpdatedAt,
    editorMode,
    editorOpen,
    initialDraftFingerprint,
    patientDocUpdatedAt,
  ]);

  useEffect(() => {
    if (!editorOpen || editorMode !== 'view') return;
    const currentDraft = draftRef.current;
    if (!currentDraft.id) return;
    const remoteContact = contacts.find((contact) => contact.id === currentDraft.id);
    if (!remoteContact) return;
    setDraft(contactToDraft(remoteContact));
  }, [contacts, editorMode, editorOpen]);

  const { activeMembers, pastMembers } = useMemo(() => {
    const active: CircleInviteListItem[] = [];
    const past: CircleInviteListItem[] = [];
    for (const item of members) {
      if (item.status === 'revoked') past.push(item);
      else active.push(item);
    }
    return { activeMembers: active, pastMembers: past };
  }, [members]);

  const sortedContacts = useMemo(() => {
    const order: CircleContactKind[] = ['caregiver', 'family', 'friend', 'contact'];
    return [...contacts].sort((a, b) => {
      const kindDiff = order.indexOf(a.kind) - order.indexOf(b.kind);
      if (kindDiff !== 0) return kindDiff;
      return (a.name || a.email).localeCompare(b.name || b.email);
    });
  }, [contacts]);

  const handleRevoke = async (item: CircleInviteListItem) => {
    if (!patient?.patientId) return;
    setRevokingEmail(item.invitedEmail);
    setError(null);
    try {
      const ok = await revokeCircleInviteByEmail(db, patient.patientId, item.invitedEmail, {
        actorUid: user.uid,
      });
      if (!ok) {
        setError('Could not revoke access.');
        return;
      }
      setConfirmRevoke(null);
      await loadMembers();
    } catch (err) {
      console.warn('[CircleSettingsUserManagementPanel] revoke', err);
      if (isFirestoreQuotaError(err)) {
        pauseFirestoreBackgroundWrites(String(err));
        setError('Firestore daily write limit reached. Try again after midnight Pacific.');
      } else {
        setError('Could not revoke access.');
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
      const preview = await previewCircleAccessRevoke(
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

  const openEditorWithDraft = (nextDraft: ContactEditorDraft, mode: ContactEditorMode) => {
    setDraft(nextDraft);
    setEditorMode(mode);
    if (mode !== 'view') {
      setInitialDraftFingerprint(draftFingerprint(nextDraft));
      setEditorBaselineUpdatedAt(patientDocUpdatedAt);
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
    openEditorWithDraft(contactToDraft(contact), 'view');
  };

  const openEdit = (contact: CircleManagedContact) => {
    openEditorWithDraft(contactToDraft(contact), 'edit');
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
    setEditorBaselineUpdatedAt(patientDocUpdatedAt);
    setRemoteStale(false);
    setEditorError(null);
  };

  const refreshDraftFromRemote = () => {
    const currentDraft = draftRef.current;
    const remoteContact = currentDraft.id
      ? contacts.find((contact) => contact.id === currentDraft.id)
      : undefined;
    if (!remoteContact) return;
    const refreshed = contactToDraft(remoteContact);
    setDraft(refreshed);
    setInitialDraftFingerprint(draftFingerprint(refreshed));
    setEditorBaselineUpdatedAt(patientDocUpdatedAt);
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
    setEditorBaselineUpdatedAt(0);
  };

  const persistContact = async () => {
    if (!patient?.patientId) return;
    const currentDraft = draftRef.current;
    const normalizedEmail = currentDraft.email.trim();
    const normalizedMobile = currentDraft.mobile.trim();
    const nextMessage = currentDraft.message && !!normalizedEmail;
    const nextSms = currentDraft.sms && !!normalizedMobile;

    await upsertPatientManagedContact(
      db,
      patient.patientId,
      {
        id: currentDraft.id,
        name: currentDraft.name,
        email: normalizedEmail,
        mobile: normalizedMobile,
        relationship: clampRelationship(currentDraft.kind, currentDraft.relationship),
        kind: currentDraft.kind,
        language: currentDraft.language || 'English',
        message: nextMessage,
        sms: nextSms,
        alert: currentDraft.alert && !!normalizedEmail,
        attention: currentDraft.attention && !!normalizedEmail,
      },
      { expectedPatientUpdatedAt: editorBaselineUpdatedAt },
    );
    closeEditor();
    await loadMembers();
  };

  const handleSaveContact = async () => {
    if (!patient?.patientId) return;
    if (!draft.name.trim()) {
      setEditorError('Name is required.');
      return;
    }
    if (draft.kind !== 'contact' && !draft.email.trim()) {
      setEditorError('Email is required for caregivers, family, and friends.');
      return;
    }
    if (draft.email.trim() && !isValidInviteEmail(draft.email)) {
      setEditorError('Enter a valid email address (e.g. name@example.com).');
      return;
    }

    if (remoteStale) {
      setEditorError('Load the latest version before saving.');
      return;
    }

    setSaving(true);
    setEditorError(null);
    try {
      const previous = draft.id ? contacts.find((contact) => contact.id === draft.id) : undefined;
      const preview = await previewManagedContactInviteChange(
        db,
        patient.patientId,
        {
          id: draft.id,
          name: draft.name,
          email: draft.email,
          kind: draft.kind,
        },
        { previousEmail: previous?.email },
      );
      if (preview.length > 0) {
        setInvitePreviewItems(preview);
        setInviteConfirmAction({ type: 'save' });
        return;
      }
      await persistContact();
    } catch (err) {
      console.warn('[CircleSettingsUserManagementPanel] save', err);
      if (err instanceof ContactConflictError) {
        setRemoteStale(true);
        setEditorError(err.message);
      } else {
        setEditorError(err instanceof Error ? err.message : 'Could not save.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInviteConfirm = async () => {
    setSaving(true);
    try {
      if (inviteConfirmAction?.type === 'delete') {
        await handleDeleteContact(inviteConfirmAction.contact);
      } else if (inviteConfirmAction?.type === 'revoke') {
        await handleRevoke(inviteConfirmAction.item);
      } else {
        await persistContact();
      }
      setInvitePreviewItems(null);
      setInviteConfirmAction(null);
    } catch (err) {
      console.warn('[CircleSettingsUserManagementPanel] invite confirm', err);
      if (inviteConfirmAction?.type === 'save') {
        if (err instanceof ContactConflictError) {
          setRemoteStale(true);
          setEditorError(err.message);
        } else {
          setEditorError(err instanceof Error ? err.message : 'Could not save.');
        }
      } else if (isFirestoreQuotaError(err)) {
        pauseFirestoreBackgroundWrites(String(err));
        setError('Firestore daily write limit reached. Try again after midnight Pacific.');
      }
      setInvitePreviewItems(null);
      setInviteConfirmAction(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async (contact: CircleManagedContact) => {
    if (!patient?.patientId) return;
    setError(null);
    try {
      await deletePatientManagedContact(db, patient.patientId, contact);
      setConfirmDelete(null);
      await loadMembers();
    } catch (err) {
      console.warn('[CircleSettingsUserManagementPanel] delete', err);
      if (isFirestoreQuotaError(err)) {
        pauseFirestoreBackgroundWrites(String(err));
        setError('Firestore daily write limit reached. Try again after midnight Pacific.');
      } else {
        setError('Could not delete contact.');
      }
      throw err;
    }
  };

  const proceedDelete = async (contact: CircleManagedContact) => {
    if (!patient?.patientId) return;
    setSaving(true);
    setError(null);
    try {
      const preview = await previewManagedContactDeleteInviteChange(db, patient.patientId, contact);
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
        setError('Firestore daily write limit reached. Try again after midnight Pacific.');
      } else {
        setError('Could not delete contact.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return (
      <div className="p-5">
        <p className="text-sm text-slate-500 leading-relaxed">
          Select someone you are caring for on the home screen first.
        </p>
      </div>
    );
  }

  if (!patient.capabilities.inviteMembers) {
    return (
      <div className="p-5">
        <p className="text-sm text-slate-500 leading-relaxed">
          User management is only available to proxies for this circle.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={cn('space-y-5', compact ? 'p-4' : 'p-5')}>
        {!compact && (
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-800">User management</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                People and Circle access for {patient.displayName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadMembers()}
              disabled={loading}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 shrink-0 disabled:opacity-50"
              aria-label="Refresh"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className={cn(circleTabListClass, 'flex-1 min-w-0')} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'people'}
              onClick={() => setTab('people')}
              className={circleTabButtonClass(tab === 'people')}
            >
              People
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'access'}
              onClick={() => setTab('access')}
              className={circleTabButtonClass(tab === 'access')}
            >
              Circle access
            </button>
          </div>
          {compact && (
            <button
              type="button"
              onClick={() => void loadMembers()}
              disabled={loading}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 shrink-0 disabled:opacity-50"
              aria-label="Refresh"
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

        {tab === 'people' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={openCreate}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
            >
              <Plus size={18} />
              Add person
            </button>

            {loading && contacts.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">Loading…</div>
            ) : sortedContacts.length === 0 ? (
              <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-400">No people added yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedContacts.map((contact) => (
                  <PersonRow
                    key={contact.id}
                    contact={contact}
                    onView={() => openView(contact)}
                    onEdit={() => openEdit(contact)}
                    onDelete={() => setConfirmDelete(contact)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'access' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed px-1">
              Caregivers, family, and friends with an email are invited to sign in here automatically.
            </p>

            {loading && members.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">Loading…</div>
            ) : activeMembers.length === 0 && pastMembers.length === 0 ? (
              <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-400">No Circle invites yet.</p>
              </div>
            ) : (
              <>
                {activeMembers.length > 0 && (
                  <div className="space-y-2">
                    {activeMembers.map((item) => {
                      const isSelf = isCurrentUserInvite(item, user);
                      return (
                        <div
                          key={item.id}
                          className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="font-bold text-slate-800 truncate">
                                {item.displayName || item.invitedEmail}
                              </p>
                              {isSelf && (
                                <span className="shrink-0 px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[10px] font-bold uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 truncate">{item.invitedEmail}</p>
                            <p className="text-xs text-slate-400 mt-1">{roleLabel(item.role)}</p>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                'px-3 py-1 rounded-full text-xs font-bold border',
                                statusClass(item.status),
                              )}
                            >
                              {statusLabel(item.status)}
                            </span>
                            {(item.status === 'pending' || item.status === 'accepted') &&
                              !isSelf && (
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
                                  Revoke
                                </button>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {pastMembers.length > 0 && (
                  <details className="rounded-2xl border border-slate-100 bg-slate-50/80 open:bg-slate-50">
                    <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none">
                      <History size={16} className="text-slate-400 shrink-0" />
                      <span className="text-sm font-bold text-slate-600 flex-1">Past access</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">
                        {pastMembers.length}
                      </span>
                    </summary>
                    <div className="px-4 pb-4 space-y-2">
                      {pastMembers.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl border border-slate-100 bg-white/80 opacity-90"
                        >
                          <p className="text-sm font-semibold text-slate-600 truncate">
                            {item.displayName || item.invitedEmail}
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

      <CircleContactEditorModal
        open={editorOpen}
        mode={editorMode}
        draft={draft}
        saving={saving}
        error={editorError}
        remoteStale={remoteStale}
        onRefreshFromRemote={refreshDraftFromRemote}
        onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        onClose={closeEditor}
        onSave={() => void handleSaveContact()}
        onSwitchToEdit={editorMode === 'view' ? switchViewToEdit : undefined}
      />

      {confirmRevoke && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-[28px] shadow-2xl max-w-sm w-full space-y-5 border border-slate-100">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
              <ShieldOff size={28} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Revoke access?</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {confirmRevoke.displayName || confirmRevoke.invitedEmail} will no longer sign in for
                this circle.
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
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRevoke(confirmRevoke)}
                disabled={revokingEmail === confirmRevoke.invitedEmail}
                className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold disabled:opacity-50"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-[28px] shadow-2xl max-w-sm w-full space-y-5 border border-slate-100">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Remove person?</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Remove {confirmDelete.name || confirmDelete.email || 'this person'} from{' '}
                {patient.displayName}&apos;s lists?
              </p>
              {confirmDelete.email && isValidInviteEmail(confirmDelete.email) && (
                <p className="text-base font-bold text-red-600 break-all px-1">{confirmDelete.email}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void proceedDelete(confirmDelete)}
                disabled={saving}
                className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-bold disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <CircleInviteConfirmModal
        open={invitePreviewItems !== null && invitePreviewItems.length > 0}
        items={invitePreviewItems ?? []}
        onConfirm={() => void handleInviteConfirm()}
        onCancel={() => {
          setInvitePreviewItems(null);
          setInviteConfirmAction(null);
        }}
        isSubmitting={saving || revokingEmail !== null}
        confirmLabel={
          inviteConfirmAction?.type === 'delete'
            ? 'Delete person'
            : inviteConfirmAction?.type === 'revoke'
              ? 'Remove access'
              : undefined
        }
      />
    </>
  );
}
