/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo } from 'react';
import type { Firestore } from 'firebase/firestore';
import { ExternalLink } from 'lucide-react';
import {
  activeClinicalReferences,
  resolveClinicalReferencesById,
  type ClinicalReference,
} from '@medxforce/shared';
import { useClinicalReferences } from '../hooks/useClinicalReferences';
import { useCircleT } from '../lib/circleI18nContext';
import { cn } from '../lib/utils';

type CircleCareCalendarClinicalReferencesPickerProps = {
  db: Firestore;
  patientId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void | Promise<void>;
  onManageLibrary?: () => void;
  className?: string;
};

export function CircleCareCalendarClinicalReferencesPicker({
  db,
  patientId,
  selectedIds,
  onChange,
  onManageLibrary,
  className,
}: CircleCareCalendarClinicalReferencesPickerProps) {
  const t = useCircleT();
  const { references, loading } = useClinicalReferences(db, patientId);
  const library = useMemo(() => activeClinicalReferences(references), [references]);
  const selected = useMemo(
    () => resolveClinicalReferencesById(references, selectedIds),
    [references, selectedIds],
  );

  const toggle = (ref: ClinicalReference) => {
    const next = selectedIds.includes(ref.id)
      ? selectedIds.filter((id) => id !== ref.id)
      : [...selectedIds, ref.id];
    void onChange(next);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
          {t('clinicalReferences.prepareTitle')}
        </p>
        {onManageLibrary ? (
          <button
            type="button"
            onClick={onManageLibrary}
            className="text-xs font-bold text-violet-600 hover:underline"
          >
            {t('clinicalReferences.manageLibrary')}
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">{t('common.loading')}</p>
      ) : library.length === 0 ? (
        <p className="text-sm text-slate-500">{t('clinicalReferences.prepareEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {library.map((ref) => {
            const checked = selectedIds.includes(ref.id);
            return (
              <li key={ref.id}>
                <label
                  className={cn(
                    'flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors',
                    checked
                      ? 'border-violet-300 bg-violet-50/70'
                      : 'border-slate-100 bg-white hover:bg-slate-50/80',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(ref)}
                    className="mt-1 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800">{ref.title}</span>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-violet-700 mt-0.5">
                      {t(`clinicalReferences.categories.${ref.category}`)}
                    </span>
                  </span>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-100 shrink-0"
                    aria-label={t('clinicalReferences.openLink')}
                  >
                    <ExternalLink size={14} />
                  </a>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {selected.length > 0 ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            {t('clinicalReferences.prepareSelected', { count: selected.length })}
          </p>
          <p className="text-sm text-slate-700">{selected.map((ref) => ref.title).join(' · ')}</p>
        </div>
      ) : null}
    </div>
  );
}
