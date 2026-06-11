import { Loader2, Pencil, X } from 'lucide-react';
import type { CircleContactKind } from '@medxforce/shared';
import { CIRCLE_UI_LANGUAGES } from '../lib/circleLanguages';
import { cn } from '../lib/utils';
import { useCircleT, type CircleTranslator } from '../lib/circleI18nContext';
import { contactKindLabelI18n, relationshipLabelI18n } from '../lib/adminScreenI18n';
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

function ReadOnlyField({ label, value, empty }: { label: string; value: string; empty: string }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
        {label}
      </label>
      <p className={readOnlyValueClass}>{value || empty}</p>
    </div>
  );
}

function NotifyStatus({
  label,
  enabled,
  requirement,
  enabledText,
  offText,
  tone = 'blue',
}: {
  label: string;
  enabled: boolean;
  requirement?: string;
  enabledText: string;
  offText: string;
  tone?: 'blue' | 'red' | 'orange' | 'emerald';
}) {
  const enabledToneClass =
    tone === 'red'
      ? 'bg-red-50 border-red-100 text-red-700'
      : tone === 'orange'
        ? 'bg-orange-50 border-orange-100 text-orange-700'
        : tone === 'emerald'
          ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
          : 'bg-blue-50 border-blue-100 text-blue-700';
  const toneClass = enabled
    ? enabledToneClass
    : 'bg-white border-slate-100 text-slate-500';

  return (
    <div className={cn('p-4 rounded-2xl border text-left', toneClass)}>
      <p className="font-bold text-sm">{label}</p>
      <p className="text-xs mt-1 opacity-80">
        {requirement ?? (enabled ? enabledText : offText)}
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
  const t = useCircleT();
  if (!open) return null;

  const kinds = kindOptions(t);
  const empty = t('admin.profile.emptyValue');

  const isView = mode === 'view';
  const isCreate = mode === 'create';
  const needsEmail = draft.kind !== 'contact';
  const hasEmail = !!draft.email.trim();
  const hasMobile = !!draft.mobile.trim();

  const notifyKeys = notifyKeysForContactKind(draft.kind);

  const handleNotifyToggle = (key: CircleNotifyKey) => {
    onChange({ [key]: !draft[key] });
  };

  const title = isView
    ? t('admin.contact.viewTitle')
    : isCreate
      ? t('admin.contact.addTitle')
      : t('admin.contact.editTitle');
  const subtitle = isView
    ? t('admin.contact.viewSubtitle')
    : isCreate
      ? t('admin.contact.addSubtitle')
      : t('admin.contact.editSubtitle');

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

          <section className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('admin.contact.personType')}
            </h4>
            {isView || mode === 'edit' ? (
              <span className="inline-flex px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 text-xs font-bold uppercase tracking-wide">
                {contactKindLabelI18n(t, draft.kind)}
              </span>
            ) : (
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
                {t('admin.contact.circleAccess')}
              </h4>
              <span
                className={cn(
                  'inline-flex px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide border',
                  circleAccessBadgeClass ?? 'bg-indigo-50 text-indigo-700 border-indigo-100',
                )}
              >
                {circleAccessLabel}
              </span>
              <p className="text-[11px] text-slate-400 leading-snug">{t('admin.contact.circleAccessHint')}</p>
            </section>
          )}

          <section className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('admin.contact.userInfo')}
            </h4>
            {isView ? (
              <>
                <ReadOnlyField label={t('admin.contact.fieldName')} value={draft.name} empty={empty} />
                {(draft.kind === 'caregiver' || draft.kind === 'family') && (
                  <ReadOnlyField
                    label={t('admin.contact.fieldRelationship')}
                    value={relationshipLabelI18n(t, clampRelationship(draft.kind, draft.relationship))}
                    empty={empty}
                  />
                )}
                <ReadOnlyField label={t('admin.contact.fieldLanguage')} value={draft.language || 'English'} empty={empty} />
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    {t('admin.contact.fieldName')}
                  </label>
                  <input
                    value={draft.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    className={fieldClass}
                    placeholder={t('admin.contact.placeholderFullName')}
                    autoFocus
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
              {t('admin.contact.contactDetails')}
            </h4>
            {isView ? (
              <>
                <ReadOnlyField label={t('admin.contact.fieldEmail')} value={draft.email} empty={empty} />
                <ReadOnlyField label={t('admin.contact.fieldMobile')} value={draft.mobile} empty={empty} />
              </>
            ) : (
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
            )}
          </section>

          <section className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('admin.contact.notifyMe')}
            </h4>
            {isView ? (
              <div className="grid grid-cols-2 gap-3">
                {notifyKeys.includes('alert') && (
                  <NotifyStatus
                    label={t('admin.contact.notifyAlert')}
                    enabled={draft.alert && hasEmail}
                    tone="red"
                    enabledText={t('admin.contact.notifyEnabled')}
                    offText={t('admin.contact.notifyOff')}
                    requirement={hasEmail ? undefined : t('admin.contact.notifyEmailRequired')}
                  />
                )}
                {notifyKeys.includes('attention') && (
                  <NotifyStatus
                    label={t('admin.contact.notifyAttention')}
                    enabled={draft.attention && hasEmail}
                    tone="orange"
                    enabledText={t('admin.contact.notifyEnabled')}
                    offText={t('admin.contact.notifyOff')}
                    requirement={hasEmail ? undefined : t('admin.contact.notifyEmailRequired')}
                  />
                )}
                <NotifyStatus
                  label={t('admin.contact.notifyMessage')}
                  enabled={draft.message && hasEmail}
                  enabledText={t('admin.contact.notifyEnabled')}
                  offText={t('admin.contact.notifyOff')}
                  requirement={hasEmail ? undefined : t('admin.contact.notifyEmailRequired')}
                />
                <NotifyStatus
                  label={t('admin.contact.notifySms')}
                  enabled={draft.sms && hasMobile}
                  tone="emerald"
                  enabledText={t('admin.contact.notifyEnabled')}
                  offText={t('admin.contact.notifyOff')}
                  requirement={hasMobile ? undefined : t('admin.contact.notifyMobileRequired')}
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
                {t('admin.contact.close')}
              </button>
              {onSwitchToEdit && (
                <button
                  type="button"
                  onClick={onSwitchToEdit}
                  className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <Pencil size={16} />
                  {t('common.edit')}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
