import { Mail } from 'lucide-react';
import {
  setCircleReplySortOrder,
  type CircleReplySortOrder,
} from '../lib/circleMessagePreferences';
import { useCircleReplySortOrder } from '../hooks/useCircleReplySortOrder';
import { cn } from '../lib/utils';

export function CircleSettingsMessagingPanel() {
  const replySort = useCircleReplySortOrder();

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <Mail size={22} />
        </div>
        <div className="space-y-1 min-w-0">
          <h3 className="font-bold text-slate-800">Messaging settings</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Configure how you read and reply to messages from your loved one.
          </p>
        </div>
      </div>

      <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
        <div className="space-y-1">
          <p className="font-bold text-slate-800">Reply sort order</p>
          <p className="text-sm text-slate-400">
            Choose whether replies in a conversation appear oldest-first or newest-first.
          </p>
        </div>
        <div
          className="inline-flex rounded-xl bg-slate-200/80 p-1 gap-0.5"
          role="group"
          aria-label="Reply sort order"
        >
          {(['oldest', 'newest'] as CircleReplySortOrder[]).map((order) => {
            const active = replySort === order;
            return (
              <button
                key={order}
                type="button"
                onClick={() => setCircleReplySortOrder(order)}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all',
                  active
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {order === 'oldest' ? 'Oldest first' : 'Newest first'}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
