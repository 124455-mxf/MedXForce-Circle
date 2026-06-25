/** @license SPDX-License-Identifier: Apache-2.0 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ContactCircleAvatar } from './ContactCircleAvatar';
import {
  polarToCartesian,
  computeCircleMapRingRadii,
  type CircleMapModel,
  type CircleMapNode,
  type CircleMapViewMode,
} from '../lib/circleMapModel';

type CircleMapVisualProps = {
  model: CircleMapModel;
  mode: CircleMapViewMode;
  compact?: boolean;
  className?: string;
  selectedId?: string | null;
  onSelectNode?: (node: CircleMapNode | null) => void;
  t: (key: string, params?: Record<string, unknown>) => string;
};

const CX = 200;
const CY = 200;

function nodeSize(node: CircleMapNode, mode: CircleMapViewMode, compact: boolean): number {
  if (compact) return 9;
  if (mode === 'engagement') return 11 + (node.engagement.score / 100) * 12;
  return 13;
}

export function CircleMapVisual({
  model,
  mode,
  compact = false,
  className,
  selectedId,
  onSelectNode,
  t,
}: CircleMapVisualProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const activeId = selectedId ?? hoverId;

  const sortedRings = useMemo(
    () => [...model.rings].sort((a, b) => a.index - b.index),
    [model.rings],
  );

  const ringRadii = useMemo(() => {
    if (mode === 'engagement') {
      const { start, step } = computeCircleMapRingRadii(4);
      return [start, start + step, start + step * 2, start + step * 3];
    }
    return sortedRings.map((ring, index) => ring.radius ?? 58 + index * 36);
  }, [mode, sortedRings]);

  const activeNode = model.nodes.find((node) => node.id === selectedId) ?? null;

  const hoverTooltip = useMemo(() => {
    const node = model.nodes.find((n) => n.id === hoverId);
    if (!node || compact) return null;
    const size = nodeSize(node, mode, compact);
    const { x, y } = polarToCartesian(CX, CY, node.radius, node.angle);
    const angleRad = (node.angle * Math.PI) / 180;
    const offset = size + 22;
    return {
      name: node.name,
      left: ((x + Math.cos(angleRad) * offset) / 400) * 100,
      top: ((y + Math.sin(angleRad) * offset) / 400) * 100,
    };
  }, [compact, hoverId, mode, model.nodes]);

  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full overflow-visible"
        role="img"
        aria-label={t('dashboard.circleMap.ariaMap')}
      >
        <defs>
          <filter id="circleMapSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="400" height="400" fill="#ffffff" rx="32" />

        {ringRadii.map((radius, index) => {
          const ring = sortedRings[index];
          return (
            <motion.circle
              key={`ring-${ring?.key ?? radius}-${mode}`}
              cx={CX}
              cy={CY}
              r={radius}
              fill="none"
              stroke={ring?.color ?? '#e2e8f0'}
              strokeOpacity={0.4}
              strokeWidth={ring?.dashed ? 1.5 : 2}
              strokeDasharray={ring?.dashed ? '6 8' : undefined}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{
                opacity: 1,
                scale: 1,
                rotate: mode === 'roles' ? (index % 2 === 0 ? 360 : -360) : 0,
              }}
              transition={{
                opacity: { duration: 0.5 },
                scale: { duration: 0.5 },
                rotate:
                  mode === 'roles'
                    ? { duration: 120 + index * 20, repeat: Infinity, ease: 'linear' }
                    : { duration: 0.3 },
              }}
              style={{ transformOrigin: `${CX}px ${CY}px` }}
            />
          );
        })}

        {!compact &&
          mode === 'relationships' &&
          sortedRings.map((ring, index) => {
            const radius = ringRadii[index] ?? 58 + index * 36;
            const label =
              ring.label.length > 16 ? `${ring.label.slice(0, 15)}…` : ring.label;
            return (
              <text
                key={`ring-label-${ring.key}`}
                x={CX}
                y={CY - radius - 6}
                textAnchor="middle"
                className="fill-slate-500 text-[9px] font-medium pointer-events-none"
              >
                {label}
              </text>
            );
          })}

        <AnimatePresence mode="popLayout">
          {model.nodes.map((node) => {
            const { x, y } = polarToCartesian(CX, CY, node.radius, node.angle);
            const size = nodeSize(node, mode, compact);
            const isActive = activeId === node.id;
            return (
              <motion.g
                key={`${node.id}-${mode}`}
                layout
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1, x, y }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                onMouseEnter={() => setHoverId(node.id)}
                onMouseLeave={() => setHoverId((prev) => (prev === node.id ? null : prev))}
                onClick={() => onSelectNode?.(isActive ? null : node)}
                className={onSelectNode ? 'cursor-pointer' : undefined}
              >
                <circle
                  cx={0}
                  cy={0}
                  r={size + 6}
                  fill={node.color}
                  opacity={isActive ? 0.22 : 0.1}
                  filter="url(#circleMapSoftGlow)"
                />
                <circle
                  cx={0}
                  cy={0}
                  r={size}
                  fill={node.photoUrl ? '#ffffff' : isActive ? node.color : '#ffffff'}
                  stroke={node.color}
                  strokeWidth={isActive ? 3 : 2}
                  strokeDasharray={node.isMessagingOnly ? '3 2' : undefined}
                />
                {node.photoUrl ? (
                  <>
                    <defs>
                      <clipPath id={`circle-map-clip-${node.id}`}>
                        <circle cx={0} cy={0} r={size - 1} />
                      </clipPath>
                    </defs>
                    <image
                      href={node.photoUrl}
                      x={-(size - 1)}
                      y={-(size - 1)}
                      width={(size - 1) * 2}
                      height={(size - 1) * 2}
                      clipPath={`url(#circle-map-clip-${node.id})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </>
                ) : (
                  <text
                    x={0}
                    y={1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[9px] font-black pointer-events-none"
                    fill={isActive ? '#ffffff' : node.color}
                  >
                    {node.initials}
                  </text>
                )}
                {node.isOnline && (
                  <circle cx={size - 2} cy={-size + 2} r={4} fill="#10b981" stroke="#fff" strokeWidth="1.5" />
                )}
                <title>{node.name}</title>
              </motion.g>
            );
          })}
        </AnimatePresence>
      </svg>

      <AnimatePresence>
        {hoverTooltip && (
          <motion.div
            key={hoverTooltip.name}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12 }}
            className="absolute z-10 pointer-events-none -translate-x-1/2 -translate-y-1/2 max-w-[140px] px-2.5 py-1 rounded-lg bg-slate-900/90 text-white text-[11px] font-medium text-center leading-tight shadow-lg"
            style={{ left: `${hoverTooltip.left}%`, top: `${hoverTooltip.top}%` }}
          >
            {hoverTooltip.name}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
      >
        <ContactCircleAvatar
          photoUrl={model.patientPhotoUrl}
          className={cn(
            'border-2 border-violet-600 shadow-sm',
            compact ? 'w-12 h-12' : 'w-[60px] h-[60px]',
          )}
          iconSize={compact ? 16 : 22}
        />
        {!compact && (
          <p className="mt-1.5 max-w-[88px] text-center text-[11px] font-normal text-slate-600 leading-tight truncate">
            {model.patientName}
          </p>
        )}
      </div>

      {!compact && activeNode && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-3 left-3 right-3 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-100 shadow-lg px-4 py-3 pr-10"
        >
          <button
            type="button"
            onClick={() => onSelectNode?.(null)}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label={t('common.close')}
          >
            <X size={14} />
          </button>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{activeNode.name}</p>
              {mode === 'relationships' ? (
                <>
                  <p className="text-xs text-slate-700 mt-0.5 font-semibold">
                    {t('dashboard.circleMap.relationshipLabel', {
                      relationship: activeNode.relationshipDisplay,
                    })}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {t('dashboard.circleMap.roleLabel', { role: activeNode.roleDisplay })}
                  </p>
                </>
              ) : mode === 'roles' ? (
                <p className="text-xs text-slate-500 mt-0.5">{activeNode.ringLabel}</p>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5">{activeNode.roleDisplay}</p>
              )}
            </div>
            {mode === 'engagement' && (
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-violet-600">{activeNode.engagement.score}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t('dashboard.circleMap.warmthScore')}
                </p>
              </div>
            )}
          </div>
          {mode === 'engagement' && (
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="rounded-xl bg-slate-50 px-2 py-1.5">
                <p className="text-sm font-bold text-slate-800">{activeNode.engagement.messagesSent}</p>
                <p className="text-[10px] text-slate-500">{t('dashboard.circleMap.stats.messages')}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-2 py-1.5">
                <p className="text-sm font-bold text-slate-800">{activeNode.engagement.repliesReceived}</p>
                <p className="text-[10px] text-slate-500">{t('dashboard.circleMap.stats.replies')}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-2 py-1.5">
                <p className="text-sm font-bold text-slate-800">{activeNode.engagement.mediaShared}</p>
                <p className="text-[10px] text-slate-500">{t('dashboard.circleMap.stats.media')}</p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

type CircleMapModeTabsProps = {
  mode: CircleMapViewMode;
  onChange: (mode: CircleMapViewMode) => void;
  t: (key: string) => string;
  compact?: boolean;
};

export function CircleMapModeTabs({ mode, onChange, t, compact }: CircleMapModeTabsProps) {
  const tabs: { id: CircleMapViewMode; label: string }[] = [
    { id: 'roles', label: t('dashboard.circleMap.modes.roles') },
    { id: 'relationships', label: t('dashboard.circleMap.modes.relationships') },
    { id: 'engagement', label: t('dashboard.circleMap.modes.engagement') },
  ];

  return (
    <div
      className={cn(
        'inline-flex p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80',
        compact ? 'scale-90 origin-left' : 'w-full',
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all',
            mode === tab.id
              ? 'bg-white text-violet-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
