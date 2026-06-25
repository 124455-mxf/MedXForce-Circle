/** @license SPDX-License-Identifier: Apache-2.0 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Users, X } from 'lucide-react';
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-[36px] border border-violet-100 bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative p-6 sm:p-8 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-[11px] font-black uppercase tracking-wider">
                  <Sparkles size={12} />
                  {t('dashboard.circleMap.badge')}
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
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
                className="p-2.5 rounded-2xl bg-white/80 border border-slate-100 text-slate-500 hover:text-slate-800 hover:bg-white transition-colors"
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
            </div>

            <CircleMapModeTabs mode={mode} onChange={setMode} t={t} />

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

            <div className="flex flex-wrap gap-3 pt-1">
              {onManageContacts && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onManageContacts();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200"
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
      className="text-left p-4 sm:p-5 w-full h-full flex flex-col bg-white rounded-[28px] border border-violet-100 shadow-sm hover:shadow-lg hover:border-violet-200 transition-all group overflow-hidden relative"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.06),transparent_55%)]" />
      <div className="relative flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
          <Sparkles size={20} />
        </div>
        <div className="min-w-0">
          <p className={cn('font-bold text-slate-800', titleClassName)}>{t('dashboard.circleMap.tileTitle')}</p>
          <p className={cn('text-xs text-slate-500', bodyClassName)}>
            {t('dashboard.circleMap.tileSubtitle', {
              count: model.nodes.length,
              name: model.patientName,
            })}
          </p>
        </div>
      </div>
      <div className="relative flex-1 min-h-0 -mx-2">
        <CircleMapVisual model={model} mode="roles" compact t={t} className="h-full" />
      </div>
      <p className={cn('relative text-[11px] font-bold uppercase tracking-wider text-violet-600 mt-2', bodyClassName)}>
        {t('dashboard.circleMap.tileCta')}
      </p>
    </button>
  );
}

export {
  DashboardCircleMapModal as CircleDashboardCircleMapModal,
  DashboardCircleMapTile as CircleDashboardCircleMapTile,
};
