import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { CirclePatientProfileSnapshot } from '@medxforce/shared';

type EditableSection = 'identity' | 'engagement' | 'lifestyle';

interface CirclePatientProfileEditorModalProps {
  open: boolean;
  section: EditableSection;
  snapshot: CirclePatientProfileSnapshot;
  saving?: boolean;
  onClose: () => void;
  onSave: (next: CirclePatientProfileSnapshot) => void;
}

function parseListInput(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function listInput(items: string[]): string {
  return items.join(', ');
}

export function CirclePatientProfileEditorModal({
  open,
  section,
  snapshot,
  saving = false,
  onClose,
  onSave,
}: CirclePatientProfileEditorModalProps) {
  const [draft, setDraft] = useState(snapshot);

  useEffect(() => {
    if (open) setDraft(snapshot);
  }, [open, snapshot]);

  if (!open) return null;

  const title =
    section === 'identity' ? 'Edit identity' : section === 'engagement' ? 'Edit engagement' : 'Edit lifestyle';

  return (
    <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] border border-slate-100 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {section === 'identity' && (
            <>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">First name</span>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.identity.firstName}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      identity: { ...draft.identity, firstName: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Last name</span>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.identity.lastName}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      identity: { ...draft.identity, lastName: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Nickname</span>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.identity.nickName}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      identity: { ...draft.identity, nickName: e.target.value },
                    })
                  }
                />
              </label>
            </>
          )}

          {section === 'engagement' && (
            <>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Active hobbies</span>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 min-h-[80px]"
                  value={listInput(draft.engagement.activeHobbies)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      engagement: { ...draft.engagement, activeHobbies: parseListInput(e.target.value) },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Passive hobbies</span>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 min-h-[80px]"
                  value={listInput(draft.engagement.passiveHobbies)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      engagement: { ...draft.engagement, passiveHobbies: parseListInput(e.target.value) },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Personal goals</span>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 min-h-[80px]"
                  value={listInput(draft.engagement.personalGoals)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      engagement: { ...draft.engagement, personalGoals: parseListInput(e.target.value) },
                    })
                  }
                />
              </label>
            </>
          )}

          {section === 'lifestyle' && (
            <>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Occupation</span>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.lifestyle.occupation}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      lifestyle: { ...draft.lifestyle, occupation: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Living situation</span>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200"
                  value={draft.lifestyle.livingSituation}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      lifestyle: { ...draft.lifestyle, livingSituation: e.target.value },
                    })
                  }
                />
              </label>
            </>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            disabled={saving}
            className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
