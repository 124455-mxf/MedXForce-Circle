import { useCallback, useRef, useState } from 'react';
import {
  appendSpeechResults,
  getSpeechRecognitionConstructor,
  probeMicrophonePermission,
  stopSpeechRecognition,
} from '../lib/speechRecognitionUtils';
import { useSpeechRecognitionLifecycle } from './useSpeechRecognitionLifecycle';

export function useDictation() {
  const recognitionRef = useSpeechRecognitionLifecycle();
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const baseTextRef = useRef('');
  const committedRef = useRef('');

  const stopRecording = useCallback(() => {
    stopSpeechRecognition(recognitionRef);
    setIsRecording(false);
  }, [recognitionRef]);

  const toggleRecording = useCallback(
    async (getText: () => string, setText: (value: string) => void) => {
      setMicError(null);

      if (isRecording) {
        stopRecording();
        return;
      }

      const SpeechRecognition = getSpeechRecognitionConstructor();
      if (!SpeechRecognition) {
        setMicError('Speech recognition is not supported in this browser.');
        return;
      }

      const permitted = await probeMicrophonePermission();
      if (!permitted) {
        setMicError('Microphone access was denied. Allow the mic in your browser settings.');
        return;
      }

      baseTextRef.current = getText();
      committedRef.current = '';

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = (event) => {
        setIsRecording(false);
        if (event.error !== 'aborted') {
          setMicError('Could not capture speech. Try again.');
        }
      };
      recognition.onresult = (event) => {
        const { nextText, committedTranscript } = appendSpeechResults(
          event,
          baseTextRef.current,
          committedRef.current,
        );
        committedRef.current = committedTranscript;
        setText(nextText);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        setMicError('Could not start the microphone. Try again.');
        setIsRecording(false);
      }
    },
    [isRecording, recognitionRef, stopRecording],
  );

  return {
    isRecording,
    micError,
    setMicError,
    toggleRecording,
    stopRecording,
  };
}
