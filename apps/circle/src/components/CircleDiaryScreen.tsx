import { useCallback, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  Loader2,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import {
  createDiaryEntry,
  deleteDiaryEntry,
  diaryMoodLabel,
  updateDiaryEntry,
  type CircleDiaryEntry,
  type CircleDiaryEntryDraft,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import {
  circleHeaderActionButtonClass,
  circleSectionBodyClass,
  circleSectionBodyPaddingClass,
  circleSectionContextHintClass,
  circleSectionEmptyStateClass,
  circleSectionHeaderClass,
  circleSectionHeaderStackClass,
  circleSectionPanelClass,
  circleSectionSubtitleClass,
  circleSectionTitleClass,
  circleTabButtonClass,
  circleTabListClass,
} from '../lib/circleSectionStyles';
import { useCircleDiaryEntries, type DiaryListFilter } from '../hooks/useCircleDiaryEntries';
import { CircleDiaryEntryModal } from './CircleDiaryEntryModal';
import { ResponsiveTabLabel } from './ResponsiveTabLabel';

interface CircleDiaryScreenProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
}

function formatDiaryDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function entryPreview(body: string, max = 160): string {
  const text = body.trim().replace(/\s+/g, ' ');
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function DiaryEntryCard({
  entry,
  isOwn,
  patientDisplayName,
  onEdit,
  onDelete,
}: {
  entry: CircleDiaryEntry;
  isOwn: boolean;
  patientDisplayName: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isPatientAuthor = entry.authorUid === entry.patientId;
  const mood = diaryMoodLabel(entry.mood);

  return (
    <article className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 [@media(max-height:740px)]:p-3 [@media(max-height:740px)]:space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-slate-800 text-sm">
              {entry.title?.trim() || 'Untitled entry'}
            </p>
            {mood && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold uppercase">
                {mood}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {formatDiaryDate(entry.experienceAt)}
            {' · '}
            {isPatientAuthor ? patientDisplayName : entry.authorName}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase shrink-0',
            entry.visibility === 'circle'
              ? 'bg-violet-50 text-violet-600'
              : 'bg-slate-100 text-slate-500',
          )}
          title={
            entry.visibility === 'circle'
              ? 'Shared with the circle'
              : 'Private — only you can see this'
          }
        >
          {entry.visibility === 'circle' ? <Users size={12} /> : <Lock size={12} />}
          {entry.visibility === 'circle' ? 'Shared' : 'Private'}
        </span>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
        {entryPreview(entry.body)}
      </p>

      {isOwn && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50"
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </article>
  );
}

export function CircleDiaryScreen({ user, db, patient }: CircleDiaryScreenProps) {
  const [filter, setFilter] = useState<DiaryListFilter>('mine');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CircleDiaryEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { loading, error: loadError, entries, allEntries } = useCircleDiaryEntries(
    db,
    patient.patientId,
    user,
    filter,
  );

  const authorName = useMemo(() => {
    return user.displayName?.trim() || user.email?.split('@')[0] || 'Circle member';
  }, [user.displayName, user.email]);

  const sharedCount = useMemo(
    () => allEntries.filter((e) => e.visibility === 'circle').length,
    [allEntries],
  );

  const openCreate = () => {
    setEditingEntry(null);
    setModalOpen(true);
  };

  const openEdit = (entry: CircleDiaryEntry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingEntry(null);
  };

  const handleSave = useCallback(
    async (draft: CircleDiaryEntryDraft) => {
      setSaving(true);
      setError(null);
      setMessage(null);
      try {
        if (editingEntry) {
          await updateDiaryEntry(db, {
            patientId: patient.patientId,
            entryId: editingEntry.id,
            draft,
          });
          setMessage('Entry updated.');
        } else {
          await createDiaryEntry(db, {
            patientId: patient.patientId,
            authorUid: user.uid,
            authorName,
            draft,
          });
          setMessage('Entry saved.');
        }
        setModalOpen(false);
        setEditingEntry(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save entry.');
      } finally {
        setSaving(false);
      }
    },
    [authorName, db, editingEntry, patient.patientId, user.uid],
  );

  const handleDelete = useCallback(
    async (entry: CircleDiaryEntry) => {
      if (!window.confirm('Delete this diary entry? This cannot be undone.')) return;
      setError(null);
      setMessage(null);
      try {
        await deleteDiaryEntry(db, patient.patientId, entry.id);
        setMessage('Entry deleted.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete entry.');
      }
    },
    [db, patient.patientId],
  );

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0 max-h-full overflow-hidden">
        <div className={cn(circleSectionPanelClass, 'max-h-full')}>
          <div className={cn(circleSectionHeaderClass, circleSectionHeaderStackClass)}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className={circleSectionTitleClass}>Diary</h3>
                <p className={circleSectionSubtitleClass}>
                  Record visits, mood, and moments. Shared entries build your circle&apos;s story.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreate}
                className={circleHeaderActionButtonClass}
                aria-label="New diary entry"
                title="New entry"
              >
                <Plus size={18} className="[@media(max-height:740px)]:size-4" />
              </button>
            </div>

            <div className={circleTabListClass} role="tablist" aria-label="Diary views">
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'mine'}
                onClick={() => setFilter('mine')}
                className={circleTabButtonClass(filter === 'mine')}
              >
                My journal
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'circle'}
                onClick={() => setFilter('circle')}
                className={circleTabButtonClass(filter === 'circle')}
              >
                <ResponsiveTabLabel
                  long={`Circle story (${sharedCount})`}
                  compact={`Shared (${sharedCount})`}
                />
              </button>
            </div>
          </div>

          <div className={cn(circleSectionBodyClass, circleSectionBodyPaddingClass)}>
            <p className={circleSectionContextHintClass}>
              {filter === 'mine'
                ? 'Your personal entries — change sharing when you edit an entry.'
                : 'Entries shared by circle members and the patient, woven into one timeline.'}
            </p>

            {(error || loadError) && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error || loadError}
              </p>
            )}

            {message && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                {message}
              </p>
            )}

            {loading ? (
              <div className="py-12 flex justify-center text-slate-400 [@media(max-height:740px)]:py-8">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : entries.length === 0 ? (
              <div className={circleSectionEmptyStateClass}>
                <p className="text-sm text-slate-500 leading-relaxed [@media(max-height:740px)]:text-xs">
                  {filter === 'mine'
                    ? 'No entries yet. Tap + to capture your first moment.'
                    : 'No shared entries yet. New entries are shared with the circle by default.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <DiaryEntryCard
                    key={entry.id}
                    entry={entry}
                    isOwn={entry.authorUid === user.uid}
                    patientDisplayName={patient.displayName}
                    onEdit={() => openEdit(entry)}
                    onDelete={() => void handleDelete(entry)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CircleDiaryEntryModal
        open={modalOpen}
        mode={editingEntry ? 'edit' : 'create'}
        entry={editingEntry ?? undefined}
        saving={saving}
        onClose={closeModal}
        onSave={(draft) => void handleSave(draft)}
      />
    </>
  );
}
