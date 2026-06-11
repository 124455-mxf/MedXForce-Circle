import { useCallback, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  Heart,
  Loader2,
  Lock,
  Pencil,
  Plus,
  ScrollText,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import {
  createDiaryEntry,
  deleteDiaryEntry,
  isDiaryEntrySharedWithCircle,
  updateDiaryEntry,
  type CircleDiaryEntry,
  type CircleDiaryEntryDraft,
  type CirclePatientSummary,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { useCircleT } from '../lib/circleI18nContext';
import { diaryMoodLabelI18n } from '../lib/diaryScreenI18n';
import {
  circleHeaderActionButtonClass,
  circleSectionBodyClass,
  circleSectionBodyPaddingClass,
  circleSectionContextHintClass,
  circleSectionEmptyStateClass,
  circleSectionHeaderStackClass,
  circleSectionSubtitleClass,
  circleSectionTitleClass,
  circleTabButtonClass,
  circleTabListClass,
  circleWorkTabHeaderClass,
  circleWorkTabPanelClass,
} from '../lib/circleSectionStyles';
import { useCircleDiaryEntries, type DiaryListFilter } from '../hooks/useCircleDiaryEntries';
import { useCircleCompactChrome } from '../lib/circleChromeContext';
import { useCircleToast } from '../hooks/useCircleToast';
import { CircleAppToast } from './CircleAppToast';
import { CircleDiaryEntryModal } from './CircleDiaryEntryModal';
import { CircleDiaryEntryBodyPreview } from './CircleDiaryEntryBodyPreview';
import { CircleWorkTabSectionIntro } from './CircleWorkTabSectionIntro';
import { CircleFolderCountBadge } from './CircleCountBadge';
import { DiaryEntryDeleteConfirmModal } from './DiaryEntryDeleteConfirmModal';
import { ResponsiveTabLabel } from './ResponsiveTabLabel';

interface CircleDiaryScreenProps {
  user: User;
  db: Firestore;
  patient: CirclePatientSummary;
}

function formatDiaryDate(ts: number): string {
  return new Date(ts)
    .toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase();
}

function DiaryTimelineEntry({
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
  const t = useCircleT();
  const isPatientAuthor = entry.authorUid === entry.patientId;
  const isCareTeamEntry = !isPatientAuthor;
  const mood = diaryMoodLabelI18n(t, entry.mood);
  const shared = isDiaryEntrySharedWithCircle(entry);
  const authorLabel = isPatientAuthor ? patientDisplayName : entry.authorName;

  return (
    <li className="relative pl-6">
      <span
        className={cn(
          'absolute top-2 rounded-full border-2 border-white shadow',
          entry.isMilestone
            ? '-left-[11px] w-5 h-5 bg-rose-500 ring-2 ring-rose-300 shadow-md animate-pulse'
            : '-left-[8px] w-3.5 h-3.5',
          !entry.isMilestone && (isPatientAuthor ? 'bg-violet-500' : isOwn ? 'bg-blue-500' : 'bg-slate-400'),
        )}
      />
      <article
        className={cn(
          'rounded-2xl border shadow-sm p-4 space-y-3 [@media(max-height:740px)]:p-3 [@media(max-height:740px)]:space-y-2',
          entry.isMilestone
            ? 'bg-violet-50/50 border-violet-200'
            : 'bg-white border-slate-100',
          isCareTeamEntry && 'ml-2 sm:ml-4 border-l-4 border-l-blue-200',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">
              {formatDiaryDate(entry.experienceAt)}
            </p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{authorLabel}</p>
            {isCareTeamEntry && (
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">
                {t('diary.badgeCircleMember')}
              </p>
            )}
            {isPatientAuthor && (
              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500 mt-0.5">
                {t('diary.badgePatient')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {mood && (
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase">
                {mood}
              </span>
            )}
            {entry.isMilestone && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold uppercase">
                <Star size={10} />
                {t('diary.badgeMilestone')}
              </span>
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase shrink-0',
                shared ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-500',
              )}
            >
              {shared ? (
                isPatientAuthor ? (
                  <Heart size={12} />
                ) : (
                  <Users size={12} />
                )
              ) : (
                <Lock size={12} />
              )}
              {shared
                ? isPatientAuthor
                  ? t('diary.badgePatientStory')
                  : t('diary.badgeShared')
                : t('diary.badgePrivate')}
            </span>
            {isOwn && (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={onEdit}
                  className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                  aria-label={t('diary.editEntryAria')}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50"
                  aria-label={t('diary.deleteEntryAria')}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
        </div>

        {entry.title?.trim() && (
          <h3 className="font-bold text-slate-800 text-sm">{entry.title.trim()}</h3>
        )}
        <CircleDiaryEntryBodyPreview text={entry.body} />
      </article>
    </li>
  );
}

export function CircleDiaryScreen({ user, db, patient }: CircleDiaryScreenProps) {
  const t = useCircleT();
  const [filter, setFilter] = useState<DiaryListFilter>('circle');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CircleDiaryEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CircleDiaryEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);
  const { toast, showToast } = useCircleToast();
  const compactChrome = useCircleCompactChrome();

  const { loading, error: loadError, entries, allEntries } = useCircleDiaryEntries(
    db,
    patient.patientId,
    user,
    filter,
  );

  const authorName = useMemo(() => {
    return user.displayName?.trim() || user.email?.split('@')[0] || t('circle.circleMemberFallback');
  }, [t, user.displayName, user.email]);

  const sharedCount = useMemo(
    () => allEntries.filter((e) => isDiaryEntrySharedWithCircle(e)).length,
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
      try {
        if (editingEntry) {
          await updateDiaryEntry(db, {
            patientId: patient.patientId,
            entryId: editingEntry.id,
            draft,
          });
          showToast(t('diary.toastUpdated'));
        } else {
          await createDiaryEntry(db, {
            patientId: patient.patientId,
            authorUid: user.uid,
            authorName,
            draft,
          });
          showToast(t('diary.toastSaved'));
        }
        setModalOpen(false);
        setEditingEntry(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('diary.saveFailed'));
      } finally {
        setSaving(false);
      }
    },
    [authorName, db, editingEntry, patient.patientId, showToast, t, user.uid],
  );

  const confirmDeleteEntry = useCallback(async () => {
    if (!deleteTarget) return;
    setDeletingEntry(true);
    setError(null);
    try {
      await deleteDiaryEntry(db, patient.patientId, deleteTarget.id);
      showToast(t('diary.toastDeleted'));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('diary.deleteFailed'));
    } finally {
      setDeletingEntry(false);
    }
  }, [db, deleteTarget, patient.patientId, showToast, t]);

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0 max-h-full overflow-hidden">
        <div className={cn(circleWorkTabPanelClass(compactChrome), 'max-h-full')}>
          <div className={cn(circleWorkTabHeaderClass(compactChrome), circleSectionHeaderStackClass, compactChrome && 'space-y-2')}>
            <CircleWorkTabSectionIntro
              icon={ScrollText}
              iconClassName="text-amber-600"
              title={t('diary.title')}
              subtitle={t('diary.subtitle')}
              trailing={
                <button
                  type="button"
                  onClick={openCreate}
                  className={circleHeaderActionButtonClass}
                  aria-label={t('diary.newEntryAria')}
                  title={t('diary.newEntryTitle')}
                >
                  <Plus size={18} className="[@media(max-height:740px)]:size-4" />
                </button>
              }
            />

            <div className={circleTabListClass} role="tablist" aria-label={t('diary.viewsAria')}>
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'mine'}
                onClick={() => setFilter('mine')}
                className={circleTabButtonClass(filter === 'mine')}
              >
                {t('diary.tabMyJournal')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'circle'}
                aria-label={
                  sharedCount > 0
                    ? t('diary.tabCircleStoryAriaWithCount', { count: sharedCount })
                    : t('diary.tabCircleStoryAria')
                }
                onClick={() => setFilter('circle')}
                className={circleTabButtonClass(filter === 'circle')}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <ResponsiveTabLabel
                    long={t('diary.tabCircleStoryLong')}
                    compact={t('diary.tabCircleStoryCompact')}
                  />
                  <CircleFolderCountBadge unread={0} total={sharedCount} />
                </span>
              </button>
            </div>
          </div>

          <div className={cn(circleSectionBodyClass, circleSectionBodyPaddingClass, 'overflow-y-auto')}>
            <p className={circleSectionContextHintClass}>
              {filter === 'mine' ? t('diary.hintMine') : t('diary.hintCircle')}
            </p>

            {(error || loadError) && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error || loadError}
              </p>
            )}

            {loading ? (
              <div className="py-12 flex justify-center text-slate-400 [@media(max-height:740px)]:py-8">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : entries.length === 0 ? (
              <div className={circleSectionEmptyStateClass}>
                <p className="text-sm text-slate-500 leading-relaxed [@media(max-height:740px)]:text-xs">
                  {filter === 'mine' ? t('diary.emptyMine') : t('diary.emptyCircle')}
                </p>
              </div>
            ) : (
              <ol className="relative border-l-2 border-blue-200 ml-3 sm:ml-4 space-y-6 pb-2">
                {entries.map((entry) => (
                  <DiaryTimelineEntry
                    key={entry.id}
                    entry={entry}
                    isOwn={entry.authorUid === user.uid}
                    patientDisplayName={patient.displayName}
                    onEdit={() => openEdit(entry)}
                    onDelete={() => setDeleteTarget(entry)}
                  />
                ))}
              </ol>
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

      <DiaryEntryDeleteConfirmModal
        open={!!deleteTarget}
        isDeleting={deletingEntry}
        onClose={() => {
          if (!deletingEntry) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDeleteEntry()}
      />

      <CircleAppToast message={toast?.message ?? null} tone={toast?.tone} />
    </>
  );
}
