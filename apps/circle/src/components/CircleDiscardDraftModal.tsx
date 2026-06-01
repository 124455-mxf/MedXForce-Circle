import { MessageSquare } from 'lucide-react';

type CircleDiscardDraftModalProps = {
  open: boolean;
  onDiscard: () => void;
  onContinueEditing: () => void;
};

export function CircleDiscardDraftModal({
  open,
  onDiscard,
  onContinueEditing,
}: CircleDiscardDraftModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discard-draft-title"
    >
      <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-sm w-full text-center space-y-6 border border-slate-100">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
          <MessageSquare size={32} />
        </div>
        <div className="space-y-2">
          <h3 id="discard-draft-title" className="text-xl font-bold text-slate-900">
            Discard unsent reply?
          </h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            You have typed a reply that has not been sent yet. Leave anyway and discard it, or
            stay and keep editing.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onDiscard}
            className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
          >
            Discard reply
          </button>
          <button
            type="button"
            onClick={onContinueEditing}
            className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
          >
            Keep editing
          </button>
        </div>
      </div>
    </div>
  );
}
