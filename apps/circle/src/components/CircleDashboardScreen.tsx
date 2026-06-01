import { MessageSquare, Image } from 'lucide-react';
import type { CirclePatientSummary } from '@medxforce/shared';
import type { CircleMainTab } from './CircleBottomNav';

interface CircleDashboardScreenProps {
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
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your circle</p>
        <h2 className="text-xl font-bold text-slate-800">{patient.displayName}</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Stay connected with messages and shared moments. Use the menu below to open a section.
        </p>
      </div>

      {unreadCount > 0 && caps.messaging && (
        <button
          type="button"
          onClick={() => onGoToTab('messages')}
          className="w-full text-left p-4 rounded-2xl border border-red-200 bg-red-50/80 shadow-sm shadow-red-100/40 flex items-center gap-3"
        >
          <span className="w-1 self-stretch rounded-full bg-red-500 shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-red-600 uppercase tracking-wide">New reply</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">
              {unreadCount === 1
                ? '1 message has a new reply from your loved one'
                : `${unreadCount} messages have new replies`}
            </p>
          </div>
        </button>
      )}

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
              {messageCount === 0
                ? 'No threads yet'
                : `${messageCount} thread${messageCount === 1 ? '' : 's'}`}
              {unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
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
