import { MessageSquare, Image } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { CirclePatientSummary } from '@medxforce/shared';
import type { CircleMainTab } from './CircleBottomNav';
import { CircleProfileChangeBanner } from './CircleProfileChangeBanner';

interface CircleDashboardScreenProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
  unreadCount: number;
  messageCount: number;
  totalMediaCount: number;
  myMediaUploadCount: number;
  mediaCountsLoading?: boolean;
  onGoToTab: (tab: CircleMainTab) => void;
}

function formatMediaCountLabel(
  total: number,
  mine: number,
  loading: boolean,
): string {
  if (loading) return 'Loading…';
  if (total === 0) return 'No photos or videos yet';
  const totalLabel = `${total} item${total === 1 ? '' : 's'} total`;
  const mineLabel = `${mine} uploaded by you`;
  return `${totalLabel} · ${mineLabel}`;
}

export function CircleDashboardScreen({
  user,
  db,
  patient,
  unreadCount,
  messageCount,
  totalMediaCount,
  myMediaUploadCount,
  mediaCountsLoading = false,
  onGoToTab,
}: CircleDashboardScreenProps) {
  const caps = patient.capabilities;

  return (
    <div className="space-y-4">
      <CircleProfileChangeBanner user={user} db={db} patient={patient} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {caps.messaging && (
          <button
            type="button"
            onClick={() => onGoToTab('messages')}
            className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/30 text-left transition-colors"
          >
            <MessageSquare size={20} className="text-blue-600 mb-2" />
            <p className="font-bold text-slate-800">Messages</p>
            <p className="text-xs text-slate-500 mt-1">
              {messageCount === 0 ? (
                'No threads yet'
              ) : (
                <>
                  {messageCount} thread{messageCount === 1 ? '' : 's'}
                  {unreadCount > 0 && (
                    <>
                      {' · '}
                      <span className="text-red-600 font-bold">
                        {unreadCount} unread
                      </span>
                    </>
                  )}
                </>
              )}
            </p>
          </button>
        )}
        {(caps.viewCircleMedia || caps.richMediaUpload) && (
          <button
            type="button"
            onClick={() => onGoToTab('media')}
            className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/30 text-left transition-colors"
          >
            <Image size={20} className="text-blue-600 mb-2" />
            <p className="font-bold text-slate-800">Media</p>
            <p className="text-xs text-slate-500 mt-1">
              {formatMediaCountLabel(totalMediaCount, myMediaUploadCount, mediaCountsLoading)}
            </p>
          </button>
        )}
      </div>
    </div>
  );
}
