/** @license SPDX-License-Identifier: Apache-2.0 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Sparkles, Users, X } from 'lucide-react';
import { cn } from '../lib/utils';
import type { CircleMapGalleryPhoto, CircleMapOnlineMember } from '../lib/circleMapModel';
import {
  buildCircleMapModel,
  buildCircleMapPreviewModel,
  type CircleMapNode,
  type CircleMapViewMode,
} from '../lib/circleMapModel';
import { CircleMapModeTabs, CircleMapVisual } from './CircleMapVisual';

type DashboardCircleMapModalProps = {
  isOpen: boolean;
  onClose: () => void;
  preferences: {
    userName?: string;
    fullUserDetails?: { identity?: { firstName?: string; lastName?: string; nickName?: string } };
    caregivers?: Record<string, unknown>[];
    friendsAndFamily?: Record<string, unknown>[];
    contacts?: Record<string, unknown>[];
  };
  messages?: unknown[];
  galleryPhotos?: CircleMapGalleryPhoto[];
  onlineNow?: CircleMapOnlineMember[];
  photosByEmail?: Record<string, string>;
  photosByContactId?: Record<string, string>;
  patientPhotoUrl?: string;
  preview?: boolean;
  onManageContacts?: () => void;
  onMessageMember?: (recipientKey: string) => void;
  messagingEnabled?: boolean;
  t: (key: string, params?: Record<string, unknown>) => string;
};

export function DashboardCircleMapModal({
  isOpen,
  onClose,
  preferences,
  messages,
  galleryPhotos,
  onlineNow,
  photosByEmail,
  photosByContactId,
  patientPhotoUrl,
  preview = false,
  onManageContacts,
  onMessageMember,
  messagingEnabled = false,
  t,
}: DashboardCircleMapModalProps) {
  const [mode, setMode] = useState<CircleMapViewMode>('roles');
  const [selected, setSelected] = useState<CircleMapNode | null>(null);

  const model = useMemo(() => {
    if (preview) return buildCircleMapPreviewModel(t);
    return buildCircleMapModel({
      preferences,
      messages,
      galleryPhotos,
      onlineNow,
      photosByEmail,
      photosByContactId,
      patientPhotoUrl,
      mode,
      t,
    });
  }, [galleryPhotos, messages, mode, onlineNow, patientPhotoUrl, photosByContactId, photosByEmail, preferences, preview, t]);

  const membersList = useMemo(
    () => [...model.nodes].sort((a, b) => a.name.localeCompare(b.name)),
    [model.nodes],
  );

  if (!isOpen) return null;

  const showMembersList = mode === 'members';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain bg-slate-950/55 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative w-full max-w-[min(100%,40rem)] sm:max-w-2xl md:max-w-3xl my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden rounded-[28px] sm:rounded-[36px] border border-violet-100 bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 min-h-0">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0 pr-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-[11px] font-black uppercase tracking-wider">
                  <Sparkles size={12} />
                  {t('dashboard.circleMap.badge')}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {t('dashboard.circleMap.title')}
                </h2>
                <p className="text-sm text-slate-500 max-w-md">{t(`dashboard.circleMap.subtitle.${mode}`)}</p>
                {mode === 'relationships' && (
                  <p className="text-xs text-violet-700/90 font-medium max-w-md">
                    {t('dashboard.circleMap.relationshipsHint')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-2xl bg-white/80 border border-slate-100 text-slate-500 hover:text-slate-800 hover:bg-white transition-colors shrink-0"
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
            </div>

            <CircleMapModeTabs mode={mode} onChange={setMode} t={t} />

            {showMembersList ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 font-medium">
                  {t('dashboard.circleMap.membersCount', { count: membersList.length })}
                </p>
                <ul className="space-y-2 max-h-[min(55dvh,480px)] overflow-y-auto overscroll-contain pr-0.5">
                  {membersList.map((node) => {
                    const canMessage = messagingEnabled && node.canMessage && !!onMessageMember;
                    return (
                      <li
                        key={node.id}
                        className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm"
                      >
                        <div className="relative shrink-0">
                          {node.photoUrl ? (
                            <img
                              src={node.photoUrl}
                              alt=""
                              className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div
                              className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-black text-white shadow-sm"
                              style={{ backgroundColor: node.color }}
                            >
                              {node.initials}
                            </div>
                          )}
                          {node.isOnline ? (
                            <span
                              className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"
                              title={t('dashboard.circleMap.online')}
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 truncate">{node.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {node.roleDisplay}
                            {node.relationshipDisplay ? ` · ${node.relationshipDisplay}` : ''}
                          </p>
                        </div>
                        {canMessage ? (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onMessageMember?.(node.recipientKey);
                            }}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors"
                          >
                            <MessageSquare size={14} />
                            {t('dashboard.circleMap.message')}
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                {membersList.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    {t('dashboard.circleMap.membersEmpty')}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <div className="rounded-[28px] border border-slate-100 bg-white p-3 sm:p-4 shadow-sm">
                  <CircleMapVisual
                    model={model}
                    mode={mode}
                    selectedId={selected?.id ?? null}
                    onSelectNode={setSelected}
                    t={t}
                    className="aspect-square max-h-[min(62vh,520px)] mx-auto"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {[...model.rings].sort((a, b) => a.index - b.index).map((ring) => (
                    <span
                      key={ring.key}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-slate-100 text-xs font-bold text-slate-600"
                    >
                      <span
                        className={cn('w-2.5 h-2.5 rounded-full', ring.dashed && 'border border-dashed border-current bg-transparent')}
                        style={ring.dashed ? { borderColor: ring.color, color: ring.color } : { backgroundColor: ring.color }}
                      />
                      {ring.label}
                    </span>
                  ))}
                </div>

                {selected && messagingEnabled && selected.canMessage && onMessageMember ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onMessageMember(selected.recipientKey);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-violet-50 border border-violet-200 text-violet-700 font-bold hover:bg-violet-100 transition-colors w-full sm:w-auto"
                  >
                    <MessageSquare size={16} />
                    {t('dashboard.circleMap.messagePerson', { name: selected.name })}
                  </button>
                ) : null}
              </>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              {onManageContacts && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onManageContacts();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                  <Users size={16} />
                  {t('dashboard.circleMap.manageContacts')}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

type DashboardCircleMapTileProps = {
  preferences: Parameters<typeof buildCircleMapModel>[0]['preferences'];
  messages?: unknown[];
  galleryPhotos?: CircleMapGalleryPhoto[];
  onlineNow?: CircleMapOnlineMember[];
  photosByEmail?: Record<string, string>;
  photosByContactId?: Record<string, string>;
  patientPhotoUrl?: string;
  preview?: boolean;
  /** Full-row layout: title left, larger map right. */
  wide?: boolean;
  onOpen: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
  titleClassName?: string;
  bodyClassName?: string;
};

export function DashboardCircleMapTile({
  preferences,
  messages,
  galleryPhotos,
  onlineNow,
  photosByEmail,
  photosByContactId,
  patientPhotoUrl,
  preview = false,
  wide = false,
  onOpen,
  t,
  titleClassName,
  bodyClassName,
}: DashboardCircleMapTileProps) {
  const model = useMemo(() => {
    if (preview) return buildCircleMapPreviewModel(t);
    return buildCircleMapModel({
      preferences,
      messages,
      galleryPhotos,
      onlineNow,
      photosByEmail,
      photosByContactId,
      patientPhotoUrl,
      mode: 'roles',
      t,
    });
  }, [galleryPhotos, messages, onlineNow, patientPhotoUrl, photosByContactId, photosByEmail, preferences, preview, t]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'text-left w-full h-full flex bg-white rounded-[28px] border border-violet-100 shadow-sm hover:shadow-lg hover:border-violet-200 transition-all group overflow-hidden relative',
        wide ? 'flex-row items-stretch pl-4 sm:pl-5 py-3 sm:py-4 pr-1 sm:pr-2 gap-2 sm:gap-3' : 'flex-col p-4 sm:p-5',
      )}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.06),transparent_55%)]" />
      <div
        className={cn(
          'relative flex min-w-0',
          wide
            ? 'w-[30%] sm:w-[28%] flex-col justify-between shrink-0 py-1'
            : 'items-center gap-3 mb-2',
        )}
      >
        <div className={cn('flex min-w-0', wide ? 'flex-col gap-3' : 'items-center gap-3')}>
          <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors shrink-0">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0">
            <p className={cn('font-bold text-slate-800 text-sm sm:text-base leading-snug', titleClassName)}>
              {t('dashboard.circleMap.tileTitle')}
            </p>
            {wide ? null : (
              <p className={cn('text-xs text-slate-500', bodyClassName)}>
                {t('dashboard.circleMap.membersCount', { count: model.nodes.length })}
              </p>
            )}
          </div>
        </div>
        {wide ? (
          <div className="relative flex-1 flex flex-col justify-center min-h-0 py-1">
            <p className="font-bold tracking-tight leading-none text-3xl sm:text-[2rem] text-slate-900">
              {model.nodes.length}
            </p>
            <p className="mt-1.5 text-[13px] text-slate-600 leading-snug">
              {t('dashboard.circleMap.membersCount', { count: model.nodes.length })}
            </p>
          </div>
        ) : null}
        {wide ? (
          <p
            className={cn(
              'relative text-[11px] font-bold uppercase tracking-wider text-violet-600',
              bodyClassName,
            )}
          >
            {t('dashboard.circleMap.tileCta')}
          </p>
        ) : null}
      </div>
      <div
        className={cn(
          'relative min-h-0 min-w-0',
          wide ? 'flex-1' : 'flex-1 -mx-2',
        )}
      >
        <CircleMapVisual
          model={model}
          mode="roles"
          compact
          emphasized={wide}
          t={t}
          className="h-full"
        />
      </div>
      {wide ? null : (
        <p
          className={cn(
            'relative text-[11px] font-bold uppercase tracking-wider text-violet-600 mt-2',
            bodyClassName,
          )}
        >
          {t('dashboard.circleMap.tileCta')}
        </p>
      )}
    </button>
  );
}

export {
  DashboardCircleMapModal as CircleDashboardCircleMapModal,
  DashboardCircleMapTile as CircleDashboardCircleMapTile,
};
