import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
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
  dedupeGalleryAlbumsForDisplay,
  ensureReactionsGalleryAlbum,
  findCanonicalReactionsAlbum,
  isReactionsTitleAlbum,
  mediaBelongsToGalleryAlbum,
  renameGalleryAlbum,
  resolveGalleryAlbumTitle,
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
import { CircleHorizontalScrollStrip } from './CircleHorizontalScrollStrip';
import { CircleGalleryLightbox, GalleryThumb } from './CircleGalleryLightbox';
import { CircleWorkTabSectionIntro } from './CircleWorkTabSectionIntro';
import { CircleDeleteAlbumConfirmModal } from './CircleDeleteAlbumConfirmModal';
import { CircleDeleteMediaConfirmModal } from './CircleDeleteMediaConfirmModal';
import { CircleFolderCountBadge, formatCircleBadgeCount } from './CircleCountBadge';
import { cn } from '../lib/utils';
import { useCircleT, type CircleTranslator } from '../lib/circleI18nContext';
import {
  circleInsetCardClass,
  circleSectionBodyClass,
  circleSectionHeaderStackClass,
  circleSectionSubtitleClass,
  circleSectionTitleClass,
  circleBrowsePillButtonClass,
  circleBrowsePillListClass,
  circleTabButtonClass,
  circleTabListClass,
  circleWorkTabHeaderClass,
  circleWorkTabPanelClass,
} from '../lib/circleSectionStyles';
import type { CircleGalleryIntent } from '../lib/circleGalleryIntent';

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

function galleryUploadStatusLabel(
  progress: GalleryUploadFileProgress,
  t: CircleTranslator,
): string {
  const { index, total, phase, percent } = progress;
  const pct = percent ?? 0;
  if (phase === 'preparing') {
    return total > 1
      ? t('gallery.uploadPreparingMulti', { index, total })
      : t('gallery.uploadPreparing');
  }
  if (total > 1) {
    return pct > 0
      ? t('gallery.uploadingMultiPercent', { index, total, percent: pct })
      : t('gallery.uploadingMulti', { index, total });
  }
  return pct > 0 ? t('gallery.uploadingPercent', { percent: pct }) : t('gallery.uploading');
}

function galleryItemCountLabel(t: CircleTranslator, count: number): string {
  return t(count === 1 ? 'gallery.item_one' : 'gallery.item_other', { count });
}

function galleryAlbumTitle(
  album: GalleryAlbum,
  t: CircleTranslator,
): string {
  return resolveGalleryAlbumTitle(album, {
    defaultAlbum: t('gallery.defaultAlbumTitle'),
    reactionsAlbum: t('gallery.reactionsAlbumTitle'),
  });
}

function mediaInAlbum(
  item: GalleryAlbumMedia,
  album: GalleryAlbum,
  reactedMediaIds: ReadonlySet<string>,
): boolean {
  return mediaBelongsToGalleryAlbum(item, album, reactedMediaIds);
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
  const t = useCircleT();
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
            {galleryItemCountLabel(t, count)}
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
  galleryIntent?: CircleGalleryIntent | null;
  onGalleryIntentConsumed?: () => void;
}

export function PatientGalleryScreen({
  user,
  patient,
  db,
  storage,
  galleryIntent = null,
  onGalleryIntentConsumed,
}: PatientGalleryScreenProps) {
  const t = useCircleT();
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
    session: number;
  } | null>(null);
  const [viewedIds, setViewedIds] = useState<Set<string>>(() =>
    getCircleGalleryViewedIds(patient.patientId),
  );
  const [reactedMediaIds, setReactedMediaIds] = useState<Set<string>>(() => new Set());

  const role = patient.role as CircleMemberRole;
  const senderName = user.displayName || user.email || t('gallery.familyMemberFallback');

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
      const items = circleMedia.filter((m) => mediaInAlbum(m, album, reactedMediaIds));
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
  }, [albums, circleMedia, reactedMediaIds, viewedIds]);

  const visibleAlbumCards = useMemo(() => {
    const canonicalReactionsId = findCanonicalReactionsAlbum(albums)?.id;
    return albumCards.filter(({ album, count }) => {
      if (album.isReactions) return count > 0 && album.id === canonicalReactionsId;
      if (canonicalReactionsId && isReactionsTitleAlbum(album.title)) return false;
      return true;
    });
  }, [albumCards, albums]);

  const myAlbumCards = useMemo(
    () => albumCards.filter(({ album }) => album.createdByUid === user.uid),
    [albumCards, user.uid],
  );

  const canManageAlbum = useCallback(
    (album: GalleryAlbum) =>
      album.createdByUid === user.uid && !album.isDefault && !album.isReactions,
    [user.uid],
  );

  const refreshViewed = useCallback(() => {
    setViewedIds(getCircleGalleryViewedIds(patient.patientId));
  }, [patient.patientId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureReactionsGalleryAlbum(db, {
        patientId: patient.patientId,
        createdByUid: user.uid,
      }).catch(() => undefined);
      const [albumList, media] = await Promise.all([
        listGalleryAlbums(db, patient.patientId),
        listAllGalleryMediaForPatient(db, patient.patientId),
      ]);
      setAlbums(dedupeGalleryAlbumsForDisplay(albumList));
      setAllMedia(media);
      refreshViewed();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('gallery.errorLoadGallery'));
    } finally {
      setLoading(false);
    }
  }, [db, patient.patientId, refreshViewed, t, user.uid]);

  useEffect(() => {
    const reactionsQuery = query(
      collection(db, 'media_reactions'),
      where('patientId', '==', patient.patientId),
    );
    return onSnapshot(
      reactionsQuery,
      (snapshot) => {
        const ids = new Set<string>();
        for (const docSnap of snapshot.docs) {
          const mediaId = docSnap.data().mediaId;
          if (typeof mediaId === 'string' && mediaId) ids.add(mediaId);
        }
        setReactedMediaIds(ids);
      },
      () => setReactedMediaIds(new Set()),
    );
  }, [db, patient.patientId]);

  useEffect(() => {
    if (!galleryIntent || loading) return;
    if (galleryIntent.type !== 'open-album' || galleryIntent.albumKind !== 'reactions') return;

    const reactionsAlbum = albums.find((album) => album.isReactions);
    if (reactionsAlbum) {
      setMainMode('browse');
      setBrowseTab('shared');
      setSharedBrowseMode('album');
      setGridScope(reactionsAlbum.id);
      setShowGrid(true);
    }
    onGalleryIntentConsumed?.();
  }, [albums, galleryIntent, loading, onGalleryIntentConsumed]);

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
          (m) => m.source !== 'patient' && mediaInAlbum(m, album, reactedMediaIds),
        );
        const loose = canUpload
          ? await listUnassignedCircleMedia(db, patient.patientId, user.uid)
          : [];
        setAlbumMedia(items);
        setUnassigned(loose);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('gallery.errorLoadAlbum'));
      } finally {
        setLoading(false);
      }
    },
    [canUpload, db, patient.patientId, reactedMediaIds, user.uid, t],
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

  const resolveGridAlbum = useCallback(
    (albumId: string): GalleryAlbum | undefined => {
      const direct = albums.find((album) => album.id === albumId);
      if (direct) return direct;
      return findCanonicalReactionsAlbum(albums);
    },
    [albums],
  );

  const gridItems = useMemo(() => {
    if (browseTab === 'patient') {
      return sortByNewest(patientMedia);
    }
    const album = resolveGridAlbum(gridScope);
    if (!album) return [];
    return sortByNewest(circleMedia.filter((m) => mediaInAlbum(m, album, reactedMediaIds)));
  }, [albums, browseTab, circleMedia, gridScope, patientMedia, reactedMediaIds, resolveGridAlbum]);

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
    if (browseTab === 'patient') {
      return t('gallery.fromPatientGridTitle', { name: patient.displayName });
    }
    const album = resolveGridAlbum(gridScope);
    return album ? galleryAlbumTitle(album, t) : t('gallery.albumFallback');
  }, [albums, browseTab, gridScope, patient.displayName, resolveGridAlbum, t]);

  const inlineBrowseTitle = useMemo(() => {
    switch (sharedBrowseMode) {
      case 'photos':
        return t('gallery.allPictures');
      case 'videos':
        return t('gallery.allVideos');
      case 'newest':
        return t('gallery.newest');
      default:
        return '';
    }
  }, [sharedBrowseMode, t]);

  const openLightbox = (
    items: GalleryAlbumMedia[],
    index: number,
    options?: { slideshow?: boolean },
  ) => {
    setLightbox((prev) => ({
      items,
      index,
      slideshow: options?.slideshow,
      session: (prev?.session ?? 0) + 1,
    }));
    refreshViewed();
  };

  const handleLightboxIndexChange = useCallback((index: number) => {
    setLightbox((prev) => (prev ? { ...prev, index } : null));
  }, []);

  const handleLightboxClose = useCallback(() => {
    setLightbox(null);
    refreshViewed();
  }, [refreshViewed]);

  const openAlbumGrid = (albumId: string) => {
    const album = albums.find((a) => a.id === albumId);
    const canonicalReactions = findCanonicalReactionsAlbum(albums);
    if (
      canonicalReactions &&
      album &&
      (album.isReactions || isReactionsTitleAlbum(album.title))
    ) {
      setGridScope(canonicalReactions.id);
    } else {
      setGridScope(albumId);
    }
    setShowGrid(true);
  };

  const selectSharedBrowseMode = (mode: SharedBrowseMode) => {
    setSharedBrowseMode(mode);
    setShowGrid(false);
  };

  const gridAlbum = useMemo(
    () => resolveGridAlbum(gridScope),
    [gridScope, resolveGridAlbum],
  );

  useEffect(() => {
    if (!showGrid || browseTab !== 'shared') return;
    const album = albums.find((a) => a.id === gridScope);
    if (album) return;
    const canonicalReactions = findCanonicalReactionsAlbum(albums);
    if (canonicalReactions) setGridScope(canonicalReactions.id);
  }, [albums, browseTab, gridScope, showGrid]);

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
        total: visibleAlbumCards.length,
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
      visibleAlbumCards.length,
      circleMedia,
      circlePhotos,
      circleVideos,
      countUnseenMedia,
      myAlbumItems,
    ],
  );

  const sharedBrowsePills = useMemo((): { id: SharedBrowseMode; label: string }[] => {
    const pills: { id: SharedBrowseMode; label: string }[] = [
      { id: 'photos', label: t('gallery.allPictures') },
      { id: 'videos', label: t('gallery.allVideos') },
      { id: 'album', label: t('gallery.allAlbums') },
      ...(canUpload ? [{ id: 'my-albums' as const, label: t('gallery.myAlbums') }] : []),
      { id: 'newest', label: t('gallery.newest') },
    ];
    return pills.filter((pill) => pill.id !== 'videos' || circleVideos.length > 0);
  }, [canUpload, circleVideos.length, t]);

  useEffect(() => {
    if (sharedBrowseMode === 'videos' && circleVideos.length === 0) {
      setSharedBrowseMode('album');
      setShowGrid(false);
    }
  }, [circleVideos.length, sharedBrowseMode]);

  const renderBrowsePills = () => (
    <CircleHorizontalScrollStrip
      className={cn(circleBrowsePillListClass, 'touch-pan-x')}
      innerClassName="gap-2"
      role="tablist"
      aria-label={t('gallery.browseSharedMediaAria')}
    >
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
    </CircleHorizontalScrollStrip>
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
      setMessage(t('gallery.toastAlbumCreated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('gallery.errorCreateAlbum'));
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
          ? t('gallery.toastPhotoUploaded')
          : t('gallery.toastItemsUploaded', { count: fileList.length }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('gallery.errorUploadFailed'));
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
      setMessage(t('gallery.toastDescriptionSaved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('gallery.errorSaveDescription'));
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
      setMessage(t('gallery.toastDeleted'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('gallery.errorDelete'));
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
      setMessage(t('gallery.toastAlbumDeleted'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('gallery.errorDeleteAlbum'));
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
      setMessage(t('gallery.toastAddedToAlbum'));
      setShowAddExisting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('gallery.errorAddToAlbum'));
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
      setMessage(t('gallery.toastAlbumRenamed'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('gallery.errorRenameAlbum'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 max-h-full overflow-hidden">
      <div className={cn(circleWorkTabPanelClass(compactChrome), 'max-h-full')}>
        <div className={cn(circleWorkTabHeaderClass(compactChrome), circleSectionHeaderStackClass, compactChrome && 'space-y-2', 'min-w-0')}>
          <div className="flex items-start justify-between gap-2">
            {mainMode === 'browse' && (
              <CircleWorkTabSectionIntro
                className="w-full"
                icon={ImageIcon}
                iconClassName="text-blue-600"
                title={t('gallery.title')}
                subtitle={t('gallery.subtitle')}
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
                      aria-label={t('gallery.uploadAriaLabel')}
                      title={t('gallery.uploadTitle')}
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
                    aria-label={t('gallery.backToMediaGallery')}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="min-w-0">
                    <h3 className={circleSectionTitleClass}>{t('gallery.yourAlbums')}</h3>
                    <p className={circleSectionSubtitleClass}>{t('gallery.yourAlbumsSubtitle')}</p>
                  </div>
                </div>
                {canUpload && (
                  <button
                    type="button"
                    onClick={() => setShowCreateAlbum((v) => !v)}
                    className="shrink-0 flex items-center gap-1 text-sm font-semibold text-blue-600 px-2 py-1"
                  >
                    <FolderPlus size={16} />
                    {t('gallery.newAlbum')}
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
                      ? t('gallery.backToSharedAlbums')
                      : t('gallery.backToYourAlbums')
                  }
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="min-w-0">
                  <h3 className={cn(circleSectionTitleClass, 'truncate')}>
                    {manageEntryPoint === 'shared-browse'
                      ? t('gallery.sharedAlbums')
                      : t('gallery.yourAlbums')}
                  </h3>
                  <p className={cn(circleSectionSubtitleClass, 'truncate')}>{selectedAlbum.title}</p>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-700">{message}</p>}

          {mainMode === 'browse' && (
            <div className={circleTabListClass} role="tablist" aria-label={t('gallery.gallerySectionsAria')}>
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
                {t('gallery.tabShared')}
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
                  {t('gallery.tabFromPatient', {
                    firstName: patient.displayName.split(' ')[0],
                  })}
                </button>
              )}
            </div>
          )}

          {mainMode === 'browse' && browseTab === 'shared' && !showGrid && !loading && (
            <div className="min-w-0">{renderBrowsePills()}</div>
          )}
        </div>

        <div className={cn(circleSectionBodyClass, 'p-4')}>
        {loading && mainMode === 'browse' && !showGrid && (
          <p className="text-sm text-slate-500">{t('gallery.loadingGallery')}</p>
        )}

        {mainMode === 'browse' && browseTab === 'shared' && !showGrid && !loading && (
          <div className="space-y-4 min-w-0">
            {sharedBrowseMode === 'album' && visibleAlbumCards.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">
                  {t('gallery.sectionBrowseByAlbum')}
                </p>
                <div className={photoGridClass}>
                  {visibleAlbumCards.map(({ album, cover, count, lastModified, unseen }) => (
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
                            {t('gallery.newBadge', { count: unseen })}
                          </span>
                        )}
                        <AlbumThumbnailOverlay
                          title={galleryAlbumTitle(album, t)}
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
                  {t('gallery.yourAlbums')}
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
                            {t('gallery.newBadge', { count: unseen })}
                          </span>
                        )}
                        <AlbumThumbnailOverlay
                          title={galleryAlbumTitle(album, t)}
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
                  {t('gallery.emptyCreateAlbum')}
                </p>
              </div>
            )}

            {sharedBrowseMode !== 'album' && inlineBrowseItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="min-w-0">
                    <h3 className={circleSectionTitleClass}>{inlineBrowseTitle}</h3>
                    <p className={circleSectionSubtitleClass}>
                      {galleryItemCountLabel(t, inlineBrowseItems.length)}
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
                    {t('gallery.playAll')}
                  </button>
                </div>
                {renderMediaGrid(inlineBrowseItems)}
              </div>
            )}

            {sharedBrowseMode !== 'album' &&
              sharedBrowseMode !== 'my-albums' &&
              inlineBrowseItems.length === 0 && (
              <p className="text-sm text-slate-500 px-1">
                {sharedBrowseMode === 'videos'
                  ? t('gallery.emptyNoVideos')
                  : t('gallery.emptyNothingHere')}
              </p>
            )}

            {sharedBrowseMode === 'album' && circleMedia.length === 0 && (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
                <p className="text-sm text-slate-500 leading-relaxed">
                  {t('gallery.emptyNoSharedPhotos')}
                  {canUpload ? t('gallery.emptyNoSharedPhotosUploadHint') : ''}
                </p>
              </div>
            )}

            {sharedBrowseMode === 'album' && circleMedia.length > 0 && visibleAlbumCards.length === 0 && (
              <p className="text-sm text-slate-500 px-1">{t('gallery.emptyNoAlbums')}</p>
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
                  aria-label={t('gallery.back')}
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <h3 className={cn(circleSectionTitleClass, 'truncate')}>{gridTitle}</h3>
                <p className={circleSectionSubtitleClass}>
                  {galleryItemCountLabel(t, gridItems.length)}
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
                    {t('gallery.manage')}
                  </button>
                )}
                {gridItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => openLightbox(gridItems, 0, { slideshow: true })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                  >
                    <Play size={14} fill="currentColor" />
                    {t('gallery.playAll')}
                  </button>
                )}
              </div>
            </div>

            {browseTab === 'patient' && (
              <p className="text-xs text-slate-500 px-1 leading-relaxed">
                {t('gallery.patientGridHint')}
              </p>
            )}

            {gridItems.length === 0 ? (
              <p className="text-sm text-slate-500 px-1">
                {browseTab === 'patient'
                  ? t('gallery.emptyNoPatientUploads')
                  : t('gallery.emptyNothingHere')}
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
                    placeholder={t('gallery.albumNamePlaceholder')}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
                  />
                  <button
                    type="button"
                    disabled={busy || !newAlbumTitle.trim()}
                    onClick={() => void handleCreateAlbum()}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-bold disabled:opacity-50"
                  >
                    {t('gallery.create')}
                  </button>
                </div>
              </div>
            )}
            {myAlbumCards.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
                <p className="text-sm text-slate-500 leading-relaxed">
                  {t('gallery.emptyCreateAlbum')}
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
                        title={galleryAlbumTitle(album, t)}
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
                      {t('gallery.save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingAlbum(false)}
                      className="px-3 py-2 text-sm font-semibold text-slate-500"
                    >
                      {t('gallery.cancel')}
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="font-bold text-slate-800">
                      {t('gallery.addToAlbum', { albumTitle: selectedAlbum.title })}
                    </h3>
                    {canManageAlbum(selectedAlbum) && (
                      <button
                        type="button"
                        onClick={startRenameAlbum}
                        className="flex items-center gap-1 text-sm font-semibold text-blue-600 shrink-0"
                      >
                        <Pencil size={14} />
                        {t('gallery.rename')}
                      </button>
                    )}
                  </>
                )}
              </div>
              <textarea
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder={t('gallery.descriptionOptionalPlaceholder')}
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
                        {galleryUploadStatusLabel(uploadProgress, t)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-white rounded-full overflow-hidden border border-blue-100">
                      <div
                        className="h-full bg-blue-600 transition-[width] duration-300 ease-out"
                        style={{ width: `${galleryUploadOverallPercent(uploadProgress)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 text-center">
                      {t('gallery.uploadResizeHint')}
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="text-blue-600" />
                    <span className="font-semibold text-slate-700 text-sm text-center px-4">
                      {t('gallery.choosePhotosOrVideos')}
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
                    {t('gallery.addExisting', { count: unassigned.length })}
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
                              {item.caption ||
                                (item.isVideo ? t('gallery.mediaVideo') : t('gallery.mediaPhoto'))}
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
                  {galleryItemCountLabel(t, albumMedia.length)}
                </h3>
                {canManageAlbum(selectedAlbum) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setShowDeleteAlbumConfirm(true)}
                    className="flex items-center gap-1 text-sm font-semibold text-red-600 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {t('gallery.delete')}
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
                          aria-label={t('gallery.editAria')}
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
                          aria-label={t('gallery.deleteAria')}
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
          key={lightbox.session}
          db={db}
          user={user}
          patientId={patient.patientId}
          patientDisplayName={patient.displayName}
          items={lightbox.items}
          index={lightbox.index}
          autoPlaySlideshow={lightbox.slideshow}
          onIndexChange={handleLightboxIndexChange}
          onClose={handleLightboxClose}
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
            <h3 className="font-bold text-slate-800">{t('gallery.editDescription')}</h3>
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
                {t('gallery.cancel')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSaveCaption()}
                className="px-5 py-2 bg-blue-600 text-white rounded-2xl text-sm font-bold disabled:opacity-50"
              >
                {t('gallery.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
