import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import {
  assignMediaToAlbum,
  cn,
  createGalleryAlbum,
  deleteCircleGalleryMedia,
  deleteGalleryAlbum,
  listAlbumMedia,
  listGalleryAlbums,
  listUnassignedCircleMedia,
  type CircleMemberRole,
  type CirclePatientSummary,
  type GalleryAlbum,
  type GalleryAlbumMedia,
  updateCircleGalleryCaption,
  uploadCircleGalleryMediaToAlbum,
} from '@medxforce/shared';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

type Screen = 'albums' | 'album';

interface PatientGalleryScreenProps {
  user: User;
  patient: CirclePatientSummary;
  db: Firestore;
  storage: FirebaseStorage;
  onBack: () => void;
}

export function PatientGalleryScreen({
  user,
  patient,
  db,
  storage,
  onBack,
}: PatientGalleryScreenProps) {
  const [screen, setScreen] = useState<Screen>('albums');
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);
  const [media, setMedia] = useState<GalleryAlbumMedia[]>([]);
  const [unassigned, setUnassigned] = useState<GalleryAlbumMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [uploadCaption, setUploadCaption] = useState('');
  const [editingMedia, setEditingMedia] = useState<GalleryAlbumMedia | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [showAddExisting, setShowAddExisting] = useState(false);

  const role = patient.role as CircleMemberRole;
  const senderName = user.displayName || user.email || 'Family Member';

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listGalleryAlbums(db, patient.patientId);
      setAlbums(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load albums.');
    } finally {
      setLoading(false);
    }
  }, [db, patient.patientId]);

  const loadAlbumDetail = useCallback(
    async (album: GalleryAlbum) => {
      setLoading(true);
      setError(null);
      try {
        const [items, loose] = await Promise.all([
          listAlbumMedia(db, patient.patientId, album.id),
          listUnassignedCircleMedia(db, patient.patientId, user.uid),
        ]);
        setMedia(items);
        setUnassigned(loose);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load album.');
      } finally {
        setLoading(false);
      }
    },
    [db, patient.patientId, user.uid],
  );

  useEffect(() => {
    void loadAlbums();
  }, [loadAlbums]);

  const openAlbum = (album: GalleryAlbum) => {
    setSelectedAlbum(album);
    setScreen('album');
    setMessage(null);
    setShowAddExisting(false);
    void loadAlbumDetail(album);
  };

  const handleCreateAlbum = async () => {
    if (!patient.canUpload) return;
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
      const list = await listGalleryAlbums(db, patient.patientId);
      setAlbums(list);
      const fresh = list.find((a) => a.id === albumId);
      if (fresh) openAlbum(fresh);
      setMessage('Album created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create album.');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files?.length || !selectedAlbum || !patient.canUpload) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const uploadedIds = await uploadCircleGalleryMediaToAlbum({
        db,
        storage,
        patientId: patient.patientId,
        albumId: selectedAlbum.id,
        uploadedByUid: user.uid,
        uploadedByRole: role,
        senderName,
        files: Array.from(files),
        caption: uploadCaption,
      });
      setUploadCaption('');
      await loadAlbumDetail(selectedAlbum);
      await loadAlbums();
      if (uploadedIds.length > 0) {
        setMessage(
          uploadedIds.length === 1
            ? 'Uploaded 1 item.'
            : `Uploaded ${uploadedIds.length} items.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
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
      if (selectedAlbum) await loadAlbumDetail(selectedAlbum);
      setMessage('Description saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save description.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteMedia = async (item: GalleryAlbumMedia) => {
    if (!window.confirm('Delete this photo or video?')) return;
    setBusy(true);
    setError(null);
    try {
      await deleteCircleGalleryMedia(db, storage, item);
      if (selectedAlbum) await loadAlbumDetail(selectedAlbum);
      await loadAlbums();
      setMessage('Deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!selectedAlbum) return;
    if (
      !window.confirm(
        `Delete album "${selectedAlbum.title}" and all photos/videos inside it?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteGalleryAlbum(db, storage, {
        patientId: patient.patientId,
        albumId: selectedAlbum.id,
      });
      setSelectedAlbum(null);
      setScreen('albums');
      await loadAlbums();
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
      await loadAlbumDetail(selectedAlbum);
      await loadAlbums();
      setMessage('Added to album.');
      setShowAddExisting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to album.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-blue-600">
        ← Back to patients
      </button>

      <div>
        <h2 className="text-lg font-bold text-slate-800">{patient.displayName}</h2>
        <p className="text-sm text-slate-500">
          {screen === 'albums'
            ? 'Create albums and share photos & videos with your loved one.'
            : selectedAlbum?.title}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      {screen === 'albums' && (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-slate-800">Albums</h3>
            {patient.canUpload && (
              <button
                type="button"
                onClick={() => setShowCreateAlbum((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-semibold text-blue-600"
              >
                <FolderPlus size={16} />
                New album
              </button>
            )}
          </div>

          {showCreateAlbum && patient.canUpload && (
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
          )}

          {loading ? (
            <p className="text-sm text-slate-500">Loading albums…</p>
          ) : albums.length === 0 ? (
            <p className="text-sm text-slate-500 leading-relaxed">
              No albums yet. Create one, then add photos and videos.
            </p>
          ) : (
            <ul className="space-y-2">
              {albums.map((album) => (
                <li key={album.id}>
                  <button
                    type="button"
                    onClick={() => openAlbum(album)}
                    className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-colors flex items-center justify-between gap-3"
                  >
                    <span className="font-bold text-slate-800">{album.title}</span>
                    <ChevronHint />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {screen === 'album' && selectedAlbum && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setScreen('albums');
              setSelectedAlbum(null);
              void loadAlbums();
            }}
            className="text-sm font-semibold text-blue-600"
          >
            ← All albums
          </button>

          {patient.canUpload && (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-slate-800">Add to album</h3>
              <textarea
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder="Description for new uploads (optional)"
                rows={2}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl resize-none text-sm"
              />
              <label
                className={cn(
                  'flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/30',
                  busy && 'opacity-50 pointer-events-none',
                )}
              >
                <Upload size={24} className="text-blue-600" />
                <span className="font-semibold text-slate-700 text-sm">
                  {busy ? 'Uploading…' : 'Choose photos or videos (multiple allowed)'}
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
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
                    Add existing uploads ({unassigned.length})
                  </button>
                  {showAddExisting && (
                    <ul className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                      {unassigned.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleAddExisting(item)}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 text-left"
                          >
                            <MediaThumb item={item} />
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
          )}

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-slate-800">
                {loading ? 'Loading…' : `${media.length} item${media.length === 1 ? '' : 's'}`}
              </h3>
              {patient.canUpload && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDeleteAlbum()}
                  className="flex items-center gap-1 text-sm font-semibold text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Delete album
                </button>
              )}
            </div>

            {!loading && media.length === 0 && (
              <p className="text-sm text-slate-500">This album is empty. Upload media above.</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {media.map((item) => (
                <div
                  key={item.id}
                  className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-square group"
                >
                  <MediaThumb item={item} large />
                  {item.caption && (
                    <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-2 py-1 truncate">
                      {item.caption}
                    </p>
                  )}
                  {patient.canUpload && item.uploadedByUid === user.uid && (
                    <div className="absolute top-1 right-1 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        aria-label="Edit description"
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
                        onClick={() => void handleDeleteMedia(item)}
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

      {editingMedia && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md bg-white rounded-[28px] p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-slate-800">Edit description</h3>
            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl resize-none text-sm"
              placeholder="Describe this photo or video"
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

function MediaThumb({ item, large }: { item: GalleryAlbumMedia; large?: boolean }) {
  if (item.isVideo) {
    return (
      <div
        className={cn(
          'w-full h-full flex items-center justify-center bg-slate-800 text-white',
          !large && 'w-10 h-10 rounded-lg shrink-0',
        )}
      >
        <Video size={large ? 32 : 18} />
      </div>
    );
  }
  return (
    <img
      src={item.thumbnailUrl || item.url}
      alt=""
      className={cn(
        'object-cover',
        large ? 'w-full h-full' : 'w-10 h-10 rounded-lg shrink-0',
      )}
      referrerPolicy="no-referrer"
    />
  );
}

function ChevronHint() {
  return (
    <span className="text-slate-300 text-lg" aria-hidden>
      ›
    </span>
  );
}
