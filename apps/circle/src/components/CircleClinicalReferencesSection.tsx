/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { ExternalLink, FileText, Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  activeClinicalReferences,
  CLINICAL_REFERENCE_CATEGORIES,
  CLINICAL_REFERENCE_MAX_FILE_BYTES,
  clinicalReferenceHasFile,
  clinicalReferenceHasOpenableUrl,
  isAllowedClinicalReferenceUploadMime,
  isValidClinicalReferenceUrl,
  normalizeMemberRole,
  type CircleMemberRole,
  type ClinicalReference,
  type ClinicalReferenceCategory,
  type ClinicalReferenceInput,
} from '@medxforce/shared';
import {
  archiveClinicalReference,
  createClinicalReference,
  updateClinicalReference,
} from '../services/clinicalReferenceService';
import { uploadClinicalReferenceDocument } from '../services/clinicalReferenceUploadApi';
import { useClinicalReferences } from '../hooks/useClinicalReferences';
import { useCircleT } from '../lib/circleI18nContext';
import { cn } from '../lib/utils';
import { CirclePatientAiSummaryPanel } from './CirclePatientAiSummaryPanel';

function clinicalReferenceErrorMessage(
  err: unknown,
  t: (path: string, params?: Record<string, unknown>) => string,
): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/permission/i.test(message)) {
    return t('clinicalReferences.errors.permissions');
  }
  return message || t('clinicalReferences.errors.saveFailed');
}

type ClinicalReferenceFormModalProps = {
  open: boolean;
  title: string;
  initial?: ClinicalReferenceInput;
  allowFileUpload?: boolean;
  onClose: () => void;
  onSave: (
    input: ClinicalReferenceInput,
    file?: File | null,
    onProgress?: (percent: number) => void,
  ) => Promise<void>;
};

function ClinicalReferenceFormModal({
  open,
  title,
  initial,
  allowFileUpload = true,
  onClose,
  onSave,
}: ClinicalReferenceFormModalProps) {
  const t = useCircleT();
  const [form, setForm] = useState<ClinicalReferenceInput>(
    initial ?? { title: '', category: 'portal_link', url: '', note: '', referenceDate: '' },
  );
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    if (!form.title.trim()) {
      setError(t('clinicalReferences.errors.titleRequired'));
      return;
    }
    const url = form.url?.trim() ?? '';
    if (!file && !isValidClinicalReferenceUrl(url)) {
      setError(
        url
          ? t('clinicalReferences.errors.invalidUrl')
          : t('clinicalReferences.errors.urlOrFileRequired'),
      );
      return;
    }
    if (file) {
      if (!isAllowedClinicalReferenceUploadMime(file.type)) {
        setError(t('clinicalReferences.errors.invalidFileType'));
        return;
      }
      if (file.size > CLINICAL_REFERENCE_MAX_FILE_BYTES) {
        setError(t('clinicalReferences.errors.fileTooLarge'));
        return;
      }
    }
    if (url && !isValidClinicalReferenceUrl(url)) {
      setError(t('clinicalReferences.errors.invalidUrl'));
      return;
    }
    setSaving(true);
    setUploadPercent(file ? 0 : 100);
    try {
      await onSave(
        {
          title: form.title.trim(),
          category: form.category,
          url: url || undefined,
          note: form.note?.trim() || undefined,
          referenceDate: form.referenceDate?.trim() || undefined,
        },
        file,
        (percent) => setUploadPercent(percent),
      );
      setUploadPercent(100);
      onClose();
    } catch (err) {
      setError(clinicalReferenceErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[260] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-label={t('common.close')}
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 p-5 space-y-4">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('clinicalReferences.fields.title')}
            </span>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              maxLength={200}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('clinicalReferences.fields.category')}
            </span>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, category: e.target.value as ClinicalReferenceCategory }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {CLINICAL_REFERENCE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t(`clinicalReferences.categories.${category}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('clinicalReferences.fields.url')}
            </span>
            <input
              value={form.url ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="https://"
              inputMode="url"
            />
            {allowFileUpload ? (
              <p className="text-[11px] text-slate-400">{t('clinicalReferences.urlOptionalWithFile')}</p>
            ) : null}
          </label>
          {allowFileUpload ? (
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('clinicalReferences.fields.file')}
              </span>
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp,text/plain"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-blue-700"
              />
              <p className="text-[11px] text-slate-400">{t('clinicalReferences.fileHint')}</p>
              {file ? <p className="text-xs font-semibold text-blue-700 truncate">{file.name}</p> : null}
            </label>
          ) : null}
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('clinicalReferences.fields.referenceDate')}
            </span>
            <input
              type="date"
              value={form.referenceDate ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, referenceDate: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('clinicalReferences.fields.note')}
            </span>
            <textarea
              value={form.note ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[4.5rem]"
              maxLength={2000}
            />
          </label>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {saving ? (
          <div className="space-y-2">
            <p className="text-xs font-bold text-blue-700">
              {file
                ? t('clinicalReferences.uploadingProgress', { percent: uploadPercent })
                : t('remoteSettings.saving')}
            </p>
            <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-[width] duration-300 ease-out"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving
              ? file
                ? t('clinicalReferences.uploadingProgress', { percent: uploadPercent })
                : t('remoteSettings.saving')
              : t('admin.profile.saveWord')}
          </button>
        </div>
      </div>
    </div>
  );
}

type CircleClinicalReferencesSectionProps = {
  db: Firestore;
  patientId: string;
  user: User;
  memberRole: CircleMemberRole | string;
  memberDisplayName: string;
  className?: string;
};

export function CircleClinicalReferencesSection({
  db,
  patientId,
  user,
  memberRole,
  memberDisplayName,
  className,
}: CircleClinicalReferencesSectionProps) {
  const t = useCircleT();
  const { references, loading, error } = useClinicalReferences(db, patientId);
  const activeRefs = useMemo(() => activeClinicalReferences(references), [references]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicalReference | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (ref: ClinicalReference) => {
    setEditing(ref);
    setFormOpen(true);
  };

  const handleSave = async (
    input: ClinicalReferenceInput,
    file?: File | null,
    onProgress?: (percent: number) => void,
  ) => {
    const role = normalizeMemberRole(memberRole);
    if (editing) {
      await updateClinicalReference(db, patientId, editing.id, {
        ...input,
        url: input.url || editing.url,
      });
      return;
    }
    if (file) {
      await uploadClinicalReferenceDocument({
        patientId,
        title: input.title,
        category: input.category,
        note: input.note,
        referenceDate: input.referenceDate,
        file,
        addedByName: memberDisplayName,
        addedByRole: role,
        onProgress,
      });
      return;
    }
    await createClinicalReference(db, patientId, input, {
      uid: user.uid,
      name: memberDisplayName,
      role,
      app: 'circle',
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-800">{t('clinicalReferences.sectionTitle')}</p>
          <p className="text-sm text-slate-600 mt-1">{t('clinicalReferences.sectionHint')}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shrink-0"
        >
          <Plus size={14} />
          {t('clinicalReferences.add')}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">{t('common.loading')}</p>
      ) : error ? (
        <p className="text-sm text-rose-600">{clinicalReferenceErrorMessage(error, t)}</p>
      ) : activeRefs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
          <Link2 size={24} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">{t('clinicalReferences.emptyTitle')}</p>
          <p className="text-sm text-slate-500 mt-1">{t('clinicalReferences.emptyHint')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {activeRefs.map((ref) => (
            <li
              key={ref.id}
              className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{ref.title}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mt-0.5">
                    {t(`clinicalReferences.categories.${ref.category}`)}
                    {ref.referenceDate ? ` · ${ref.referenceDate}` : ''}
                  </p>
                  {clinicalReferenceHasFile(ref) ? (
                    <p className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1">
                      <FileText size={12} />
                      {ref.fileName || t('clinicalReferences.uploadedFile')}
                    </p>
                  ) : null}
                  {ref.note ? <p className="text-sm text-slate-600 mt-1">{ref.note}</p> : null}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {clinicalReferenceHasOpenableUrl(ref) ? (
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                      aria-label={t('clinicalReferences.openLink')}
                    >
                      <ExternalLink size={16} />
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openEdit(ref)}
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-50"
                    aria-label={t('common.edit')}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void archiveClinicalReference(db, patientId, ref.id)}
                    className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={t('clinicalReferences.archive')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CirclePatientAiSummaryPanel patientId={patientId} />

      <ClinicalReferenceFormModal
        open={formOpen}
        title={editing ? t('clinicalReferences.editTitle') : t('clinicalReferences.addTitle')}
        allowFileUpload={!editing}
        initial={
          editing
            ? {
                title: editing.title,
                category: editing.category,
                url: clinicalReferenceHasFile(editing) ? '' : editing.url,
                note: editing.note,
                referenceDate: editing.referenceDate,
              }
            : undefined
        }
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
