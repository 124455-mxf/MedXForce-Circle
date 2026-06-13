/** @license SPDX-License-Identifier: Apache-2.0 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Mic,
  Shield,
  Square,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import {
  canParticipateInCircleOpenThread,
  canViewCareCoordinationCaptures,
  downloadVisitCaptureHtml,
  downloadVisitCaptureWord,
  visitCapturePreviewAnalysis,
  visitCapturePublishThreadKind,
  type VisitCaptureCapturedBy,
  type VisitCaptureSession,
} from '@medxforce/shared';
import { cn } from '../lib/utils';
import { useCircleI18nContext } from '../lib/circleI18nContext';
import {
  clearLocalVisitSegments,
  listLocalVisitSegments,
  saveLocalVisitSegment,
} from '../services/visitCaptureLocalStore';
import {
  createVisitCaptureSession,
  discardVisitCaptureSession,
  finishVisitCaptureSession,
  isVisitCaptureApiConfigured,
  publishVisitCaptureSession,
  uploadVisitCaptureSegment,
} from '../services/visitCaptureApi';

type VisitCaptureStep =
  | 'consent'
  | 'recording'
  | 'processing'
  | 'preview'
  | 'done'
  | 'failed';

export type VisitCaptureFlowProps = {
  open: boolean;
  onClose: () => void;
  onPublished?: () => void;
  patientId: string;
  capturedBy: VisitCaptureCapturedBy;
};

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VisitCaptureFlow({
  open,
  onClose,
  onPublished,
  patientId,
  capturedBy,
}: VisitCaptureFlowProps) {
  const apiConfigured = isVisitCaptureApiConfigured();
  const { language: recorderLanguage, t } = useCircleI18nContext();
  const [step, setStep] = useState<VisitCaptureStep>('consent');
  const [roomInformed, setRoomInformed] = useState(false);
  const [session, setSession] = useState<VisitCaptureSession | null>(null);
  const [segmentCount, setSegmentCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const segmentStartRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const resetState = useCallback(() => {
    setStep('consent');
    setRoomInformed(false);
    setSession(null);
    setSegmentCount(0);
    setIsRecording(false);
    setElapsedMs(0);
    setError(null);
    setBusy(false);
    chunksRef.current = [];
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  const stopTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startTimer = () => {
    segmentStartRef.current = Date.now();
    stopTimer();
    timerRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - segmentStartRef.current);
    }, 250);
  };

  const handleBegin = async () => {
    if (!roomInformed || !apiConfigured) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createVisitCaptureSession({
        patientId,
        capturedBy,
        consent: { at: Date.now(), roomInformed: true },
      });
      setSession(created);
      setStep('recording');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('visitCapture.errorStartFailed'));
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    if (!session || isRecording) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setElapsedMs(0);
      startTimer();
    } catch {
      setError(t('visitCapture.errorMicRequired'));
    }
  };

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !session || !isRecording) return;

    setBusy(true);
    stopTimer();

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);

    const durationMs = Date.now() - segmentStartRef.current;
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    chunksRef.current = [];

    if (blob.size === 0) {
      setBusy(false);
      setError(t('visitCapture.errorNoAudio'));
      return;
    }

    try {
      const localId = `local_${Date.now()}`;
      await saveLocalVisitSegment({
        id: localId,
        sessionId: session.id,
        segmentIndex: segmentCount,
        blob,
        durationMs,
        createdAt: Date.now(),
      });
      setSegmentCount((c) => c + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('visitCapture.errorSaveLocalFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleFinish = async () => {
    if (!session || segmentCount < 1 || isRecording) return;
    setStep('processing');
    setBusy(true);
    setError(null);
    try {
      const localSegments = await listLocalVisitSegments(session.id);
      for (const seg of localSegments) {
        await uploadVisitCaptureSegment({
          patientId,
          sessionId: session.id,
          segmentIndex: seg.segmentIndex,
          blob: seg.blob,
          durationMs: seg.durationMs,
        });
      }
      const updated = await finishVisitCaptureSession({
        patientId,
        sessionId: session.id,
        previewLanguage: recorderLanguage,
      });
      setSession(updated);
      setStep(updated.status === 'failed' ? 'failed' : 'preview');
      if (updated.status === 'failed') {
        setError(updated.errorMessage ?? t('visitCapture.errorProcessingFailed'));
      }
    } catch (err) {
      setStep('failed');
      setError(err instanceof Error ? err.message : t('visitCapture.errorProcessingFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await publishVisitCaptureSession({ patientId, sessionId: session.id });
      await clearLocalVisitSegments(session.id);
      onPublished?.();
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('visitCapture.errorShareFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleDiscard = async () => {
    if (!session) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      await discardVisitCaptureSession({ patientId, sessionId: session.id });
      await clearLocalVisitSegments(session.id);
    } catch {
      /* best effort */
    } finally {
      setBusy(false);
      onClose();
    }
  };

  const publishThreadKind = visitCapturePublishThreadKind(capturedBy.role);
  const recorderSeesThread =
    publishThreadKind === 'open'
      ? canParticipateInCircleOpenThread(capturedBy.role)
      : canViewCareCoordinationCaptures(capturedBy.role);
  const publishShareLabel =
    publishThreadKind === 'open'
      ? t('visitCapture.shareWithCircle')
      : t('visitCapture.shareWithCareTeam');

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6 bg-slate-900/55 backdrop-blur-sm">
      <div
        className="bg-white w-full max-w-lg rounded-[28px] shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <span className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Stethoscope size={22} />
                </span>
                <button
                  type="button"
                  onClick={() => void handleDiscard()}
                  disabled={busy && step === 'processing'}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                  aria-label={t('common.close')}
                >
                  <X size={20} />
                </button>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">{t('visitCapture.title')}</h2>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  {t('visitCapture.subtitle')}
                </p>
              </div>

              {!apiConfigured && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  {t('visitCapture.apiNotConfigured')}
                </p>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              {step === 'consent' && (
                <div className="space-y-4">
                  <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roomInformed}
                      onChange={(e) => setRoomInformed(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm text-slate-700 leading-relaxed">
                      {t('visitCapture.consentLabel')}
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={!roomInformed || busy || !apiConfigured}
                    onClick={() => void handleBegin()}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                    {t('visitCapture.startCapture')}
                  </button>
                </div>
              )}

              {step === 'recording' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {t('visitCapture.segmentsLabel')}
                      </p>
                      <p className="text-lg font-bold text-slate-800">
                        {t('visitCapture.segmentsSaved', { count: segmentCount })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {isRecording
                          ? t('visitCapture.statusRecording')
                          : t('visitCapture.statusReady')}
                      </p>
                      <p
                        className={cn(
                          'text-lg font-bold tabular-nums',
                          isRecording ? 'text-red-600' : 'text-slate-800',
                        )}
                      >
                        {formatElapsed(elapsedMs)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={() => void startRecording()}
                        disabled={busy}
                        className="flex-1 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2"
                      >
                        <Mic size={18} />
                        {segmentCount === 0
                          ? t('visitCapture.startRecording')
                          : t('visitCapture.addSegment')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void stopRecording()}
                        disabled={busy}
                        className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold flex items-center justify-center gap-2"
                      >
                        <Square size={16} fill="currentColor" />
                        {t('visitCapture.stopSegment')}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleFinish()}
                    disabled={segmentCount < 1 || isRecording || busy}
                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50"
                  >
                    {t('visitCapture.finishAnalyze')}
                  </button>
                </div>
              )}

              {step === 'processing' && (
                <div className="py-8 flex flex-col items-center gap-3 text-slate-600">
                  <Loader2 size={32} className="animate-spin text-blue-600" />
                  <p className="font-medium">{t('visitCapture.processingTitle')}</p>
                  <p className="text-xs text-slate-400">{t('visitCapture.processingHint')}</p>
                </div>
              )}

              {step === 'preview' && session?.analysis && (() => {
                const previewAnalysis = visitCapturePreviewAnalysis(session);
                if (!previewAnalysis) return null;
                return (
                <div className="space-y-4">
                  {session.localizedPreview ? (
                    <div className="space-y-1 pb-1 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-800">
                        {session.localizedPreview.headingLine1}
                      </p>
                      <p className="text-xs text-slate-500">{session.localizedPreview.headingLine2}</p>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                      {t('visitCapture.summaryHeading')}
                    </h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{previewAnalysis.summary}</p>
                  </div>

                  {previewAnalysis.actionItems.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                        {t('visitCapture.actionItemsHeading')}
                      </h3>
                      <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
                        {previewAnalysis.actionItems.map((item, i) => (
                          <li key={i}>{item.text}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {previewAnalysis.followUpQuestions.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                        {t('visitCapture.followUpHeading')}
                      </h3>
                      <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
                        {previewAnalysis.followUpQuestions.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {session.transcript && (
                    <details className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <summary className="text-sm font-bold text-slate-600 cursor-pointer">
                        {t('visitCapture.transcriptHeading')}
                      </summary>
                      <p className="text-xs text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                        {session.transcript}
                      </p>
                    </details>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => downloadVisitCaptureWord(session)}
                      className="flex-1 min-w-[9rem] py-2.5 px-3 rounded-2xl bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 hover:bg-slate-100 disabled:opacity-50 flex items-center justify-center"
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <FileText size={16} className="shrink-0" aria-hidden />
                        {t('visitCapture.downloadWord')}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => downloadVisitCaptureHtml(session)}
                      className="flex-1 min-w-[9rem] py-2.5 px-3 rounded-2xl bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 hover:bg-slate-100 disabled:opacity-50 flex items-center justify-center"
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <Download size={16} className="shrink-0" aria-hidden />
                        {t('visitCapture.downloadHtml')}
                      </span>
                    </button>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => void handleDiscard()}
                      disabled={busy}
                      className="flex-1 min-w-0 py-3 px-3 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center"
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <Trash2 size={16} className="shrink-0" aria-hidden />
                        {t('visitCapture.delete')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handlePublish()}
                      disabled={busy}
                      className="flex-1 min-w-0 py-3 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 flex items-center justify-center"
                    >
                      <span className="inline-flex items-center justify-center gap-2 text-center">
                        {busy ? (
                          <Loader2 size={16} className="animate-spin shrink-0" aria-hidden />
                        ) : (
                          <CheckCircle2 size={16} className="shrink-0" aria-hidden />
                        )}
                        <span className="text-sm leading-snug">{publishShareLabel}</span>
                      </span>
                    </button>
                  </div>
                </div>
                );
              })()}

              {step === 'done' && (
                <div className="space-y-4 py-4 text-center">
                  <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
                  <p className="font-bold text-slate-800">{t('visitCapture.doneTitle')}</p>
                  {!recorderSeesThread && (
                    <p className="text-sm text-slate-500">
                      {t('visitCapture.doneHiddenHint')}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    {t('visitCapture.doneButton')}
                  </button>
                </div>
              )}

              {step === 'failed' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">{t('visitCapture.failedBody')}</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => void handleDiscard()}
                      className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold"
                    >
                      {t('visitCapture.delete')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleFinish()}
                      className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold"
                    >
                      {t('visitCapture.retry')}
                    </button>
                  </div>
                </div>
              )}
            </div>
      </div>
    </div>,
    document.body,
  );
}
