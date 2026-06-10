import { Loader2, Pencil, X } from 'lucide-react';
import type { CircleContactKind } from '@medxforce/shared';
import { cn } from '../lib/utils';
import {
  CircleContactNotifyGrid,
  notifyKeysForContactKind,
  type CircleNotifyKey,
} from './CircleContactNotifyGrid';

export type ContactEditorDraft = {
  id?: string;
  name: string;
  email: string;
  mobile: string;
  relationship: string;
  kind: CircleContactKind;
  language: string;
  message: boolean;
  sms: boolean;
  alert: boolean;
  attention: boolean;
};

export type ContactEditorMode = 'view' | 'edit' | 'create';

const KIND_OPTIONS: { id: CircleContactKind; label: string; hint: string }[] = [
  { id: 'caregiver', label: 'Caregiver', hint: 'Trusted helper in daily care' },
  { id: 'family', label: 'Family', hint: 'Close family in the support circle' },
  { id: 'friend', label: 'Friend', hint: 'Friend with Circle messaging access' },
  { id: 'contact', label: 'Contact', hint: 'Messaging only — no Circle sign-in' },
];

export const CONTACT_LANGUAGE_OPTIONS = [
  'English',
  'Albanian',
  'Arabic',
  'Bulgarian',
  'Chinese',
  'French',
  'Hindi',
  'Italian',
  'Japanese',
  'Korean',
  'Portuguese',
  'Russian',
];

const RELATIONSHIP_OPTIONS: Record<CircleContactKind, readonly string[]> = {
  caregiver: ['Spouse', 'Partner', 'Child', 'Other'],
  family: ['Family', 'Partner', 'Child', 'Parent', 'Spouse'],
  friend: ['Friend'],
  contact: ['Other'],
};

export function defaultRelationshipForKind(kind: CircleContactKind): string {
  return RELATIONSHIP_OPTIONS[kind][0] ?? 'Other';
}

export function clampRelationship(kind: CircleContactKind, relationship: string): string {
  const value = relationship.trim();
  const allowed = RELATIONSHIP_OPTIONS[kind];
  if (allowed.includes(value)) return value;
  return defaultRelationshipForKind(kind);
}

function defaultNotifyForKind(kind: CircleContactKind): Pick<
  ContactEditorDraft,
  'language' | 'message' | 'sms' | 'alert' | 'attention'
> {
  if (kind === 'contact') {
    return {
      language: 'English',
      message: true,
      sms: false,
      alert: false,
      attention: false,
    };
  }

  return {
    language: 'English',
    message: true,
    sms: true,
    alert: true,
    attention: true,
  };
}

const fieldClass =
  'w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:bg-white transition-all';

const readOnlyValueClass =
  'w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm font-medium text-slate-800';

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
        {label}
      </label>
      <p className={readOnlyValueClass}>{value || '—'}</p>
    </div>
  );
}

function NotifyStatus({
  label,
  enabled,
  requirement,
  tone = 'blue',
}: {
  label: string;
  enabled: boolean;
  requirement?: string;
  tone?: 'blue' | 'red' | 'orange' | 'emerald';
}) {
  const toneClass =
    tone === 'red'
      ? 'bg-red-50 border-red-100 text-red-700'
      : tone === 'orange'
        ? 'bg-orange-50 border-orange-100 text-orange-700'
        : tone === 'emerald'
          ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
          : enabled
            ? 'bg-blue-50 border-blue-100 text-blue-700'
            : 'bg-white border-slate-100 text-slate-500';

  return (
    <div className={cn('p-4 rounded-2xl border text-left', toneClass)}>
      <p className="font-bold text-sm">{label}</p>
      <p className="text-xs mt-1 opacity-80">
        {requirement ?? (enabled ? 'Enabled' : 'Off')}
      </p>
    </div>
  );
}

type CircleContactEditorModalProps = {
  open: boolean;
  mode: ContactEditorMode;
  draft: ContactEditorDraft;
  saving: boolean;
  error: string | null;
  remoteStale?: boolean;
  onRefreshFromRemote?: () => void;
  onChange: (patch: Partial<ContactEditorDraft>) => void;
  onClose: () => void;
  onSave: () => void;
  onSwitchToEdit?: () => void;
  /** Non-proxy self-service: email and mobile are read-only. */
  lockEmailAndMobile?: boolean;
  /** Non-proxy self-service: SMS toggle disabled. */
  lockSmsNotify?: boolean;
  /** Circle sign-in role (e.g. Backup proxy), distinct from person type. */
  circleAccessLabel?: string;
  circleAccessBadgeClass?: string;
};

export function CircleContactEditorModal({
  open,
  mode,
  draft,
  saving,
  error,
  remoteStale = false,
  onRefreshFromRemote,
  onChange,
  onClose,
  onSave,
  onSwitchToEdit,
  lockEmailAndMobile = false,
  lockSmsNotify = false,
  circleAccessLabel,
  circleAccessBadgeClass,
}: CircleContactEditorModalProps) {
  if (!open) return null;

  const isView = mode === 'view';
  const isCreate = mode === 'create';
  const needsEmail = draft.kind !== 'contact';
  const hasEmail = !!draft.email.trim();
  const hasMobile = !!draft.mobile.trim();

  const notifyKeys = notifyKeysForContactKind(draft.kind);

  const handleNotifyToggle = (key: CircleNotifyKey) => {
    onChange({ [key]: !draft[key] });
  };

  const title = isView ? 'View person' : isCreate ? 'Add person' : 'Edit person';
  const subtitle = isView
    ? 'Contact details (read only)'
    : isCreate
      ? 'Choose a type, then fill in their details'
      : 'Update details for this contact';

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg max-h-[92vh] sm:rounded-[32px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {!isView && remoteStale && (
            <div className="text-sm bg-amber-50 border border-amber-100 rounded-xl px-3 py-3 space-y-2">
              <p className="text-amber-900 font-medium">
                This person was updated in the Patient app. Refresh before saving so you do not
                overwrite their changes.
              </p>
              {onRefreshFromRemote && (
                <button
                  type="button"
                  onClick={onRefreshFromRemote}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50"
                >
                  Load latest
                </button>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <section className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Person type
            </h4>
            {isView || mode === 'edit' ? (
              <span className="inline-flex px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 text-xs font-bold uppercase tracking-wide">
                {KIND_OPTIONS.find((k) => k.id === draft.kind)?.label ?? draft.kind}
              </span>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {KIND_OPTIONS.map((option) => {
                  const active = draft.kind === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          kind: option.id,
                          relationship: defaultRelationshipForKind(option.id),
                          ...defaultNotifyForKind(option.id),
                        })
                      }
                      className={cn(
                        'text-left p-3 rounded-2xl border transition-all',
                        active
                          ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100'
                          : 'bg-slate-50 border-slate-100 hover:border-slate-200',
                      )}
                    >
                      <p
                        className={cn(
                          'text-sm font-bold',
                          active ? 'text-blue-700' : 'text-slate-700',
                        )}
                      >
                        {option.label}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{option.hint}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {circleAccessLabel && (isView || mode === 'edit') && (
            <section className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Circle access
              </h4>
              <span
                className={cn(
                  'inline-flex px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide border',
                  circleAccessBadgeClass ?? 'bg-indigo-50 text-indigo-700 border-indigo-100',
                )}
              >
                {circleAccessLabel}
              </span>
              <p className="text-[11px] text-slate-400 leading-snug">
                Sign-in role for the Circle app. Person type above is how they are grouped in the
                care list.
              </p>
            </section>
          )}

          <section className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              User information
            </h4>
            {isView ? (
              <>
                <ReadOnlyField label="Name" value={draft.name} />
                {(draft.kind === 'caregiver' || draft.kind === 'family') && (
                  <ReadOnlyField
                    label="Relationship"
                    value={clampRelationship(draft.kind, draft.relationship)}
                  />
                )}
                <ReadOnlyField label="Language" value={draft.language || 'English'} />
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Name
                  </label>
                  <input
                    value={draft.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    className={fieldClass}
                    placeholder="Full name"
                    autoFocus
                  />
                </div>
                {(draft.kind === 'caregiver' || draft.kind === 'family') && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Relationship
                    </label>
                    <select
                      value={clampRelationship(draft.kind, draft.relationship)}
                      onChange={(e) => onChange({ relationship: e.target.value })}
                      className={fieldClass}
                    >
                      {RELATIONSHIP_OPTIONS[draft.kind].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Language
                  </label>
                  <select
                    value={draft.language || 'English'}
                    onChange={(e) => onChange({ language: e.target.value })}
                    className={fieldClass}
                  >
                    {CONTACT_LANGUAGE_OPTIONS.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </section>

          <section className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Contact details
            </h4>
            {isView ? (
              <>
                <ReadOnlyField label="Email" value={draft.email || '—'} />
                <ReadOnlyField label="Mobile number" value={draft.mobile || '—'} />
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Email
                  </label>
                  {lockEmailAndMobile ? (
                    <p className={readOnlyValueClass}>{draft.email || '—'}</p>
                  ) : (
                    <input
                      type="email"
                      value={draft.email}
                      onChange={(e) => onChange({ email: e.target.value })}
                      className={fieldClass}
                      placeholder={needsEmail ? 'Required for Circle invite' : 'Optional'}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Mobile number
                  </label>
                  {lockEmailAndMobile ? (
                    <p className={readOnlyValueClass}>{draft.mobile || '—'}</p>
                  ) : (
                    <input
                      type="tel"
                      value={draft.mobile}
                      onChange={(e) => onChange({ mobile: e.target.value })}
                      className={fieldClass}
                      placeholder="Optional"
                    />
                  )}
                </div>
                {lockEmailAndMobile && (
                  <p className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    Email and mobile can only be changed by a proxy in User management.
                  </p>
                )}
                {!lockEmailAndMobile && needsEmail && !draft.email.trim() && (
                  <p className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    Add an email so this person can sign in to MedXForce Circle.
                  </p>
                )}
              </>
            )}
          </section>

          <section className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Notify me
            </h4>
            {isView ? (
              <div className="grid grid-cols-2 gap-3">
                {notifyKeys.includes('alert') && (
                  <NotifyStatus
                    label="Alert"
                    enabled={draft.alert && hasEmail}
                    tone="red"
                    requirement={hasEmail ? undefined : 'Email required'}
                  />
                )}
                {notifyKeys.includes('attention') && (
                  <NotifyStatus
                    label="Attention"
                    enabled={draft.attention && hasEmail}
                    tone="orange"
                    requirement={hasEmail ? undefined : 'Email required'}
                  />
                )}
                <NotifyStatus
                  label="Message"
                  enabled={draft.message && hasEmail}
                  requirement={hasEmail ? undefined : 'Email required'}
                />
                <NotifyStatus
                  label="SMS"
                  enabled={draft.sms && hasMobile}
                  tone="emerald"
                  requirement={hasMobile ? undefined : 'Mobile required'}
                />
              </div>
            ) : (
              <CircleContactNotifyGrid
                values={{
                  alert: draft.alert,
                  attention: draft.attention,
                  message: draft.message,
                  sms: draft.sms,
                }}
                hasEmail={hasEmail}
                hasMobile={hasMobile}
                keys={notifyKeys}
                lockSms={lockSmsNotify}
                onToggle={handleNotifyToggle}
              />
            )}
          </section>
        </div>

        <div className="shrink-0 p-5 border-t border-slate-100 flex gap-3 bg-white">
          {isView ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Close
              </button>
              {onSwitchToEdit && (
                <button
                  type="button"
                  onClick={onSwitchToEdit}
                  className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <Pencil size={16} />
                  Edit
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving || remoteStale}
                className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? 'Saving…' : isCreate ? 'Add person' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
