import { Mail, Shield, UserMinus, Users } from 'lucide-react';
import type { CircleInvitePreviewItem } from '@medxforce/shared';

type CircleInviteConfirmModalProps = {
  open: boolean;
  items: CircleInvitePreviewItem[];
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  confirmLabel?: string;
};

function inviteItems(items: CircleInvitePreviewItem[]) {
  return items.filter((item) => item.action === 'invite' || item.action === 'reinvite');
}

function revokeItems(items: CircleInvitePreviewItem[]) {
  return items.filter((item) => item.action === 'revoke');
}

export function CircleInviteConfirmModal({
  open,
  items,
  onConfirm,
  onCancel,
  isSubmitting = false,
  confirmLabel,
}: CircleInviteConfirmModalProps) {
  if (!open) return null;

  const invites = inviteItems(items);
  const revokes = revokeItems(items);
  const singleInvite = invites.length === 1 && revokes.length === 0;
  const singleRevoke = revokes.length === 1 && invites.length === 0;

  const title = singleInvite
    ? `Invite ${invites[0].name}?`
    : singleRevoke
      ? `Remove Circle access for ${revokes[0].name}?`
      : 'Update Circle access?';

  const defaultConfirm = singleRevoke ? 'Remove access' : 'Confirm';

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-lg w-full space-y-6 border border-slate-100">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
            singleRevoke ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
          }`}
        >
          {singleRevoke ? <UserMinus size={32} /> : singleInvite ? <Mail size={32} /> : <Users size={32} />}
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          {singleInvite ? (
            <>
              <p className="text-slate-600 leading-relaxed text-sm">
                After you confirm, this person can sign in to MedXForce Circle with the email
                below. Share the Circle app link with them. Check the address carefully.
              </p>
              <p className="text-lg font-bold text-red-600 break-all px-1">{invites[0].email}</p>
            </>
          ) : singleRevoke ? (
            <>
              <p className="text-slate-600 leading-relaxed text-sm">
                This will revoke Circle sign-in for the email below. They will no longer access this
                circle. Check the address carefully before continuing.
              </p>
              <p className="text-lg font-bold text-red-600 break-all px-1">{revokes[0].email}</p>
            </>
          ) : (
            <p className="text-slate-500 leading-relaxed text-sm">
              Review grant and remove access changes below before continuing.
            </p>
          )}
        </div>

        {invites.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Grant access</p>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {invites.map((item) => (
                <li
                  key={`${item.action}-${item.email}`}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100"
                >
                  <Shield size={18} className="text-blue-500 shrink-0" />
                  <div className="min-w-0 text-left">
                    <p className="font-bold text-slate-800 truncate">{item.name}</p>
                    <p className="text-sm font-semibold text-red-600 break-all">{item.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {revokes.length > 0 && !singleRevoke && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Remove access</p>
            <ul className="space-y-2 max-h-32 overflow-y-auto">
              {revokes.map((item) => (
                <li
                  key={`revoke-${item.email}`}
                  className="flex items-center gap-3 p-3 bg-red-50 rounded-2xl border border-red-100"
                >
                  <UserMinus size={18} className="text-red-500 shrink-0" />
                  <div className="min-w-0 text-left">
                    <p className="font-bold text-slate-800 truncate">{item.name}</p>
                    <p className="text-sm font-semibold text-red-600 break-all">{item.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`flex-1 py-4 text-white rounded-2xl font-bold transition-all shadow-lg disabled:opacity-50 ${
              singleRevoke
                ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
            }`}
          >
            {isSubmitting ? 'Saving…' : confirmLabel ?? defaultConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
