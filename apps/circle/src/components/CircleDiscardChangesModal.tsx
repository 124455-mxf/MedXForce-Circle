type CircleDiscardChangesModalProps = {
  open: boolean;
  title?: string;
  message?: string;
  onDiscard: () => void;
  onKeepEditing: () => void;
};

export function CircleDiscardChangesModal({
  open,
  title = 'Discard unsaved changes?',
  message = 'You have edits that are not saved yet. If you leave now, those changes will be lost.',
  onDiscard,
  onKeepEditing,
}: CircleDiscardChangesModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-lg w-full space-y-6 border border-slate-100">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <p className="text-slate-600 leading-relaxed text-sm">{message}</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onKeepEditing}
            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
