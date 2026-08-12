/** @license SPDX-License-Identifier: Apache-2.0 */
import { useEffect, useMemo, useState } from 'react';
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
  /** Larger nodes/avatar and clearer motion for full-row dashboard tiles. */
  emphasized?: boolean;
  className?: string;
  selectedId?: string | null;
  onSelectNode?: (node: CircleMapNode | null) => void;
  t: (key: string, params?: Record<string, unknown>) => string;
};

const CX = 200;
const CY = 200;

/** Radians per second — one full orbit takes about a minute. */
const ORBIT_SPEED = (Math.PI * 2) / 60;

function nodeSize(
  node: CircleMapNode,
  mode: CircleMapViewMode,
  compact: boolean,
  emphasized: boolean,
): number {
  if (compact && emphasized && node.ringKey === 'proxy') return 18;
  if (compact && emphasized) return 17;
  if (compact) return 11;
  if (mode === 'roles' && node.ringKey === 'proxy') return 16;
  if (mode === 'engagement') return 11 + (node.engagement.score / 100) * 12;
  return 14;
}

export function CircleMapVisual({
  model,
  mode,
  compact = false,
  emphasized = false,
  className,
  selectedId,
  onSelectNode,
  t,
}: CircleMapVisualProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [orbitPhase, setOrbitPhase] = useState(0);
  const activeId = selectedId ?? hoverId;
  const orbitEnabled = mode === 'roles';

  useEffect(() => {
    if (!orbitEnabled) {
      setOrbitPhase(0);
      return;
    }
    let frameId = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const deltaSec = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      setOrbitPhase((phase) => phase + deltaSec * ORBIT_SPEED);
      frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [orbitEnabled]);

  const sortedRings = useMemo(
    () => [...model.rings].sort((a, b) => a.index - b.index),
    [model.rings],
  );

  const ringRadii = useMemo(() => {
    if (mode === 'engagement') {
      const { start, step } = computeCircleMapRingRadii(4);
      return [start, start + step, start + step * 2, start + step * 3];
    }
    // Emphasized tile: push rings outward so the map fills more of the viewBox.
    if (compact && emphasized) {
      return sortedRings.map((_, index) => 78 + index * 34);
    }
    return sortedRings.map((ring, index) => ring.radius ?? 58 + index * 36);
  }, [compact, emphasized, mode, sortedRings]);

  /** Roles view: at most two proxies beside the patient (no proxy orbit ring). */
  const flankProxyNodes = useMemo(() => {
    if (mode !== 'roles') return [];
    return model.nodes.filter((node) => node.ringKey === 'proxy').slice(0, 2);
  }, [mode, model.nodes]);

  const activeNode = model.nodes.find((node) => node.id === selectedId) ?? null;

  const placedNodes = useMemo(() => {
    return model.nodes.flatMap((node) => {
      const flankProxyIndex = flankProxyNodes.findIndex((proxy) => proxy.id === node.id);
      const isFlankProxy = flankProxyIndex >= 0;
      if (mode === 'roles' && node.ringKey === 'proxy' && flankProxyIndex < 0) {
        return [];
      }

      const ringPos = sortedRings.findIndex((ring) => ring.key === node.ringKey);
      let displayRadius: number;
      let displayAngle: number;
      if (isFlankProxy) {
        displayAngle =
          flankProxyNodes.length === 1 ? 0 : flankProxyIndex === 0 ? Math.PI : 0;
        // Modal: sit closer beside the larger patient avatar; tile: a bit farther out.
        displayRadius = compact ? 72 : 58;
      } else {
        displayRadius =
          compact && emphasized && ringPos >= 0
            ? (ringRadii[ringPos] ?? node.radius)
            : node.radius;
        const direction = ringPos % 2 === 0 ? 1 : -1;
        displayAngle = orbitEnabled ? node.angle + orbitPhase * direction : node.angle;
      }

      const { x, y } = polarToCartesian(CX, CY, displayRadius, displayAngle);
      return [
        {
          node,
          x,
          y,
          size: nodeSize(node, mode, compact, emphasized),
          isActive: activeId === node.id,
        },
      ];
    });
  }, [
    activeId,
    compact,
    emphasized,
    flankProxyNodes,
    mode,
    model.nodes,
    orbitEnabled,
    orbitPhase,
    ringRadii,
    sortedRings,
  ]);

  const hoverTooltip = useMemo(() => {
    const node = model.nodes.find((n) => n.id === hoverId);
    if (!node || compact) return null;
    const placed = placedNodes.find((entry) => entry.node.id === node.id);
    if (!placed) return null;
    const offset = placed.size + 22;
    return {
      name: node.name,
      left: ((placed.x + Math.cos(node.angle) * offset) / 400) * 100,
      top: ((placed.y + Math.sin(node.angle) * offset) / 400) * 100,
    };
  }, [compact, hoverId, model.nodes, placedNodes]);

  return (
    <div className={cn('relative', className)}>
      {/*
        Map SVG is always a square (viewBox 400×400) letterboxed in a wide tile.
        Photo overlays must live in the same square stage or they drift off the nodes.
      */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative aspect-square h-full max-w-full">
      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 w-full h-full overflow-visible"
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

        <rect
          width="400"
          height="400"
          fill={compact ? 'transparent' : '#ffffff'}
          rx="32"
        />

        {ringRadii.map((radius, index) => {
          const ring = sortedRings[index];
          // Roles: no orbit ring for proxies — they sit left/right of the patient.
          if (mode === 'roles' && ring?.key === 'proxy') {
            return null;
          }
          const rotateDuration =
            compact && emphasized ? 48 + index * 12 : 120 + index * 20;
          return (
            <motion.circle
              key={`ring-${ring?.key ?? radius}-${mode}`}
              cx={CX}
              cy={CY}
              r={radius}
              fill="none"
              stroke={ring?.color ?? '#e2e8f0'}
              strokeOpacity={emphasized ? 0.55 : 0.4}
              strokeWidth={ring?.dashed ? 1.5 : emphasized ? 2.5 : 2}
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
                    ? { duration: rotateDuration, repeat: Infinity, ease: 'linear' }
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
          {placedNodes.map(({ node, x, y, size, isActive }) => {
            const hasPhoto = !!node.photoUrl?.trim();
            return (
              <motion.g
                key={`${node.id}-${mode}`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1, x, y }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  opacity: { duration: 0.25 },
                  scale: { type: 'spring', stiffness: 260, damping: 22 },
                  x: { duration: 0 },
                  y: { duration: 0 },
                }}
                onMouseEnter={() => setHoverId(node.id)}
                onMouseLeave={() => setHoverId((prev) => (prev === node.id ? null : prev))}
                onClick={() => onSelectNode?.(isActive ? null : node)}
                className={onSelectNode ? 'cursor-pointer' : undefined}
              >
                {/* Photo nodes: HTML overlays draw the avatar — skip empty SVG rings. */}
                {!hasPhoto ? (
                  <>
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
                      fill={isActive ? node.color : '#ffffff'}
                      stroke={node.color}
                      strokeWidth={isActive ? 3 : 2}
                      strokeDasharray={node.isMessagingOnly ? '3 2' : undefined}
                    />
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
                    {node.isOnline ? (
                      <circle
                        cx={size - 2}
                        cy={-size + 2}
                        r={4}
                        fill="#10b981"
                        stroke="#fff"
                        strokeWidth="1.5"
                      />
                    ) : null}
                  </>
                ) : (
                  <circle cx={0} cy={0} r={size} fill="transparent" />
                )}
                <title>{node.name}</title>
              </motion.g>
            );
          })}
        </AnimatePresence>
      </svg>

      {/* HTML photos — SVG <image> often fails on Firebase Storage URLs. */}
      {placedNodes.map(({ node, x, y, size, isActive }) => {
        const photoUrl = node.photoUrl?.trim();
        if (!photoUrl) return null;
        const diameterPct = ((size * 2) / 400) * 100;
        const style = {
          left: `${(x / 400) * 100}%`,
          top: `${(y / 400) * 100}%`,
          width: `${diameterPct}%`,
          height: `${diameterPct}%`,
          borderColor: node.color,
        } as const;
        const className = cn(
          'absolute z-[1] -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden border-[1.5px] shadow-sm bg-white p-0',
          onSelectNode ? 'cursor-pointer' : 'pointer-events-none',
        );
        const photo = (
          <>
            <img
              src={photoUrl}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              draggable={false}
            />
            {node.isOnline ? (
              <span className="absolute top-0 right-0 w-[28%] h-[28%] min-w-[6px] min-h-[6px] rounded-full bg-emerald-500 border-2 border-white" />
            ) : null}
          </>
        );
        if (!onSelectNode) {
          return (
            <div
              key={`photo-${node.id}-${mode}`}
              className={className}
              style={style}
              title={node.name}
              aria-hidden
            >
              {photo}
            </div>
          );
        }
        return (
          <button
            key={`photo-${node.id}-${mode}`}
            type="button"
            title={node.name}
            onClick={() => onSelectNode(isActive ? null : node)}
            onMouseEnter={() => setHoverId(node.id)}
            onMouseLeave={() => setHoverId((prev) => (prev === node.id ? null : prev))}
            className={className}
            style={style}
            aria-label={node.name}
          >
            {photo}
          </button>
        );
      })}

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

      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[1]"
        aria-label={model.patientName}
        animate={
          emphasized && compact
            ? { scale: [1, 1.05, 1] }
            : undefined
        }
        transition={
          emphasized && compact
            ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
            : undefined
        }
      >
        <ContactCircleAvatar
          photoUrl={model.patientPhotoUrl}
          className={cn(
            'shadow-md border-0',
            compact && emphasized
              ? 'w-12 h-12 sm:w-14 sm:h-14'
              : compact
                ? 'w-12 h-12'
                : 'w-16 h-16 sm:w-[72px] sm:h-[72px]',
          )}
          iconSize={compact ? (emphasized ? 18 : 16) : 26}
        />
      </motion.div>
        </div>
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
    { id: 'members', label: t('dashboard.circleMap.modes.members') },
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
