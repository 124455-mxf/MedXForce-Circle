import type { CircleInviteListItem, CircleManagedContact } from '@medxforce/shared';
import { cn } from '../lib/utils';
import { useCircleT } from '../lib/circleI18nContext';
import { relationshipLabelI18n } from '../lib/adminScreenI18n';
import { resolvedContactAccess } from '../lib/circleContactDisplay';
import { CirclePatientLanguagePill } from './CirclePatientLanguagePill';
import { CircleContactNotifyIconStrip } from './CircleContactNotifyIconStrip';

type CircleContactMemberOverviewStripProps = {
  contact: CircleManagedContact;
  members?: CircleInviteListItem[];
  /** When set, overrides access resolved from contact + members (e.g. current patient membership). */
  accessLabel?: string;
  accessBadgeClass?: string;
  /** Hide role badge when it is already shown elsewhere (e.g. user management list row). */
  showRoleBadge?: boolean;
  className?: string;
};

export function CircleContactMemberOverviewStrip({
  contact,
  members = [],
  accessLabel,
  accessBadgeClass,
  showRoleBadge = true,
  className,
}: CircleContactMemberOverviewStripProps) {
  const t = useCircleT();
  const access = resolvedContactAccess(t, contact, members);
  const roleLabel = accessLabel ?? access.label;
  const roleBadgeClass = accessBadgeClass ?? access.badgeClass;
  const showRelationship =
    (contact.kind === 'caregiver' || contact.kind === 'family') && !!contact.relationship.trim();
  const hasEmail = !!contact.email.trim();
  const hasMobile = !!contact.mobile.trim();
  const showNotify = contact.kind !== 'contact' || hasEmail || hasMobile;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {showRoleBadge && (
        <span
          className={cn(
            'shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border',
            roleBadgeClass,
          )}
        >
          {roleLabel}
        </span>
      )}
      {showRelationship && (
        <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border bg-blue-50 text-blue-700 border-blue-100">
          {relationshipLabelI18n(t, contact.relationship).toUpperCase()}
        </span>
      )}
      {contact.language?.trim() && (
        <CirclePatientLanguagePill language={contact.language} title={contact.language} />
      )}
      {showNotify && (
        <>
          <span className="hidden sm:inline w-px h-5 bg-slate-200 mx-0.5 shrink-0" aria-hidden />
          <CircleContactNotifyIconStrip
            values={{
              alert: contact.alert,
              attention: contact.attention,
              message: contact.message,
              sms: contact.sms,
            }}
            kind={contact.kind}
            hasEmail={hasEmail}
            hasMobile={hasMobile}
          />
        </>
      )}
    </div>
  );
}
