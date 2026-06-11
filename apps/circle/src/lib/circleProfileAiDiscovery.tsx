import { Sparkles } from 'lucide-react';
import type { CirclePatientProfileSnapshot } from '@medxforce/shared';

/** Whether a profile field (or any of its list values) was added by MedIsOn Companion. */
export function isAiDiscoveredField(
  snapshot: CirclePatientProfileSnapshot,
  key: string,
  values?: string[],
): boolean {
  const normalized = (values || []).map((value) => String(value).trim()).filter(Boolean);
  if (!normalized.length) return false;

  const fields = snapshot.metadata?.discoveredFields || [];
  if (fields.includes(key)) return true;

  const discovered = snapshot.metadata?.discoveredItems?.[key] || [];
  return normalized.some((value) => discovered.includes(value));
}

/** List values in a field that MedIsOn specifically discovered. */
export function aiDiscoveredItemsInList(
  snapshot: CirclePatientProfileSnapshot,
  key: string,
  values: string[],
): string[] {
  const fields = snapshot.metadata?.discoveredFields || [];
  if (fields.includes(key)) return values;
  const discovered = new Set(snapshot.metadata?.discoveredItems?.[key] || []);
  return values.filter((value) => discovered.has(value));
}

export function CircleProfileAiBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[8px] font-black uppercase tracking-wider shrink-0">
      <Sparkles size={8} />
      MedIsOn
    </span>
  );
}

export function CircleProfileFieldLabel({
  label,
  snapshot,
  discoveryKey,
  values,
  className = 'text-xs font-bold text-slate-500 uppercase',
}: {
  label: string;
  snapshot: CirclePatientProfileSnapshot;
  discoveryKey?: string;
  values?: string[];
  className?: string;
}) {
  const showBadge = discoveryKey ? isAiDiscoveredField(snapshot, discoveryKey, values) : false;
  const aiItems = discoveryKey ? aiDiscoveredItemsInList(snapshot, discoveryKey, values || []) : [];
  const wholeFieldAi =
    !!discoveryKey && (snapshot.metadata?.discoveredFields || []).includes(discoveryKey);

  return (
    <div className="space-y-1">
      <span className="inline-flex items-center gap-2 flex-wrap">
        <span className={className}>{label}</span>
        {showBadge && <CircleProfileAiBadge />}
      </span>
      {aiItems.length > 0 && !wholeFieldAi && (
        <p className="text-[10px] text-blue-600 leading-relaxed">
          MedIsOn added: {aiItems.join(', ')}
        </p>
      )}
    </div>
  );
}
