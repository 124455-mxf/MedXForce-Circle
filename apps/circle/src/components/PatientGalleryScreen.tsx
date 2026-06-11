import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ChevronLeft,
  FolderPlus,
  Image as ImageIcon,
  Pencil,
  Play,
  Plus,
  Trash2,
  Upload,
  Loader2,
} from 'lucide-react';
import {
  assignMediaToAlbum,
  canViewPatientUploads,
  createGalleryAlbum,
  deleteCircleGalleryMedia,
  deleteGalleryAlbum,
  renameGalleryAlbum,
  listAllGalleryMediaForPatient,
  listGalleryAlbums,
  listUnassignedCircleMedia,
  updateCircleGalleryCaption,
  uploadCircleGalleryMediaToAlbum,
  type CircleMemberRole,
  type CirclePatientSummary,
  type GalleryAlbum,
  type GalleryAlbumMedia,
  type GalleryUploadFileProgress,
} from '@medxforce/shared';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import { getCircleGalleryViewedIds } from '../lib/circleGalleryViews';
import {
  circleGalleryGridClass,
  isCompactCircleGalleryThumbnail,
} from '../lib/circleGalleryPreferences';
import { useCircleGalleryThumbnailSize } from '../hooks/useCircleGalleryThumbnailSize';
import { useCircleGallerySkipPhotoDeleteConfirm } from '../hooks/useCircleGallerySkipPhotoDeleteConfirm';
import { useCircleCompactChrome } from '../lib/circleChromeContext';
import { CircleGalleryLightbox, GalleryThumb } from './CircleGalleryLightbox';
import { CircleWorkTabSectionIntro } from './CircleWorkTabSectionIntro';
import { CircleDeleteAlbumConfirmModal } from './CircleDeleteAlbumConfirmModal';
import { CircleDeleteMediaConfirmModal } from './CircleDeleteMediaConfirmModal';
import { CircleFolderCountBadge, formatCircleBadgeCount } from './CircleCountBadge';
import { cn } from '../lib/utils';
import {
  circleInsetCardClass,
  circleSectionBodyClass,
  circleSectionHeaderStackClass,
  circleSectionSubtitleClass,
  circleSectionTitleClass,
  circleBrowsePillButtonClass,
  circleBrowsePillListClass,
  circleBrowsePillRowClass,
  circleTabButtonClass,
  circleTabListClass,
  circleWorkTabHeaderClass,
  circleWorkTabPanelClass,
} from '../lib/circleSectionStyles';

type MainMode = 'browse' | 'manage';
type BrowseTab = 'shared' | 'patient';
type SharedBrowseMode = 'photos' | 'videos' | 'album' | 'my-albums' | 'newest';
type ManageScreen = 'albums' | 'album';
type ManageEntryPoint = 'upload-flow' | 'shared-browse';

function galleryUploadOverallPercent(progress: GalleryUploadFileProgress): number {
  const fileSpan = 100 / progress.total;
  const done = (progress.index - 1) * fileSpan;
  if (progress.phase === 'preparing') {
    return Math.min(99, Math.round(done + fileSpan * 0.12));
  }
  const pct = progress.percent ?? 0;
  return Math.min(99, Math.round(done + fileSpan * (0.12 + (pct / 100) * 0.88)));
}

function galleryUploadStatusLabel(progress: GalleryUploadFileProgress): string {
  const itemLabel = progress.total > 1 ? ` ${progress.index} of ${progress.total}` : '';
  if (progress.phase === 'preparing') {
    return `Preparing${itemLabel}…`;
  }
  const base = `Uploading${itemLabel}`;
  return progress.percent != null && progress.percent > 0 ? `${base} (${progress.percent}%)` : `${base}…`;
}

function mediaInAlbum(item: GalleryAlbumMedia, album: GalleryAlbum): boolean {
  if (album.isDefault) return !item.albumId || item.albumId === album.id;
  return item.albumId === album.id;
}

function pickCover(items: GalleryAlbumMedia[]): GalleryAlbumMedia | undefined {
  const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);
  return (
    sorted.find((m) => !m.isVideo && (m.thumbnailUrl || m.url)) ??
    sorted.find((m) => m.thumbnailUrl) ??
    sorted[0]
  );
}

function formatShortDate(ts: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function AlbumThumbnailOverlay({
  title,
  count,
  lastModified,
  compact,
}: {
  title: string;
  count: number;
  lastModified: number;
  compact: boolean;
}) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 min-w-0',
          compact ? 'px-2.5 py-2 text-center' : 'px-3.5 py-3',
        )}
      >
        <p
          className={cn(
            'text-white font-bold line-clamp-2 drop-shadow-sm',
            compact ? 'text-[10px] leading-tight' : 'text-sm',
          )}
        >
          {title}
        </p>
        {!compact && (
          <p className="text-white/80 text-[10px] mt-0.5 line-clamp-1">
            {count} item{count === 1 ? '' : 's'}
            {lastModified ? ` · ${formatShortDate(lastModified)}` : ''}
          </p>
        )}
      </div>
    </>
  );
}

interface PatientGalleryScreenProps {
  user: User;
  patient: CirclePatientSummary;
  db: Firestore;
  storage: FirebaseStorage;
}

export function PatientGalleryScreen({
  user,
  patient,
  db,
  storage,
}: PatientGalleryScreenProps) {
  const compactChrome = useCircleCompactChrome();
  const caps = patient.capabilities;
  const showPatientTab = canViewPatientUploads(caps);
  const canUpload = patient.canUpload;
  const thumbnailSize = useCircleGalleryThumbnailSize();
  const skipPhotoDeleteConfirm = useCircleGallerySkipPhotoDeleteConfirm();
  const photoGridClass = circleGalleryGridClass(thumbnailSize);
  const compactAlbumTiles = isCompactCircleGalleryThumbnail(thumbnailSize);

  const [mainMode, setMainMode] = useState<MainMode>('browse');
  const [browseTab, setBrowseTab] = useState<BrowseTab>('shared');
  const [sharedBrowseMode, setSharedBrowseMode] = useState<SharedBrowseMode>('album');
  const [gridScope, setGridScope] = useState<string>('all');
  const [showGrid, setShowGrid] = useState(false);

  const [manageScreen, setManageScreen] = useState<ManageScreen>('albums');
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [allMedia, setAllMedia] = useState<GalleryAlbumMedia[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);
  const [albumMedia, setAlbumMedia] = useState<GalleryAlbumMedia[]>([]);
  const [unassigned, setUnassigned] = useState<GalleryAlbumMedia[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadProgress, setUploadProgress] = useState<GalleryUploadFileProgress | null>(null);
  const [editingMedia, setEditingMedia] = useState<GalleryAlbumMedia | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [renamingAlbum, setRenamingAlbum] = useState(false);
  const [renameAlbumTitle, setRenameAlbumTitle] = useState('');
  const [manageEntryPoint, setManageEntryPoint] =
    useState<ManageEntryPoint>('upload-flow');
  const [showDeleteAlbumConfirm, setShowDeleteAlbumConfirm] = useState(false);
  const [mediaPendingDelete, setMediaPendingDelete] = useState<GalleryAlbumMedia | null>(null);

  const [lightbox, setLightbox] = useState<{
    items: GalleryAlbumMedia[];
    index: number;
    slideshow?: boolean;
  } | null>(null);
  const [viewedIds, setViewedIds] = useState<Set<string>>(() =>
    getCircleGalleryViewedIds(patient.patientId),
  );

  const role = patient.role as CircleMemberRole;
  const senderName = user.displayName || user.email || 'Family Member';

  const circleMedia = useMemo(
    () => allMedia.filter((m) => m.source !== 'patient'),
    [allMedia],
  );
  const circlePhotos = useMemo(
    () => circleMedia.filter((m) => !m.isVideo),
    [circleMedia],
  );
  const circleVideos = useMemo(
    () => circleMedia.filter((m) => m.isVideo),
    [circleMedia],
  );
  const patientMedia = useMemo(
    () => (showPatientTab ? allMedia.filter((m) => m.source === 'patient') : []),
    [allMedia, showPatientTab],
  );

  const albumCards = useMemo(() => {
    return albums.map((album) => {
      const items = circleMedia.filter((m) => mediaInAlbum(m, album));
      const unseen = items.filter((m) => !viewedIds.has(m.id)).length;
      return {
        album,
        items,
        cover: pickCover(items),
        count: items.length,
        lastModified: items.reduce((max, m) => Math.max(max, m.timestamp), album.updatedAt),
        unseen,
      };
    });
  }, [albums, circleMedia, viewedIds]);

  const myAlbumCards = useMemo(
    () => albumCards.filter(({ album }) => album.createdByUid === user.uid),
    [albumCards, user.uid],
  );

  const canManageAlbum = useCallback(
    (album: GalleryAlbum) => album.createdByUid === user.uid && !album.isDefault,
    [user.uid],
  );

  const refreshViewed = useCallback(() => {
    setViewedIds(getCircleGalleryViewedIds(patient.patientId));
  }, [patient.patientId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [albumList, media] = await Promise.all([
        listGalleryAlbums(db, patient.patientId),
        listAllGalleryMediaForPatient(db, patient.patientId),
      ]);
      setAlbums(albumList);
      setAllMedia(media);
      refreshViewed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load gallery.');
    } finally {
      setLoading(false);
    }
  }, [db, patient.patientId, refreshViewed]);

  const exitManageToBrowse = useCallback(() => {
    setMainMode('browse');
    setManageScreen('albums');
    setSelectedAlbum(null);
    setShowGrid(false);
    setRenamingAlbum(false);
    setManageEntryPoint('upload-flow');
    setShowDeleteAlbumConfirm(false);
    setMediaPendingDelete(null);
    setMessage(null);
    void loadAll();
  }, [loadAll]);

  const backToAlbumList = useCallback(() => {
    setManageScreen('albums');
    setSelectedAlbum(null);
    setRenamingAlbum(false);
    setShowDeleteAlbumConfirm(false);
    setMediaPendingDelete(null);
  }, []);

  const backFromManageAlbum = useCallback(() => {
    if (manageEntryPoint === 'shared-browse') {
      exitManageToBrowse();
      return;
    }
    backToAlbumList();
  }, [backToAlbumList, exitManageToBrowse, manageEntryPoint]);

  const loadAlbumDetail = useCallback(
    async (album: GalleryAlbum) => {
      setLoading(true);
      setError(null);
      try {
        const media = await listAllGalleryMediaForPatient(db, patient.patientId);
        const items = media.filter(
          (m) => m.source !== 'patient' && mediaInAlbum(m, album),
        );
        const loose = canUpload
          ? await listUnassignedCircleMedia(db, patient.patientId, user.uid)
          : [];
        setAlbumMedia(items);
        setUnassigned(loose);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load album.');
      } finally {
        setLoading(false);
      }
    },
    [canUpload, db, patient.patientId, user.uid],
  );

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!showPatientTab && browseTab === 'patient') {
      setBrowseTab('shared');
    }
  }, [browseTab, showPatientTab]);

  const sortByNewest = (items: GalleryAlbumMedia[]) =>
    [...items].sort((a, b) => b.timestamp - a.timestamp);

  const gridItems = useMemo(() => {
    if (browseTab === 'patient') {
      return sortByNewest(patientMedia);
    }
    const album = albums.find((a) => a.id === gridScope);
    if (!album) return [];
    return sortByNewest(circleMedia.filter((m) => mediaInAlbum(m, album)));
  }, [albums, browseTab, circleMedia, gridScope, patientMedia]);

  const inlineBrowseItems = useMemo(() => {
    if (browseTab !== 'shared' || showGrid) return [];
    switch (sharedBrowseMode) {
      case 'photos':
        return sortByNewest(circlePhotos);
      case 'videos':
        return sortByNewest(circleVideos);
      case 'newest':
        return sortByNewest(circleMedia);
      default:
        return [];
    }
  }, [
    browseTab,
    circleMedia,
    circlePhotos,
    circleVideos,
    sharedBrowseMode,
    showGrid,
  ]);

  const gridTitle = useMemo(() => {
    if (browseTab === 'patient') return `From ${patient.displayName}`;
    return albums.find((a) => a.id === gridScope)?.title ?? 'Album';
  }, [albums, browseTab, gridScope, patient.displayName]);

  const inlineBrowseTitle = useMemo(() => {
    switch (sharedBrowseMode) {
      case 'photos':
        return 'All pictures';
      case 'videos':
        return 'All videos';
      case 'newest':
        return 'Newest';
      default:
        return '';
    }
  }, [sharedBrowseMode]);

  const openLightbox = (
    items: GalleryAlbumMedia[],
    index: number,
    options?: { slideshow?: boolean },
  ) => {
    setLightbox({ items, index, slideshow: options?.slideshow });
    refreshViewed();
  };

  const openAlbumGrid = (albumId: string) => {
    setGridScope(albumId);
    setShowGrid(true);
  };

  const selectSharedBrowseMode = (mode: SharedBrowseMode) => {
    setSharedBrowseMode(mode);
    setShowGrid(false);
  };

  const gridAlbum = useMemo(
    () => albums.find((a) => a.id === gridScope),
    [albums, gridScope],
  );

  const backFromSharedGrid = () => {
    setShowGrid(false);
  };

  const myAlbumItems = useMemo(
    () => myAlbumCards.flatMap(({ items }) => items),
    [myAlbumCards],
  );

  const countUnseenMedia = useCallback(
    (items: GalleryAlbumMedia[]) =>
      items.filter((item) => !viewedIds.has(item.id)).length,
    [viewedIds],
  );

  const sharedBrowseTabCounts = useMemo(
    (): Record<
      SharedBrowseMode,
      { total: number; unread: number }
    > => ({
      photos: {
        total: circlePhotos.length,
        unread: countUnseenMedia(circlePhotos),
      },
      videos: {
        total: circleVideos.length,
        unread: countUnseenMedia(circleVideos),
      },
      album: {
        total: albumCards.length,
        unread: countUnseenMedia(circleMedia),
      },
      'my-albums': {
        total: myAlbumItems.length,
        unread: countUnseenMedia(myAlbumItems),
      },
      newest: {
        total: circleMedia.length,
        unread: countUnseenMedia(circleMedia),
      },
    }),
    [
      albumCards.length,
      circleMedia,
      circlePhotos,
      circleVideos,
      countUnseenMedia,
      myAlbumItems,
    ],
  );

  const sharedBrowsePills: { id: SharedBrowseMode; label: string }[] = [
    { id: 'photos', label: 'All pictures' },
    { id: 'videos', label: 'All videos' },
    { id: 'album', label: 'By album' },
    ...(canUpload ? [{ id: 'my-albums' as const, label: 'My albums' }] : []),
    { id: 'newest', label: 'Newest' },
  ];

  const renderBrowsePills = () => (
    <div
      className={circleBrowsePillListClass}
      role="tablist"
      aria-label="Browse shared media"
    >
      <div className={circleBrowsePillRowClass}>
        {sharedBrowsePills.map((pill) => {
          const active = sharedBrowseMode === pill.id && !showGrid;
          const counts = sharedBrowseTabCounts[pill.id];
          return (
          <button
            key={pill.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => selectSharedBrowseMode(pill.id)}
            className={circleBrowsePillButtonClass(active)}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              {pill.label}
              <CircleFolderCountBadge
                unread={counts.unread}
                total={counts.total}
                onPrimary={active}
              />
            </span>
          </button>
          );
        })}
      </div>
    </div>
  );

  const renderMediaGrid = (items: GalleryAlbumMedia[]) => (
    <div className={photoGridClass}>
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => openLightbox(items, index)}
          className="aspect-square rounded-2xl overflow-hidden border border-slate-100 bg-slate-50"
        >
          <GalleryThumb item={item} unseen={!viewedIds.has(item.id)} />
        </button>
      ))}
    </div>
  );

  const handleCreateAlbum = async () => {
    if (!canUpload) return;
    setBusy(true);
    setError(null);
    try {
      const albumId = await createGalleryAlbum(db, {
        patientId: patient.patientId,
        title: newAlbumTitle,
        createdByUid: user.uid,
      });
      setNewAlbumTitle('');
      setShowCreateAlbum(false);
      await loadAll();
      const list = await listGalleryAlbums(db, patient.patientId);
      const created = list.find((a) => a.id === albumId);
      if (created) {
        openManageAlbum(created, 'upload-flow');
      }
      setMessage('Album created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create album.');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files?.length || !selectedAlbum || !canUpload) return;
    const fileList = Array.from(files);
    setBusy(true);
    setError(null);
    setMessage(null);
    setUploadProgress({ index: 1, total: fileList.length, phase: 'preparing' });
    try {
      await uploadCircleGalleryMediaToAlbum({
        db,
        storage,
        patientId: patient.patientId,
        albumId: selectedAlbum.id,
        uploadedByUid: user.uid,
        uploadedByRole: role,
        senderName,
        files: fileList,
        caption: uploadCaption,
        onProgress: setUploadProgress,
      });
      setUploadCaption('');
      await loadAll();
      await loadAlbumDetail(selectedAlbum);
      setMessage(
        fileList.length === 1
          ? 'Photo uploaded.'
          : `${fileList.length} items uploaded.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  };

  const handleSaveCaption = async () => {
    if (!editingMedia) return;
    setBusy(true);
    setError(null);
    try {
      await updateCircleGalleryCaption(db, {
        mediaId: editingMedia.id,
        caption: editCaption,
      });
      setEditingMedia(null);
      await loadAll();
      if (selectedAlbum) await loadAlbumDetail(selectedAlbum);
      setMessage('Description saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save description.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteMedia = async (item: GalleryAlbumMedia) => {
    setBusy(true);
    setError(null);
    try {
      await deleteCircleGalleryMedia(db, storage, item);
      setMediaPendingDelete(null);
      await loadAll();
      if (selectedAlbum) await loadAlbumDetail(selectedAlbum);
      setMessage('Deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
    } finally {
      setBusy(false);
    }
  };

  const requestDeleteMedia = (item: GalleryAlbumMedia) => {
    if (skipPhotoDeleteConfirm) {
      void handleDeleteMedia(item);
      return;
    }
    setMediaPendingDelete(item);
  };

  const handleDeleteAlbum = async () => {
    if (!selectedAlbum) return;
    setBusy(true);
    setError(null);
    try {
      await deleteGalleryAlbum(db, storage, {
        patientId: patient.patientId,
        albumId: selectedAlbum.id,
      });
      setShowDeleteAlbumConfirm(false);
      setSelectedAlbum(null);
      if (manageEntryPoint === 'shared-browse') {
        exitManageToBrowse();
      } else {
        setManageScreen('albums');
        await loadAll();
      }
      setMessage('Album deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete album.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddExisting = async (item: GalleryAlbumMedia) => {
    if (!selectedAlbum) return;
    setBusy(true);
    setError(null);
    try {
      await assignMediaToAlbum(db, {
        patientId: patient.patientId,
        mediaId: item.id,
        albumId: selectedAlbum.id,
      });
      await loadAll();
      await loadAlbumDetail(selectedAlbum);
      setMessage('Added to album.');
      setShowAddExisting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to album.');
    } finally {
      setBusy(false);
    }
  };

  const openManageAlbum = (
    album: GalleryAlbum,
    entryPoint: ManageEntryPoint = 'upload-flow',
  ) => {
    setManageEntryPoint(entryPoint);
    setSelectedAlbum(album);
    setManageScreen('album');
    setMainMode('manage');
    setRenamingAlbum(false);
    setMessage(null);
    void loadAlbumDetail(album);
  };

  const startRenameAlbum = () => {
    if (!selectedAlbum || !canManageAlbum(selectedAlbum)) return;
    setRenameAlbumTitle(selectedAlbum.title);
    setRenamingAlbum(true);
  };

  const handleRenameAlbum = async () => {
    if (!selectedAlbum || !canManageAlbum(selectedAlbum)) return;
    const title = renameAlbumTitle.trim();
    if (!title) return;
    setBusy(true);
    setError(null);
    try {
      await renameGalleryAlbum(db, {
        patientId: patient.patientId,
        albumId: selectedAlbum.id,
        title,
      });
      setSelectedAlbum({ ...selectedAlbum, title });
      setRenamingAlbum(false);
      await loadAll();
      setMessage('Album renamed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename album.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 max-h-full overflow-hidden">
      <div className={cn(circleWorkTabPanelClass(compactChrome), 'max-h-full')}>
        <div className={cn(circleWorkTabHeaderClass(compactChrome), circleSectionHeaderStackClass, compactChrome && 'space-y-2')}>
          <div className="flex items-start justify-between gap-2">
            {mainMode === 'browse' && (
              <CircleWorkTabSectionIntro
                className="w-full"
                icon={ImageIcon}
                iconClassName="text-blue-600"
                title="Media gallery"
                subtitle="Photos and videos shared with your loved one."
                trailing={
                  canUpload ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMainMode('manage');
                        setManageScreen('albums');
                        setMessage(null);
                      }}
                      className="shrink-0 w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm hover:bg-blue-700 transition-colors"
                      aria-label="Upload photos or videos"
                      title="Upload"
                    >
                      <Upload size={18} />
                    </button>
                  ) : undefined
                }
              />
            )}
            {mainMode === 'manage' && manageScreen === 'albums' && (
              <>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={exitManageToBrowse}
                    className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 shrink-0"
                    aria-label="Back to media gallery"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="min-w-0">
                    <h3 className={circleSectionTitleClass}>Your albums</h3>
                    <p className={circleSectionSubtitleClass}>Add and organize what you share.</p>
                  </div>
                </div>
                {canUpload && (
                  <button
                    type="button"
                    onClick={() => setShowCreateAlbum((v) => !v)}
                    className="shrink-0 flex items-center gap-1 text-sm font-semibold text-blue-600 px-2 py-1"
                  >
                    <FolderPlus size={16} />
                    New
                  </button>
                )}
              </>
            )}
            {mainMode === 'manage' && manageScreen === 'album' && selectedAlbum && (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={backFromManageAlbum}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 shrink-0"
                  aria-label={
                    manageEntryPoint === 'shared-browse'
                      ? 'Back to shared albums'
                      : 'Back to your albums'
                  }
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="min-w-0">
                  <h3 className={cn(circleSectionTitleClass, 'truncate')}>
                    {manageEntryPoint === 'shared-browse' ? 'Shared albums' : 'Your albums'}
                  </h3>
                  <p className={cn(circleSectionSubtitleClass, 'truncate')}>{selectedAlbum.title}</p>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-700">{message}</p>}

          {mainMode === 'browse' && (
            <div className={circleTabListClass} role="tablist" aria-label="Gallery sections">
              <button
                type="button"
                role="tab"
                aria-selected={browseTab === 'shared'}
                onClick={() => {
                  setBrowseTab('shared');
                  setShowGrid(false);
                }}
                className={circleTabButtonClass(browseTab === 'shared')}
              >
                Shared
              </button>
              {showPatientTab && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={browseTab === 'patient'}
                  onClick={() => {
                    setBrowseTab('patient');
                    setShowGrid(true);
                    setGridScope('all');
                  }}
                  className={circleTabButtonClass(browseTab === 'patient', 'truncate')}
                >
                  From {patient.displayName.split(' ')[0]}
                </button>
              )}
            </div>
          )}
        </div>

        <div className={cn(circleSectionBodyClass, 'p-4')}>
        {loading && mainMode === 'browse' && !showGrid && (
          <p className="text-sm text-slate-500">Loading gallery…</p>
        )}

        {mainMode === 'browse' && browseTab === 'shared' && !showGrid && !loading && (
          <div className="space-y-4">
            {renderBrowsePills()}

            {sharedBrowseMode === 'album' && albumCards.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">
                  Browse by album
                </p>
                <div className={photoGridClass}>
                  {albumCards.map(({ album, cover, count, lastModified, unseen }) => (
                    <button
                      key={album.id}
                      type="button"
                      onClick={() => openAlbumGrid(album.id)}
                      className="text-left rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm"
                    >
                      <div className="aspect-square relative bg-slate-50">
                        {cover ? (
                          <GalleryThumb item={cover} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200">
                            <ImageIcon size={36} />
                          </div>
                        )}
                        {unseen > 0 && (
                          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-bold uppercase">
                            {formatCircleBadgeCount(unseen)} new
                          </span>
                        )}
                        <AlbumThumbnailOverlay
                          title={album.title}
                          count={count}
                          lastModified={lastModified}
                          compact={compactAlbumTiles}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sharedBrowseMode === 'my-albums' && canUpload && myAlbumCards.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">
                  Your albums
                </p>
                <div className={photoGridClass}>
                  {myAlbumCards.map(({ album, cover, count, lastModified, unseen }) => (
                    <button
                      key={album.id}
                      type="button"
                      onClick={() => openAlbumGrid(album.id)}
                      className="text-left rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm"
                    >
                      <div className="aspect-square relative bg-slate-50">
                        {cover ? (
                          <GalleryThumb item={cover} unseen={unseen > 0} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200">
                            <ImageIcon size={36} />
                          </div>
                        )}
                        {unseen > 0 && (
                          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-bold uppercase">
                            {formatCircleBadgeCount(unseen)} new
                          </span>
                        )}
                        <AlbumThumbnailOverlay
                          title={album.title}
                          count={count}
                          lastModified={lastModified}
                          compact={compactAlbumTiles}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sharedBrowseMode === 'my-albums' && canUpload && myAlbumCards.length === 0 && (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
                <p className="text-sm text-slate-500 leading-relaxed">
                  Create an album to start sharing photos and videos.
                </p>
              </div>
            )}

            {sharedBrowseMode !== 'album' && inlineBrowseItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="min-w-0">
                    <h3 className={circleSectionTitleClass}>{inlineBrowseTitle}</h3>
                    <p className={circleSectionSubtitleClass}>
                      {inlineBrowseItems.length} item
                      {inlineBrowseItems.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openLightbox(inlineBrowseItems, 0, { slideshow: true })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shrink-0"
                  >
                    <Play size={14} fill="currentColor" />
                    Play all
                  </button>
                </div>
                {renderMediaGrid(inlineBrowseItems)}
              </div>
            )}

            {sharedBrowseMode !== 'album' &&
              sharedBrowseMode !== 'my-albums' &&
              inlineBrowseItems.length === 0 && (
              <p className="text-sm text-slate-500 px-1">
                {sharedBrowseMode === 'videos' ? 'No videos shared yet.' : 'Nothing here yet.'}
              </p>
            )}

            {sharedBrowseMode === 'album' && circleMedia.length === 0 && (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
                <p className="text-sm text-slate-500 leading-relaxed">
                  No shared photos yet.
                  {canUpload ? ' Tap the upload button to add the first album.' : ''}
                </p>
              </div>
            )}

            {sharedBrowseMode === 'album' && circleMedia.length > 0 && albumCards.length === 0 && (
              <p className="text-sm text-slate-500 px-1">No albums yet.</p>
            )}
          </div>
        )}

        {mainMode === 'browse' && showGrid && !loading && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {browseTab === 'shared' && (
                <button
                  type="button"
                  onClick={backFromSharedGrid}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"
                  aria-label="Back"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <h3 className={cn(circleSectionTitleClass, 'truncate')}>{gridTitle}</h3>
                <p className={circleSectionSubtitleClass}>
                  {gridItems.length} item{gridItems.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {gridAlbum && canUpload && canManageAlbum(gridAlbum) && (
                  <button
                    type="button"
                    onClick={() => openManageAlbum(gridAlbum, 'shared-browse')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50"
                  >
                    <Pencil size={14} />
                    Manage
                  </button>
                )}
                {gridItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => openLightbox(gridItems, 0, { slideshow: true })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                  >
                    <Play size={14} fill="currentColor" />
                    Play all
                  </button>
                )}
              </div>
            </div>

            {browseTab === 'patient' && (
              <p className="text-xs text-slate-500 px-1 leading-relaxed">
                Photos and videos your loved one chose to share with their circle.
              </p>
            )}

            {gridItems.length === 0 ? (
              <p className="text-sm text-slate-500 px-1">
                {browseTab === 'patient'
                  ? 'No uploads from your loved one yet.'
                  : 'Nothing here yet.'}
              </p>
            ) : (
              renderMediaGrid(gridItems)
            )}
          </div>
        )}

        {mainMode === 'manage' && manageScreen === 'albums' && (
          <div className="space-y-4">
            {showCreateAlbum && (
              <div className={cn(circleInsetCardClass, 'p-5')}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAlbumTitle}
                    onChange={(e) => setNewAlbumTitle(e.target.value)}
                    placeholder="Album name"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
                  />
                  <button
                    type="button"
                    disabled={busy || !newAlbumTitle.trim()}
                    onClick={() => void handleCreateAlbum()}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-bold disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
            {myAlbumCards.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
                <p className="text-sm text-slate-500 leading-relaxed">
                  Create an album to start sharing photos and videos.
                </p>
              </div>
            ) : (
              <div className={photoGridClass}>
                {myAlbumCards.map(({ album, cover, count, lastModified }) => (
                  <button
                    key={album.id}
                    type="button"
                    onClick={() => openManageAlbum(album)}
                    className="text-left rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm"
                  >
                    <div className="aspect-square relative bg-slate-50">
                      {cover ? (
                        <GalleryThumb item={cover} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                          <ImageIcon size={36} />
                        </div>
                      )}
                      <AlbumThumbnailOverlay
                        title={album.title}
                        count={count}
                        lastModified={lastModified}
                        compact={compactAlbumTiles}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {mainMode === 'manage' && manageScreen === 'album' && selectedAlbum && (
          <div className="space-y-4">
            <div className={cn(circleInsetCardClass, 'p-5 space-y-4')}>
              <div className="flex items-start justify-between gap-2">
                {renamingAlbum ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={renameAlbumTitle}
                      onChange={(e) => setRenameAlbumTitle(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold"
                      maxLength={100}
                    />
                    <button
                      type="button"
                      disabled={busy || !renameAlbumTitle.trim()}
                      onClick={() => void handleRenameAlbum()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-2xl text-sm font-bold disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingAlbum(false)}
                      className="px-3 py-2 text-sm font-semibold text-slate-500"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="font-bold text-slate-800">Add to {selectedAlbum.title}</h3>
                    {canManageAlbum(selectedAlbum) && (
                      <button
                        type="button"
                        onClick={startRenameAlbum}
                        className="flex items-center gap-1 text-sm font-semibold text-blue-600 shrink-0"
                      >
                        <Pencil size={14} />
                        Rename
                      </button>
                    )}
                  </>
                )}
              </div>
              <textarea
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl resize-none text-sm"
              />
              <label
                className={cn(
                  'flex flex-col items-center justify-center gap-3 py-8 border-2 border-dashed rounded-2xl transition-colors',
                  uploadProgress
                    ? 'border-blue-200 bg-blue-50/40 pointer-events-none'
                    : 'border-slate-200 cursor-pointer hover:border-blue-300',
                  busy && !uploadProgress && 'opacity-50 pointer-events-none',
                )}
              >
                {uploadProgress ? (
                  <div className="w-full max-w-sm px-6 space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={20} className="text-blue-600 animate-spin shrink-0" />
                      <span className="font-semibold text-slate-700 text-sm text-center">
                        {galleryUploadStatusLabel(uploadProgress)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-white rounded-full overflow-hidden border border-blue-100">
                      <div
                        className="h-full bg-blue-600 transition-[width] duration-300 ease-out"
                        style={{ width: `${galleryUploadOverallPercent(uploadProgress)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 text-center">
                      Large photos are resized for faster sharing — this may take a moment.
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="text-blue-600" />
                    <span className="font-semibold text-slate-700 text-sm text-center px-4">
                      Choose photos or videos
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,video/*,.heic,.heif"
                  multiple
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    void handleUploadFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
              {unassigned.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddExisting((v) => !v)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-blue-600"
                  >
                    <Plus size={16} />
                    Add existing ({unassigned.length})
                  </button>
                  {showAddExisting && (
                    <ul className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                      {unassigned.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleAddExisting(item)}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 text-left"
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                              <GalleryThumb item={item} />
                            </div>
                            <span className="text-xs text-slate-600 truncate flex-1">
                              {item.caption || (item.isVideo ? 'Video' : 'Photo')}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className={cn(circleInsetCardClass, 'p-5 space-y-4')}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-slate-800">
                  {albumMedia.length} item{albumMedia.length === 1 ? '' : 's'}
                </h3>
                {canManageAlbum(selectedAlbum) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setShowDeleteAlbumConfirm(true)}
                    className="flex items-center gap-1 text-sm font-semibold text-red-600 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                )}
              </div>
              <div className={photoGridClass}>
                {albumMedia.map((item) => (
                  <div
                    key={item.id}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100"
                  >
                    <GalleryThumb item={item} />
                    {item.uploadedByUid === user.uid && (
                      <div className="absolute top-1 right-1 flex gap-1">
                        <button
                          type="button"
                          aria-label="Edit"
                          disabled={busy}
                          onClick={() => {
                            setEditingMedia(item);
                            setEditCaption(item.caption);
                          }}
                          className="w-8 h-8 rounded-full bg-white/95 text-slate-600 flex items-center justify-center shadow"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete"
                          disabled={busy}
                          onClick={() => requestDeleteMedia(item)}
                          className="w-8 h-8 rounded-full bg-white/95 text-red-600 flex items-center justify-center shadow"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {lightbox && (
        <CircleGalleryLightbox
          db={db}
          user={user}
          patientId={patient.patientId}
          patientDisplayName={patient.displayName}
          items={lightbox.items}
          index={lightbox.index}
          autoPlaySlideshow={lightbox.slideshow}
          onIndexChange={(index) => setLightbox((prev) => (prev ? { ...prev, index } : null))}
          onClose={() => {
            setLightbox(null);
            refreshViewed();
          }}
        />
      )}

      {mediaPendingDelete && (
        <CircleDeleteMediaConfirmModal
          open
          isVideo={mediaPendingDelete.isVideo}
          caption={mediaPendingDelete.caption}
          busy={busy}
          onCancel={() => setMediaPendingDelete(null)}
          onConfirm={() => void handleDeleteMedia(mediaPendingDelete)}
        />
      )}

      {selectedAlbum && (
        <CircleDeleteAlbumConfirmModal
          open={showDeleteAlbumConfirm}
          albumTitle={selectedAlbum.title}
          itemCount={albumMedia.length}
          busy={busy}
          onCancel={() => setShowDeleteAlbumConfirm(false)}
          onConfirm={() => void handleDeleteAlbum()}
        />
      )}

      {editingMedia && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40">
          <div className="w-full max-w-md bg-white rounded-[32px] p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-slate-800">Edit description</h3>
            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl resize-none text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditingMedia(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSaveCaption()}
                className="px-5 py-2 bg-blue-600 text-white rounded-2xl text-sm font-bold disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
