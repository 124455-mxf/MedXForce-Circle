import { Loader2, Pencil, ShieldOff, Trash2, X } from 'lucide-react';
import type { CircleContactKind, CircleManagedContact } from '@medxforce/shared';
import { composeContactDisplayName } from '@medxforce/shared';
import { CIRCLE_UI_LANGUAGES, circleUiLanguageLabel, formatCircleDate, type CircleUiLanguage } from '../lib/circleLanguages';
import { cn } from '../lib/utils';
import { useCircleI18nContext, useCircleT, type CircleTranslator } from '../lib/circleI18nContext';
import { contactKindLabelI18n, relationshipLabelI18n } from '../lib/adminScreenI18n';
import {
  circleAccessOptionDescriptionKey,
  circleAccessOptionLabelKey,
  circleAccessOptionsForDraft,
  defaultCircleAccessOptionForKind,
  findBackupProxyContact,
  findPrimaryProxyContact,
  type CircleAccessOptionId,
} from '../lib/circleContactAccessOptions';
import {
  CircleContactNotifyGrid,
  notifyKeysForContactKind,
  type CircleNotifyKey,
} from './CircleContactNotifyGrid';
import { CircleContactNotifyIconStrip } from './CircleContactNotifyIconStrip';

export type ContactEditorDraft = {
  id?: string;
  name: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  mobile: string;
  relationship: string;
  kind: CircleContactKind;
  language: string;
  message: boolean;
  sms: boolean;
  alert: boolean;
  attention: boolean;
  circleAccessOption: CircleAccessOptionId;
};

export type ContactEditorMode = 'view' | 'edit' | 'create';

function kindOptions(t: CircleTranslator): { id: CircleContactKind; label: string; hint: string }[] {
  return [
    { id: 'caregiver', label: t('admin.contact.kindCaregiver'), hint: t('admin.contact.kindCaregiverHint') },
    { id: 'family', label: t('admin.contact.kindFamily'), hint: t('admin.contact.kindFamilyHint') },
    { id: 'friend', label: t('admin.contact.kindFriend'), hint: t('admin.contact.kindFriendHint') },
    { id: 'contact', label: t('admin.contact.kindContact'), hint: t('admin.contact.kindContactHint') },
  ];
}

/** UI languages for Circle members — matches patient app primary languages (EN/DE/ES/PL). */
export const CONTACT_LANGUAGE_OPTIONS = CIRCLE_UI_LANGUAGES.map((entry) => entry.value);

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

function formatContactDob(value: string, language: CircleUiLanguage): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value.trim();
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return value.trim();
  return formatCircleDate(date, language, { month: 'long', day: 'numeric', year: 'numeric' });
}

function personDisplayName(draft: ContactEditorDraft): string {
  return (
    draft.name.trim() ||
    [draft.firstName.trim(), draft.lastName.trim()].filter(Boolean).join(' ')
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
  /** View person: open the remove-from-patient confirmation. */
  onRemove?: () => void;
  /** View person: open the revoke-Circle-access confirmation. */
  onRevoke?: () => void;
  /** Non-proxy self-service: email and mobile are read-only. */
  lockEmailAndMobile?: boolean;
  /** Non-proxy self-service: SMS toggle disabled. */
  lockSmsNotify?: boolean;
  /** Circle sign-in role (e.g. Backup proxy), distinct from person type. */
  circleAccessLabel?: string;
  circleAccessBadgeClass?: string;
  /** Existing contacts — used to offer primary/backup proxy roles. */
  rosterContacts?: CircleManagedContact[];
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
  onRemove,
  onRevoke,
  lockEmailAndMobile = false,
  lockSmsNotify = false,
  circleAccessLabel,
  rosterContacts = [],
}: CircleContactEditorModalProps) {
  const t = useCircleT();
  const { language } = useCircleI18nContext();
  if (!open) return null;

  const kinds = kindOptions(t);
  const empty = t('admin.profile.emptyValue');
  const accessOptions = circleAccessOptionsForDraft(rosterContacts, draft);
  const showCircleAccess = draft.kind !== 'contact' && accessOptions.length > 0;
  const selectedAccessOption = accessOptions.includes(draft.circleAccessOption)
    ? draft.circleAccessOption
    : accessOptions[0] ?? draft.circleAccessOption;
  const otherPrimary = findPrimaryProxyContact(rosterContacts, draft.id);
  const otherBackup = findBackupProxyContact(rosterContacts, draft.id);
  const showPrimaryTaken =
    !!otherPrimary && draft.circleAccessOption !== 'proxy_primary';
  const showBackupTaken =
    !!otherBackup && draft.circleAccessOption !== 'proxy_backup';
  const showFamilyBackupNote =
    draft.kind === 'family' && accessOptions.includes('proxy_backup');

  const isView = mode === 'view';
  const isCreate = mode === 'create';
  const needsEmail = draft.kind !== 'contact';
  const hasEmail = !!draft.email.trim();
  const hasMobile = !!draft.mobile.trim();

  const notifyKeys = notifyKeysForContactKind(draft.kind);

  const handleNotifyToggle = (key: CircleNotifyKey) => {
    onChange({ [key]: !draft[key] });
  };

  const personName = personDisplayName(draft);
  const kindLabel = contactKindLabelI18n(t, draft.kind);
  const relationshipLabel =
    draft.kind === 'caregiver' || draft.kind === 'family'
      ? relationshipLabelI18n(t, clampRelationship(draft.kind, draft.relationship))
      : '';
  const accessLabel = showCircleAccess
    ? (circleAccessLabel ?? t(circleAccessOptionLabelKey(selectedAccessOption)))
    : (circleAccessLabel ?? '');
  const viewMeta = [kindLabel, relationshipLabel].filter(Boolean);
  if (accessLabel && accessLabel.trim().toLowerCase() !== kindLabel.trim().toLowerCase()) {
    viewMeta.push(accessLabel);
  }
  const viewFacts = [
    { label: t('admin.contact.fieldDob'), value: formatContactDob(draft.dateOfBirth, language) },
    { label: t('admin.contact.fieldEmail'), value: draft.email.trim() },
    { label: t('admin.contact.fieldMobile'), value: draft.mobile.trim() },
    {
      label: t('admin.contact.fieldLanguage'),
      value: circleUiLanguageLabel(t, draft.language || 'English'),
    },
  ].filter((row) => row.value);

  const title = isView
    ? personName || t('admin.contact.viewTitle')
    : isCreate
      ? t('admin.contact.addTitle')
      : t('admin.contact.editTitle');
  const subtitle = isView
    ? viewMeta.join(' · ')
    : isCreate
      ? t('admin.contact.addSubtitle')
      : [personName, kindLabel].filter(Boolean).join(' · ') || t('admin.contact.editSubtitle');

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
            aria-label={t('admin.contact.closeAria')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {!isView && remoteStale && (
            <div className="text-sm bg-amber-50 border border-amber-100 rounded-xl px-3 py-3 space-y-2">
              <p className="text-amber-900 font-medium">{t('admin.contact.staleMessage')}</p>
              {onRefreshFromRemote && (
                <button
                  type="button"
                  onClick={onRefreshFromRemote}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50"
                >
                  {t('admin.contact.loadLatest')}
                </button>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {isView ? (
            <div className="space-y-6">
              {viewFacts.length > 0 ? (
                <dl className="divide-y divide-slate-100 border-y border-slate-100">
                  {viewFacts.map((row) => (
                    <div key={row.label} className="flex items-baseline justify-between gap-4 py-3">
                      <dt className="text-sm text-slate-500">{row.label}</dt>
                      <dd className="max-w-[65%] text-right text-sm font-semibold text-slate-900 break-words">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-800">{t('admin.contact.notifyMe')}</h4>
                <CircleContactNotifyIconStrip
                  values={{
                    alert: draft.alert,
                    attention: draft.attention,
                    message: draft.message,
                    sms: draft.sms,
                  }}
                  kind={draft.kind}
                  hasEmail={hasEmail}
                  hasMobile={hasMobile}
                />
              </div>
            </div>
          ) : null}

          {isCreate && (
          <section className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('admin.contact.personType')}
            </h4>
              <div className="grid grid-cols-2 gap-2">
                {kinds.map((option) => {
                  const active = draft.kind === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          kind: option.id,
                          relationship: defaultRelationshipForKind(option.id),
                          circleAccessOption: defaultCircleAccessOptionForKind(option.id),
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
          </section>
          )}

          {!isView && (
          <>
          {showCircleAccess && (
            <section className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t('admin.contact.circleAccess')}
              </h4>
                <>
                  {showFamilyBackupNote && (
                    <p className="text-xs text-slate-500 leading-relaxed bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
                      {t('admin.contact.circleAccessBackupFromFamilyNote')}
                    </p>
                  )}
                  {(showPrimaryTaken || showBackupTaken) && (
                    <p className="text-xs text-amber-800 leading-relaxed bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                      {t('admin.contact.circleAccessOnlyTwoProxies')}{' '}
                      {showPrimaryTaken ? (
                        <>
                          {t('admin.contact.circleAccessPrimaryTakenNote')}{' '}
                          <strong className="font-semibold text-amber-950">
                            {otherPrimary?.name?.trim() || t('circle.rolePrimaryProxy')}
                          </strong>
                          .{' '}
                        </>
                      ) : null}
                      {showBackupTaken ? (
                        <>
                          {t('admin.contact.circleAccessBackupTakenNote')}{' '}
                          <strong className="font-semibold text-amber-950">
                            {otherBackup?.name?.trim() || t('circle.roleBackupProxy')}
                          </strong>
                          .{' '}
                        </>
                      ) : null}
                      {t('admin.contact.circleAccessTakenChange')}
                    </p>
                  )}
                  <select
                    value={selectedAccessOption}
                    onChange={(e) =>
                      onChange({ circleAccessOption: e.target.value as CircleAccessOptionId })
                    }
                    className={fieldClass}
                  >
                    {accessOptions.map((option) => (
                      <option key={option} value={option}>
                        {t(circleAccessOptionLabelKey(option))}
                      </option>
                    ))}
                  </select>
                  <div className="p-3 rounded-xl border border-violet-100 bg-violet-50/60">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(circleAccessOptionDescriptionKey(selectedAccessOption))}
                    </p>
                  </div>
                  {mode === 'edit' ? (
                    <div className="space-y-2 rounded-xl bg-slate-50 px-3 py-3 text-xs leading-relaxed text-slate-500">
                      <p>{t('admin.contact.moveToCaregiver')}</p>
                      <p>{t('admin.contact.moveToFamily')}</p>
                    </div>
                  ) : null}
                </>
            </section>
          )}

          <section className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('admin.contact.userInfo')}
            </h4>
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      {t('admin.contact.fieldFirstName')}
                    </label>
                    <input
                      value={draft.firstName}
                      onChange={(e) => {
                        const firstName = e.target.value;
                        onChange({
                          firstName,
                          name: composeContactDisplayName({
                            firstName,
                            lastName: draft.lastName,
                            name: draft.name,
                          }),
                        });
                      }}
                      className={fieldClass}
                      placeholder={t('admin.contact.placeholderFirstName')}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      {t('admin.contact.fieldLastName')}
                    </label>
                    <input
                      value={draft.lastName}
                      onChange={(e) => {
                        const lastName = e.target.value;
                        onChange({
                          lastName,
                          name: composeContactDisplayName({
                            firstName: draft.firstName,
                            lastName,
                            name: draft.name,
                          }),
                        });
                      }}
                      className={fieldClass}
                      placeholder={t('admin.contact.placeholderLastName')}
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    {t('admin.contact.fieldName')}
                  </label>
                  <input
                    value={draft.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    className={fieldClass}
                    placeholder={t('admin.contact.placeholderFullName')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    {t('admin.contact.fieldDob')}
                  </label>
                  <input
                    type="date"
                    value={draft.dateOfBirth}
                    onChange={(e) => onChange({ dateOfBirth: e.target.value })}
                    className={fieldClass}
                    autoComplete="bday"
                  />
                </div>
                {(draft.kind === 'caregiver' || draft.kind === 'family') && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      {t('admin.contact.fieldRelationship')}
                    </label>
                    <select
                      value={clampRelationship(draft.kind, draft.relationship)}
                      onChange={(e) => onChange({ relationship: e.target.value })}
                      className={fieldClass}
                    >
                      {RELATIONSHIP_OPTIONS[draft.kind].map((option) => (
                        <option key={option} value={option}>
                          {relationshipLabelI18n(t, option)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    {t('admin.contact.fieldLanguage')}
                  </label>
                  <select
                    value={draft.language || 'English'}
                    onChange={(e) => onChange({ language: e.target.value })}
                    className={fieldClass}
                  >
                    {CONTACT_LANGUAGE_OPTIONS.map((lang) => (
                      <option key={lang} value={lang}>
                        {circleUiLanguageLabel(t, lang)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('admin.contact.contactDetails')}
            </h4>
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    {t('admin.contact.fieldEmail')}
                  </label>
                  {lockEmailAndMobile ? (
                    <p className={readOnlyValueClass}>{draft.email || empty}</p>
                  ) : (
                    <input
                      type="email"
                      value={draft.email}
                      onChange={(e) => onChange({ email: e.target.value })}
                      className={fieldClass}
                      placeholder={
                        needsEmail
                          ? t('admin.contact.placeholderEmailRequired')
                          : t('admin.contact.placeholderEmailOptional')
                      }
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    {t('admin.contact.fieldMobile')}
                  </label>
                  {lockEmailAndMobile ? (
                    <p className={readOnlyValueClass}>{draft.mobile || empty}</p>
                  ) : (
                    <input
                      type="tel"
                      value={draft.mobile}
                      onChange={(e) => onChange({ mobile: e.target.value })}
                      className={fieldClass}
                      placeholder={t('admin.contact.placeholderMobileOptional')}
                    />
                  )}
                </div>
                {lockEmailAndMobile && (
                  <p className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    {t('admin.contact.lockEmailHint')}
                  </p>
                )}
                {!lockEmailAndMobile && needsEmail && !draft.email.trim() && (
                  <p className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    {t('admin.contact.needsEmailHint')}
                  </p>
                )}
              </>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('admin.contact.notifyMe')}
            </h4>
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
          </section>
          </>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white p-5 space-y-3">
          {isView ? (
            <>
              {onRevoke ? (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={onRevoke}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 py-3.5 font-bold text-red-600 hover:bg-red-50"
                  >
                    <ShieldOff size={16} />
                    {t('admin.contact.revokeAccess')}
                  </button>
                  <p className="px-1 text-xs leading-relaxed text-slate-500">
                    {t('admin.contact.revokeAccessHint')}
                  </p>
                </div>
              ) : null}
              {onRemove ? (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={onRemove}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 py-3.5 font-bold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                    {t('admin.users.removeFromPatientConfirm')}
                  </button>
                  <p className="px-1 text-xs leading-relaxed text-slate-500">
                    {t('admin.contact.removeFromPatientHint')}
                  </p>
                </div>
              ) : null}
              <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                {t('admin.contact.close')}
              </button>
              {onSwitchToEdit && (
                <button
                  type="button"
                  onClick={onSwitchToEdit}
                  className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Pencil size={16} />
                  {t('common.edit')}
                </button>
              )}
              </div>
            </>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                {t('admin.contact.cancel')}
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving || remoteStale}
                className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving
                  ? t('admin.contact.saving')
                  : isCreate
                    ? t('admin.contact.addPerson')
                    : t('admin.contact.save')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
