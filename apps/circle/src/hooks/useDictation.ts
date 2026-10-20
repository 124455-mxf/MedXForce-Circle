import { useCallback, useEffect, useRef, useState } from 'react';
import { useCircleI18nContext } from '../lib/circleI18nContext';
import {
  appendSpeechResults,
  getSpeechRecognitionConstructor,
  isFatalSpeechRecognitionError,
  isTransientSpeechRecognitionError,
  shouldRestartDictation,
  speechLangFromPreferences,
  SPEECH_RESTART_DELAY_MS,
  stopSpeechRecognition,
} from '../lib/speechRecognitionUtils';
import { useSpeechRecognitionLifecycle } from './useSpeechRecognitionLifecycle';

const MAX_TRANSIENT_FAILURES = 3;

export function useDictation(primaryLanguage?: string) {
  const { language: circleLanguage } = useCircleI18nContext();
  const recognitionRef = useSpeechRecognitionLifecycle();
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const baseTextRef = useRef('');
  const committedRef = useRef('');
  const wantRecordingRef = useRef(false);
  const setTextRef = useRef<(value: string) => void>(() => {});
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastErrorRef = useRef<string | null>(null);
  const transientFailuresRef = useRef(0);
  const languageRef = useRef(primaryLanguage ?? circleLanguage);
  const beginRecognitionRef = useRef<() => void>(() => {});
  languageRef.current = primaryLanguage ?? circleLanguage;

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current != null) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    wantRecordingRef.current = false;
    lastErrorRef.current = null;
    transientFailuresRef.current = 0;
    clearRestartTimer();
    stopSpeechRecognition(recognitionRef);
    setIsRecording(false);
  }, [clearRestartTimer, recognitionRef]);

  const scheduleRestart = useCallback(() => {
    if (restartTimerRef.current != null) return;
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      beginRecognitionRef.current();
    }, SPEECH_RESTART_DELAY_MS);
  }, []);

  const beginRecognition = useCallback(() => {
    if (!wantRecordingRef.current) return;

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      wantRecordingRef.current = false;
      setIsRecording(false);
      setMicError('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechLangFromPreferences(languageRef.current);

    recognition.onstart = () => {
      if (!wantRecordingRef.current) {
        try {
          recognition.stop();
        } catch {
          // Already stopping.
        }
        return;
      }
      lastErrorRef.current = null;
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      transientFailuresRef.current = 0;
      lastErrorRef.current = null;
      const { nextText, committedTranscript } = appendSpeechResults(
        event,
        baseTextRef.current,
        committedRef.current,
      );
      committedRef.current = committedTranscript;
      setTextRef.current(nextText);
    };

    recognition.onerror = (event) => {
      lastErrorRef.current = event.error;
      if (isFatalSpeechRecognitionError(event.error)) {
        wantRecordingRef.current = false;
        clearRestartTimer();
        setIsRecording(false);
        setMicError(
          event.error === 'not-allowed' || event.error === 'service-not-allowed'
            ? 'Microphone access was denied. Allow the mic in your browser settings.'
            : 'Could not capture speech. Try again.',
        );
        return;
      }
      if (isTransientSpeechRecognitionError(event.error)) {
        if (event.error === 'network' || event.error === 'audio-capture') {
          transientFailuresRef.current += 1;
          if (transientFailuresRef.current >= MAX_TRANSIENT_FAILURES) {
            wantRecordingRef.current = false;
            setIsRecording(false);
            setMicError('Could not capture speech. Try again.');
          }
        }
        return;
      }
      wantRecordingRef.current = false;
      setIsRecording(false);
      setMicError('Could not capture speech. Try again.');
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      if (!shouldRestartDictation(wantRecordingRef.current, lastErrorRef.current)) {
        if (!wantRecordingRef.current) setIsRecording(false);
        return;
      }
      scheduleRestart();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      if (!wantRecordingRef.current) {
        setIsRecording(false);
        return;
      }
      scheduleRestart();
    }
  }, [clearRestartTimer, recognitionRef, scheduleRestart]);

  beginRecognitionRef.current = beginRecognition;

  const toggleRecording = useCallback(
    async (getText: () => string, setText: (value: string) => void) => {
      setMicError(null);

      if (wantRecordingRef.current) {
        stopRecording();
        return;
      }

      if (!getSpeechRecognitionConstructor()) {
        setMicError('Speech recognition is not supported in this browser.');
        return;
      }

      setTextRef.current = setText;
      baseTextRef.current = getText();
      committedRef.current = '';
      lastErrorRef.current = null;
      transientFailuresRef.current = 0;
      wantRecordingRef.current = true;
      setIsRecording(true);
      // Start in the same tap turn — do not await getUserMedia first (Safari drops the gesture).
      beginRecognition();
    },
    [beginRecognition, stopRecording],
  );

  useEffect(() => {
    return () => {
      wantRecordingRef.current = false;
      clearRestartTimer();
    };
  }, [clearRestartTimer]);

  return {
    isRecording,
    micError,
    setMicError,
    toggleRecording,
    stopRecording,
  };
}
